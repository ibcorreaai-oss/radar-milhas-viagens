'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { passwordSchema } from '@/lib/validation/auth-schemas';
import { checkAccountStatus, accountStatusMessage } from '@/lib/auth-block';

export interface RedefinirState {
  error?: string;
}

export async function updatePassword(
  _prevState: RedefinirState,
  formData: FormData
): Promise<RedefinirState> {
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');

  // Mesmo passwordSchema de app/(app)/perfil/actions.ts (ETAPA 14) — antes
  // esta tela só checava `length < 8`, sem o teto de 72 (limite real do
  // bcrypt no GoTrue), então uma senha muito longa passava aqui e falhava
  // só lá dentro do Supabase, com as duas telas de senha da conta aplicando
  // regras diferentes pro mesmo usuário.
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Senha inválida.' };
  }
  if (password !== confirm) {
    return { error: 'As senhas não coincidem.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('auth', 'Redefinição de senha sem sessão de recuperação válida');
    return { error: 'Sessão de recuperação expirada. Peça um novo link em "Esqueci minha senha".' };
  }

  // ETAPA 15 (defesa em profundidade — a barreira principal é
  // app/auth/callback/route.ts, que já barra o link de recuperação de
  // conta bloqueada antes de chegar aqui) — nunca confiar que "só chega
  // aqui quem tem permissão" sem checar de novo na própria Server Action.
  const { status, reason } = await checkAccountStatus(supabase, user.id);
  if (status !== 'active') {
    logger.warn('auth', 'Redefinição de senha negada', { userId: user.id, status });
    await supabase.auth.signOut();
    return { error: accountStatusMessage(status, reason) };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    logger.error('auth', 'Falha ao redefinir senha', { userId: user.id, reason: error.message });
    return { error: 'Não foi possível atualizar a senha. Tente novamente.' };
  }

  logger.info('auth', 'Senha redefinida com sucesso', { userId: user.id });

  // Encerra a sessão de recuperação — força novo login já com a senha nova.
  await supabase.auth.signOut();
  redirect('/login');
}
