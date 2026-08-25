'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmail } from '@/lib/email/templates';
import { emailSchema, nameSchema, otpCodeSchema } from '@/lib/validation/auth-schemas';
import { accountStatusMessage } from '@/lib/auth-block';

// ETAPA 14 (ver AUTH_AND_ADMIN.md §1) — cadastro só por OTP, sem senha.
// Uma única Server Action cuida dos 3 sub-passos (pedir código, reenviar,
// verificar), diferenciados pelo campo oculto/botão "intent" — assim o
// formulário inteiro roda em cima de um único useActionState no client,
// com um `state` contínuo entre os passos (duas Server Actions separadas
// exigiriam dois useActionState com estado independente, perdendo o nome/
// e-mail ao trocar de passo).
export interface SignUpState {
  step: 'request' | 'verify';
  name?: string;
  email?: string;
  error?: string;
  info?: string;
  referredByCode?: string;
}

async function sendSignupCode(email: string, name: string, referredByCode?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // ETAPA 15.1 (ver GROWTH.md) — raw_user_meta_data é lido pelo trigger
    // handle_new_user (supabase/migrations/0013) pra resolver
    // referred_by_user_id. Só afeta conta REALMENTE nova — se o e-mail já
    // existe, o Supabase ignora `data` num signInWithOtp de login.
    options: { shouldCreateUser: true, data: { name, referred_by_code: referredByCode } },
  });

  if (error) {
    logger.error('auth', 'Falha ao enviar código de cadastro', { email, reason: error.message });
    return { error: 'Não foi possível enviar o código agora. Tente novamente em alguns instantes.' };
  }

  logger.info('auth', 'Código de cadastro enviado', { email });
  return {};
}

export async function handleSignupStep(
  prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const intent = String(formData.get('intent') ?? 'request');

  if (intent === 'verify') {
    const name = String(formData.get('name') ?? '').trim();
    const emailResult = emailSchema.safeParse(formData.get('email'));
    if (!emailResult.success) {
      return { step: 'request', error: 'Sessão de cadastro expirada. Comece de novo.' };
    }
    const email = emailResult.data;

    const codeResult = otpCodeSchema.safeParse(formData.get('code'));
    if (!codeResult.success) {
      return {
        step: 'verify',
        name,
        email,
        error: codeResult.error.issues[0]?.message ?? 'Código inválido.',
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: codeResult.data,
      type: 'email',
    });

    if (error) {
      logger.warn('auth', 'Falha ao verificar código de cadastro', { email, reason: error.message });
      return {
        step: 'verify',
        name,
        email,
        error: 'Código inválido ou expirado. Confira e tente de novo, ou peça um novo código.',
      };
    }

    const user = data.user;
    if (!user) {
      return { step: 'verify', name, email, error: 'Não foi possível confirmar sua conta. Tente novamente.' };
    }

    logger.info('auth', 'Cadastro confirmado via OTP', { userId: user.id, email });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_done, blocked_at, blocked_reason')
      .eq('user_id', user.id)
      .maybeSingle();

    // ETAPA 15 — alguém com conta suspensa que digita o próprio e-mail em
    // /cadastro (achando que precisa "criar de novo") não deve conseguir
    // uma sessão nova por essa porta lateral. Checa ANTES do erro de
    // leitura genérico abaixo — bloqueado é um caso mais específico e
    // precisa da mensagem certa, não do fallback genérico de "dashboard".
    if (profile?.blocked_at) {
      logger.warn('auth', 'Cadastro/login via OTP negado — conta bloqueada', { userId: user.id, email });
      await supabase.auth.signOut();
      // `name` incluído de propósito (achado revisando antes do fim da
      // etapa): sem ele, um "reenviar código" depois desta tela falharia
      // a validação de nome em vez de simplesmente reenviar.
      return { step: 'verify', name, email, error: accountStatusMessage('blocked', profile.blocked_reason) };
    }

    if (profileError) {
      // Achado em revisão adversarial: erro transiente aqui não pode ser
      // tratado como "conta nova" (mandaria e-mail de boas-vindas e
      // devolveria pro onboarding um usuário antigo de verdade). Sem saber
      // o estado real, o destino mais seguro é o dashboard — pior caso é
      // essa pessoa ter que reabrir o onboarding manualmente depois, não
      // ficar presa nem levar e-mail duplicado.
      logger.error('auth', 'Falha ao ler profile após confirmar OTP de cadastro', {
        userId: user.id,
        reason: profileError.message,
      });
      redirect('/dashboard');
    }

    // "Conta nova de verdade" não pode depender só de onboarding_done=false
    // — um usuário já existente que digita o e-mail em /cadastro por engano
    // também bateria nessa condição a cada tentativa, reenviando boas-vindas
    // toda vez (achado em revisão adversarial). auth.users.created_at é
    // fixado na criação e nunca muda; se foi há poucos minutos, é sinal
    // confiável de que o handle_new_user trigger acabou de rodar agora.
    const createdRecently = Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000;

    if (!profile || !profile.onboarding_done) {
      if (createdRecently) {
        await sendEmail(email, welcomeEmail(name || email.split('@')[0]));
      }
      redirect('/onboarding');
    }

    redirect('/dashboard');
  }

  // intent === 'request' (primeiro pedido) ou 'resend' (reenvio) — mesma
  // operação, só muda a mensagem de retorno.
  const nameResult = nameSchema.safeParse(formData.get('name'));
  const emailResult = emailSchema.safeParse(formData.get('email'));

  if (!nameResult.success) {
    return { step: 'request', error: nameResult.error.issues[0]?.message ?? 'Nome inválido.' };
  }
  if (!emailResult.success) {
    return {
      step: 'request',
      name: nameResult.data,
      error: emailResult.error.issues[0]?.message ?? 'E-mail inválido.',
    };
  }

  const name = nameResult.data;
  const email = emailResult.data;
  const referredByCode = String(formData.get('referred_by_code') ?? '').trim() || undefined;
  const { error } = await sendSignupCode(email, name, referredByCode);

  if (error) {
    return { step: intent === 'resend' ? 'verify' : 'request', name, email, referredByCode, error };
  }

  return {
    step: 'verify',
    name,
    email,
    referredByCode,
    info:
      intent === 'resend'
        ? `Enviamos um novo código para ${email}.`
        : `Enviamos um código de 6 dígitos para ${email}. Confira sua caixa de entrada (e o spam).`,
  };
}
