'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { logger } from '@/lib/logger';
import { emailSchema, otpCodeSchema } from '@/lib/validation/auth-schemas';

export interface LoginState {
  error?: string;
}

// Mantido para quem definiu senha em /perfil (ver AUTH_AND_ADMIN.md §1) e
// para o login de administrador (app/(auth)/admin-login/actions.ts).
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

  logger.info('auth', 'Login bem-sucedido (senha)', { userId: data.user?.id, email });
  redirect(next);
}

// ETAPA 14 (ver AUTH_AND_ADMIN.md §1) — login sem senha, mesmo padrão de
// 2 passos + "intent" de app/(auth)/cadastro/actions.ts.
export interface LoginOtpState {
  step: 'request' | 'verify';
  email?: string;
  error?: string;
  info?: string;
}

export async function handleLoginOtpStep(
  prevState: LoginOtpState,
  formData: FormData
): Promise<LoginOtpState> {
  const intent = String(formData.get('intent') ?? 'request');
  const next = safeRedirectPath(String(formData.get('next') || ''), '/dashboard');

  if (intent === 'verify') {
    const emailResult = emailSchema.safeParse(formData.get('email'));
    if (!emailResult.success) {
      return { step: 'request', error: 'Sessão de login expirada. Comece de novo.' };
    }
    const email = emailResult.data;

    const codeResult = otpCodeSchema.safeParse(formData.get('code'));
    if (!codeResult.success) {
      return { step: 'verify', email, error: codeResult.error.issues[0]?.message ?? 'Código inválido.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: codeResult.data,
      type: 'email',
    });

    if (error) {
      logger.warn('auth', 'Falha ao verificar código de login', { email, reason: error.message });
      return {
        step: 'verify',
        email,
        error: 'Código inválido ou expirado. Confira e tente de novo, ou peça um novo código.',
      };
    }

    logger.info('auth', 'Login bem-sucedido (OTP)', { userId: data.user?.id, email });
    redirect(next);
  }

  // intent === 'request' ou 'resend'
  const emailResult = emailSchema.safeParse(formData.get('email'));
  if (!emailResult.success) {
    return { step: 'request', error: emailResult.error.issues[0]?.message ?? 'E-mail inválido.' };
  }
  const email = emailResult.data;

  const supabase = await createClient();
  // shouldCreateUser: false — /login nunca cria conta nova (isso é trabalho
  // de /cadastro). IMPORTANTE (achado numa revisão adversarial desta mesma
  // etapa): quando o e-mail não existe, o Supabase recusa com "signups not
  // allowed" — NUNCA transformar isso numa mensagem diferente da de sucesso
  // ("não encontramos uma conta..."), senão qualquer um descobre quais
  // e-mails estão cadastrados só testando aqui (enumeração de conta). A
  // mesma preocupação que já existia em signInWithPassword (mensagem
  // genérica "e-mail ou senha incorretos") vale aqui.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    const accountDoesNotExist = msg.includes('signups not allowed') || msg.includes('not found');

    if (!accountDoesNotExist) {
      logger.warn('auth', 'Falha ao enviar código de login', { email, reason: error.message });
      return {
        step: 'request',
        email,
        error: 'Não foi possível enviar o código agora. Tente novamente em alguns instantes.',
      };
    }

    // Não revela que a conta não existe — cai no mesmo retorno de sucesso
    // abaixo, com a mesma mensagem genérica.
    logger.info('auth', 'Código de login pedido para e-mail sem conta (não revelado ao cliente)', { email });
  } else {
    logger.info('auth', 'Código de login enviado', { email });
  }

  return {
    step: 'verify',
    email,
    info:
      intent === 'resend'
        ? `Se existir uma conta para ${email}, enviamos um novo código.`
        : `Se existir uma conta para ${email}, enviamos um código de 6 dígitos. Confira sua caixa de entrada (e o spam).`,
  };
}
