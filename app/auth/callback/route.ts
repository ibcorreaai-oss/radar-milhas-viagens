import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { logger } from '@/lib/logger';

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

  // Veio do link de recuperação de senha — manda direto pro formulário de
  // nova senha, não faz sentido checar onboarding aqui.
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/redefinir`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error('auth', 'Sessão trocada com sucesso mas getUser() não retornou usuário');
    return NextResponse.redirect(`${origin}/login`);
  }

  logger.info('auth', 'Login via callback (OAuth/recovery) bem-sucedido', { userId: user.id });

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarding_done) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
