'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp, type SignUpState } from './actions';

const initialState: SignUpState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Criando conta...' : 'Criar conta grátis'}
    </Button>
  );
}

export function CadastroForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  if (state.success) {
    return (
      <p className="rounded-md bg-secondary/10 px-3 py-3 text-sm text-secondary-foreground">
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" type="text" placeholder="Seu nome" autoComplete="name" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Ao criar a conta, você concorda com os{' '}
        <a href="/termos" className="underline hover:text-foreground">
          Termos de Uso
        </a>{' '}
        e a{' '}
        <a href="/privacidade" className="underline hover:text-foreground">
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  );
}
