import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmail } from '@/lib/email/templates';
import { accountStatusMessage } from '@/lib/auth-block';

// Route Handler que recebe o "code" PKCE tanto do login com Google quanto do
// link de recuperação de senha (ver app/(auth)/recuperar-senha/actions.ts,
// que anexa ?type=recovery ao redirectTo) e troca por uma sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = safeRedirectPath(searchParams.get('next'), '/dashboard');

  if (!code) {
    logger.warn('auth', 'Callback de auth chamado sem code');
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.error('auth', 'Falha ao trocar code por sessão (OAuth/recovery)', { type, reason: error.message });
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error('auth', 'Sessão trocada com sucesso mas getUser() não retornou usuário');
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_done, blocked_at, blocked_reason')
    .eq('user_id', user.id)
    .maybeSingle();

  // ETAPA 15 (achado em revisão adversarial) — o branch de recuperação de
  // senha retornava ANTES desta checagem, então uma conta bloqueada
  // conseguia trocar a própria senha via /auth/redefinir mesmo suspensa
  // (exchangeCodeForSession já estabelece sessão válida de verdade aqui,
  // é um Route Handler — diferente do Server Component de
  // app/(app)/layout.tsx, aqui o signOut() realmente limpa o cookie).
  // Por isso a checagem de bloqueio vem ANTES do `if (type === 'recovery')`.
  // Falha de leitura (profileError) é tratada como "não dá pra confirmar
  // que está seguro" — mesmo critério de lib/auth-block.ts, fail-closed.
  if (profileError || profile?.blocked_at) {
    const status = profileError ? 'unknown' : 'blocked';
    logger.warn('auth', 'Login via callback negado', { userId: user.id, type, status });
    await supabase.auth.signOut();
    const message = encodeURIComponent(accountStatusMessage(status, profile?.blocked_reason ?? null));
    return NextResponse.redirect(`${origin}/login?error=blocked&message=${message}`);
  }

  // Veio do link de recuperação de senha — manda direto pro formulário de
  // nova senha, não faz sentido checar onboarding aqui.
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/redefinir`);
  }

  logger.info('auth', 'Login via callback (OAuth) bem-sucedido', { userId: user.id });

  if (!profile || !profile.onboarding_done) {
    // ETAPA 7 (ativação): cobre o cadastro por link de confirmação de
    // e-mail e o primeiro login via Google — o outro caminho (senha com
    // sessão instantânea) já manda o welcomeEmail em
    // app/(auth)/cadastro/actions.ts. Pode reenviar se o usuário voltar
    // sem terminar o onboarding — mais seguro que nunca mandar.
    if (user.email) {
      const name = String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email.split('@')[0]);
      await sendEmail(user.email, welcomeEmail(name));
    }
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
