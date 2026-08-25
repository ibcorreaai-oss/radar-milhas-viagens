import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRole, isBlocked } from '@/lib/roles';

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

// `pathname.startsWith(prefix)` sozinho combina de mais: "/admin-login".
// startsWith("/admin") é true, então a rota pública de login de admin caía
// dentro do prefixo protegido "/admin" (bug real achado testando ao vivo
// nesta etapa). Exige que o próximo caractere seja "/" ou fim de string.
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Rede de segurança PKCE: link de e-mail do Supabase que caiu fora do
  // callback — redireciona para /auth/callback.
  if (searchParams.has('code') && !pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/callback';
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/stripe|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
