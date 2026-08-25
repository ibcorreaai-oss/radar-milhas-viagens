'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { logger } from '@/lib/logger';

export interface LoginState {
  error?: string;
}

export async function signInWithPassword(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = safeRedirectPath(String(formData.get('next') || ''), '/dashboard');

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Nunca logar email + motivo detalhado juntos com nível alto — é só uma
    // senha errada na esmagadora maioria dos casos. Serve pra detectar
    // padrão de força bruta (muitas falhas pro mesmo e-mail em pouco tempo)
    // sem virar ruído nem vazar dado sensível no log.
    logger.warn('auth', 'Falha de login', { email, reason: error.message });
    return { error: 'E-mail ou senha incorretos.' };
  }

  logger.info('auth', 'Login bem-sucedido', { userId: data.user?.id, email });
  redirect(next);
}
