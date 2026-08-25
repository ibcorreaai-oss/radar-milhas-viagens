'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpCodeInput } from '@/components/otp-code-input';
import { handleSignupStep, type SignUpState } from './actions';

const initialState: SignUpState = { step: 'request' };

function SubmitButton({
  intent,
  label,
  pendingLabel,
  variant = 'default',
}: {
  intent: string;
  label: string;
  pendingLabel: string;
  variant?: 'default' | 'ghost';
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant={variant}
      className={variant === 'default' ? 'w-full' : 'w-full text-xs text-muted-foreground'}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function CadastroForm({ referredByCode }: { referredByCode?: string }) {
  const [state, formAction] = useActionState(handleSignupStep, initialState);

  if (state.step === 'verify') {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="name" value={state.name ?? ''} />
        <input type="hidden" name="email" value={state.email ?? ''} />
        {(state.referredByCode ?? referredByCode) && (
          <input type="hidden" name="referred_by_code" value={state.referredByCode ?? referredByCode} />
        )}

        {state.info && (
          <p className="rounded-md bg-secondary/10 px-3 py-2 text-sm text-secondary-foreground">
            {state.info}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="code">Código de 6 dígitos</Label>
          <OtpCodeInput id="code" />
        </div>

        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton intent="verify" label="Confirmar código" pendingLabel="Confirmando..." />
        <SubmitButton
          intent="resend"
          label="Não recebeu? Reenviar código"
          pendingLabel="Reenviando..."
          variant="ghost"
        />
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {referredByCode && <input type="hidden" name="referred_by_code" value={referredByCode} />}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Seu nome"
          autoComplete="name"
          defaultValue={state.name ?? ''}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          defaultValue={state.email ?? ''}
          required
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton intent="request" label="Enviar código de confirmação" pendingLabel="Enviando..." />

      <p className="text-center text-xs text-muted-foreground">
        Sem senha — enviamos um código de 6 dígitos para o seu e-mail. Ao continuar, você
        concorda com os{' '}
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
