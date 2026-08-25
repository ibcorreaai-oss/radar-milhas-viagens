'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInAsAdmin, type AdminLoginState } from './actions';

const initialState: AdminLoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Entrando...' : 'Entrar como administrador'}
    </Button>
  );
}

export function AdminLoginForm() {
  const [state, formAction] = useActionState(signInAsAdmin, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="admin-email">E-mail</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          placeholder="admin@radarmilhas.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="admin-password">Senha</Label>
          <Link href="/recuperar-senha" className="text-xs text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="admin-password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
