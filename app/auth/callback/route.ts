import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Route Handler que recebe o "code" PKCE tanto do login com Google quanto do
// link de recuperação de senha (ver app/(auth)/recuperar-senha/actions.ts,
// que anexa ?type=recovery ao redirectTo) e troca por uma sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
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
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarding_done) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
