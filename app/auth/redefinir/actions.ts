'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
    return { error: 'Sessão de recuperação expirada. Peça um novo link em "Esqueci minha senha".' };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: 'Não foi possível atualizar a senha. Tente novamente.' };
  }

  // Encerra a sessão de recuperação — força novo login já com a senha nova.
  await supabase.auth.signOut();
  redirect('/login');
}
