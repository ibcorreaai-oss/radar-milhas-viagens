'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// "Carregamento inteligente" (ETAPA 13 — NeuroUX): em vez de um spinner
// mudo, mostra mensagens que contam o que está de fato acontecendo —
// usado em app/(app)/voos/loading.tsx e app/(app)/hoteis/loading.tsx, o
// Suspense fallback do Next enquanto a Server Action de busca roda
// (comparação dinheiro vs pontos + cálculo de score do OpportunityEngine,
// que é o único trecho do produto com espera perceptível). Client
// component porque precisa de um timer — loading.tsx em si continua
// Server Component-compatible por só renderizar isto.
export function SmartLoading({ messages, className }: { messages: string[]; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-10 text-center', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {messages[index]}
      </p>
    </div>
  );
}
