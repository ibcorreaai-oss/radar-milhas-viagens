'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OtpCodeInput } from '@/components/otp-code-input';
import { createClient } from '@/lib/supabase/client';
import { signInWithPassword, handleLoginOtpStep, type LoginState, type LoginOtpState } from './actions';

const initialPasswordState: LoginState = {};
const initialOtpState: LoginOtpState = { step: 'request' };

function SubmitButton({
  label,
  pendingLabel,
  intent,
  variant = 'default',
}: {
  label: string;
  pendingLabel: string;
  intent?: string;
  variant?: 'default' | 'ghost';
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name={intent ? 'intent' : undefined}
      value={intent}
      variant={variant}
      className={variant === 'default' ? 'w-full' : 'w-full text-xs text-muted-foreground'}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

// ETAPA 14 (ver AUTH_AND_ADMIN.md §1): OTP é o método padrão pra usuário
// comum; senha continua disponível pra quem definiu uma em /perfil — sem
// remover o que já funcionava.
export function LoginForm({ next }: { next?: string }) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="otp">
        <TabsList className="w-full">
          <TabsTrigger value="otp" className="flex-1">
            Código por e-mail
          </TabsTrigger>
          <TabsTrigger value="senha" className="flex-1">
            Senha
          </TabsTrigger>
        </TabsList>

        <TabsContent value="otp">
          <OtpLoginForm next={next} />
        </TabsContent>

        <TabsContent value="senha">
          <PasswordLoginForm next={next} />
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <GoogleSignInButton next={next} />
    </div>
  );
}

function OtpLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(handleLoginOtpStep, initialOtpState);

  if (state.step === 'verify') {
    return (
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={state.email ?? ''} />
        <input type="hidden" name="next" value={next ?? ''} />

        {state.info && (
          <p className="rounded-md bg-secondary/10 px-3 py-2 text-sm text-secondary-foreground">
            {state.info}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="login-code">Código de 6 dígitos</Label>
          <OtpCodeInput id="login-code" />
        </div>

        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton intent="verify" label="Entrar" pendingLabel="Entrando..." />
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
      <input type="hidden" name="next" value={next ?? ''} />
      <div className="space-y-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
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

      <SubmitButton intent="request" label="Enviar código" pendingLabel="Enviando..." />
    </form>
  );
}

function PasswordLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInWithPassword, initialPasswordState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />

      <div className="space-y-1.5">
        <Label htmlFor="password-email">E-mail</Label>
        <Input
          id="password-email"
          name="email"
          type="email"
          placeholder="voce@email.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/recuperar-senha" className="text-xs text-primary hover:underline">
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="password"
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

      <SubmitButton label="Entrar" pendingLabel="Entrando..." />
    </form>
  );
}

function GoogleSignInButton({ next }: { next?: string }) {
  async function handleGoogleSignIn() {
    const supabase = createClient();
    const callbackUrl = new URL('/auth/callback', window.location.origin);
    if (next) callbackUrl.searchParams.set('next', next);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn}>
      Entrar com Google
    </Button>
  );
}
