'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export interface ResetState {
  error?: string;
  success?: string;
}

async function getOrigin() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  return `${proto}://${host}`;
}

export async function requestPasswordReset(
  _prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get('email') || '').trim();

  if (!email) {
    return { error: 'Informe seu e-mail.' };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  // ?type=recovery marca o link para o /auth/callback saber que deve
  // mandar o usuário para /auth/redefinir em vez de /dashboard.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/redefinir?type=recovery`,
  });

  // Log server-side só — a resposta ao usuário nunca revela se o e-mail
  // existe na base (proteção contra enumeração de contas).
  if (error) {
    logger.warn('auth', 'Falha ao solicitar recuperação de senha', { email, reason: error.message });
  } else {
    logger.info('auth', 'Recuperação de senha solicitada', { email });
  }

  // Sempre responde com sucesso — nunca revela se o e-mail existe na base.
  return {
    success:
      'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
  };
}
