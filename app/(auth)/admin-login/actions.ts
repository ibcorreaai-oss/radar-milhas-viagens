'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { adminLoginSchema, firstZodError } from '@/lib/validation/auth-schemas';

// ETAPA 14 (ver AUTH_AND_ADMIN.md §3) — login de administrador é sempre por
// e-mail+senha (nunca OTP, nunca cria conta). Checa profiles.role='admin'
// DEPOIS de autenticar; se não for admin, desloga na hora — evita que
// qualquer usuário comum entre por aqui e caia confuso em qualquer lugar.
export interface AdminLoginState {
  error?: string;
}

export async function signInAsAdmin(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const result = adminLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!result.success) {
    return { error: firstZodError(result) };
  }

  const { email, password } = result.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn('auth', 'Falha de login de admin', { email, reason: error.message });
    return { error: 'E-mail ou senha incorretos.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    logger.warn('auth', 'Login de admin negado — conta sem role admin', { userId: data.user.id, email });
    await supabase.auth.signOut();
    return { error: 'Esta conta não tem acesso de administrador.' };
  }

  logger.info('auth', 'Login de admin bem-sucedido', { userId: data.user.id, email });
  redirect('/admin');
}
