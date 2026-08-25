'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface RedefinirState {
  error?: string;
}

export async function updatePassword(
  _prevState: RedefinirState,
  formData: FormData
): Promise<RedefinirState> {
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');

  if (password.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres.' };
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
