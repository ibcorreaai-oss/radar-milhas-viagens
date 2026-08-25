'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { adminLoginSchema, firstZodError } from '@/lib/validation/auth-schemas';
import { isAdminRole, isBlocked } from '@/lib/roles';
import { logAuditEvent } from '@/lib/audit-log';

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
    .select('role, blocked_at')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (!profile || !isAdminRole(profile)) {
    logger.warn('auth', 'Login de admin negado — conta sem role admin', { userId: data.user.id, email });
    await supabase.auth.signOut();
    return { error: 'Esta conta não tem acesso de administrador.' };
  }

  if (isBlocked(profile)) {
    logger.warn('auth', 'Login de admin negado — conta bloqueada', { userId: data.user.id, email });
    await supabase.auth.signOut();
    return { error: 'Esta conta de administrador foi suspensa.' };
  }

  logger.info('auth', 'Login de admin bem-sucedido', { userId: data.user.id, email });

  // ETAPA 15.1 (ver GROWTH.md) — entrada na área administrativa é o
  // exemplo que o próprio PLATFORM_ADMIN.md já citava (ADMIN_LOGIN) e não
  // estava implementado; agora fica no histórico de /admin/auditoria.
  await logAuditEvent({ userId: data.user.id, action: 'admin_login', entity: 'profiles', entityId: data.user.id });

  redirect('/admin');
}
