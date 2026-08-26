import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRole, isBlocked } from '@/lib/roles';
import { hasActiveAccess, matchesPathPrefix, SUBSCRIPTION_EXEMPT_PREFIXES } from '@/lib/subscription-access';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/bucket-list',
  '/voos',
  '/hoteis',
  '/alertas',
  '/consultor-ia',
  '/perfil',
  '/assinatura',
  '/onboarding',
  '/favoritos',
  '/afiliados',
  '/treinamentos',
  '/admin',
];

const ADMIN_PREFIXES = ['/admin'];

// matchesPathPrefix/SUBSCRIPTION_EXEMPT_PREFIXES vêm de lib/subscription-access.ts
// (compartilhado com app/(app)/layout.tsx — ver ETAPA 19). Alias local
// curto só por brevidade nas ~10 chamadas abaixo.
const matchesPrefix = matchesPathPrefix;

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Rede de segurança PKCE: link de e-mail do Supabase que caiu fora do
  // callback — redireciona para /auth/callback.
  if (searchParams.has('code') && !pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  // ETAPA 19 (auditoria de segurança pré-deploy) — pathname propagado pro
  // Server Component de app/(app)/layout.tsx via header de REQUEST (não de
  // response — headers() do RSC lê o que chega na renderização, não o que
  // volta pro browser). Precisa estar em `requestHeaders` desde já porque
  // `NextResponse.next({ request })` é chamado de novo dentro de `setAll`
  // abaixo (o SDK do Supabase reconstrói a response ao atualizar cookies).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Antes do Supabase real ser configurado (checklist do README ainda não
  // rodada), não trava o app inteiro com 500 — deixa passar sem sessão.
  // Rotas protegidas simplesmente não terão `user`, então nada sensível
  // fica exposto; é só um fallback pra permitir ver a landing/preview.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((p) => matchesPrefix(pathname, p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/cadastro' || pathname === '/admin-login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const isAdminRoute = ADMIN_PREFIXES.some((p) => matchesPrefix(pathname, p));
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, blocked_at')
      .eq('user_id', user.id)
      .single();

    // ETAPA 15 — super_admin herda tudo que admin já podia (nenhuma rota
    // /admin precisa saber a diferença); ver is_admin() no banco, mesmo
    // critério espelhado aqui (lib/roles.ts). Conta bloqueada nunca entra
    // em /admin, mesmo que o role ainda seja admin/super_admin.
    if (!profile || !isAdminRole(profile) || isBlocked(profile)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // ETAPA 16 (ver MONETIZATION.md) -- teste de 5 dias/assinatura paga
  // exigidos pras rotas protegidas "de produto" (nao pra /assinatura,
  // /perfil, /onboarding nem pras rotas /admin, ja tratadas acima). Admin
  // sempre passa direto, independente de assinatura (regra explicita do
  // Igor). Conta bloqueada nao entra aqui de proposito -- o layout.tsx do
  // grupo (app) ja derruba TODA a sessao dela com BlockedAccountScreen,
  // nao precisa (nem deve) competir com esse redirect.
  const needsSubscriptionGate =
    isProtected &&
    !isAdminRoute &&
    user &&
    !SUBSCRIPTION_EXEMPT_PREFIXES.some((p) => matchesPrefix(pathname, p));

  if (needsSubscriptionGate) {
    const [{ data: profile }, { data: subscription }] = await Promise.all([
      supabase.from('profiles').select('role, blocked_at').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('subscriptions')
        .select('status, trial_ends_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!isAdminRole(profile) && !isBlocked(profile) && !hasActiveAccess(subscription)) {
      const url = request.nextUrl.clone();
      url.pathname = '/assinatura';
      url.search = '';
      url.searchParams.set('trial_expirado', '1');
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/stripe|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
