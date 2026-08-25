'use client';

import { useState, useTransition } from 'react';
import { useToast } from '@/components/toast-provider';

// ETAPA 14 (achado em revisão adversarial) — components/favorite-button.tsx
// e app/(app)/admin/funcionalidades/feature-flag-row.tsx tinham o mesmo
// padrão copiado (estado otimista, desfaz em erro, toast) duas vezes.
// Extraído aqui pra qualquer terceiro toggle otimista (ex.: bucket-list)
// reusar em vez de copiar de novo.
export function useOptimisticToggle<T extends boolean>(
  initial: T,
  action: (next: T) => Promise<{ error?: string }>
) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { show } = useToast();

  function toggle(next: T, successTitle?: string) {
    setValue(next);
    startTransition(async () => {
      const { error } = await action(next);
      if (error) {
        setValue(((!next) as T)); // desfaz o otimismo
        show({ variant: 'error', title: 'Não foi possível salvar', description: error });
        return;
      }
      if (successTitle) {
        show({ variant: 'success', title: successTitle });
      }
    });
  }

  return { value, pending, toggle };
}
