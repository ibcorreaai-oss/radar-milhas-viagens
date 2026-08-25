'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';

// Campo de código de 6 dígitos usado em app/(auth)/cadastro/cadastro-form.tsx
// e app/(auth)/login/login-form.tsx. Sanitiza ao digitar/colar (remove tudo
// que não é dígito, corta em 6) ANTES do maxLength cortar a string errada —
// sem isso, colar "123 456" (com espaço, comum em clientes de e-mail que
// quebram o código ao exibir) virava "123 45" truncado pelo maxLength puro,
// achado numa revisão adversarial junto com o mesmo saneamento em
// lib/validation/auth-schemas.ts (defesa em profundidade: cliente + servidor).
export function OtpCodeInput({ id }: { id: string }) {
  const [value, setValue] = useState('');

  return (
    <Input
      id={id}
      name="code"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="000000"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
      required
      autoFocus
    />
  );
}
