'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormError } from '@/components/form-error';
import { sendContactMessage, type ContactState } from './actions';

const initialState: ContactState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? 'Enviando...' : 'Enviar mensagem'}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessage, initialState);

  if (state.success) {
    return (
      <p className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />

      {/* Honeypot anti-spam: invisível para humano, bots costumam preencher todo campo. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">Assunto</Label>
        <Input id="subject" name="subject" type="text" placeholder="Sobre o que você quer falar?" required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Mensagem</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Conte com detalhes o que você precisa..."
          rows={6}
          required
        />
      </div>

      <SubmitButton />
    </form>
  );
}
