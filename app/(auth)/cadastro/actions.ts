'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface SignUpState {
  error?: string;
  success?: string;
}

async function getOrigin() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host');
  return `${proto}://${host}`;
}

export async function signUp(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');

  if (!name || !email || !password) {
    return { error: 'Preencha todos os campos.' };
  }
  if (password.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres.' };
  }
  if (password !== confirm) {
    return { error: 'As senhas não coincidem.' };
  }

  const supabase = await createClient();
  const origin = await getOrigin();

  // O trigger handle_new_user (supabase/migrations/0001_schema.sql) cria
  // profile + subscription free automaticamente ao inserir em auth.users.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('já')) {
      return { error: 'Este e-mail já está cadastrado. Faça login.' };
    }
    return { error: 'Não foi possível criar sua conta. Tente novamente.' };
  }

  // Se a confirmação de e-mail estiver ativada no projeto Supabase, não
  // existe sessão ainda — o usuário precisa clicar no link recebido.
  if (!data.session) {
    return {
      success:
        'Quase lá! Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta.',
    };
  }

  redirect('/onboarding');
}
