'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Error boundary do App Router — captura qualquer erro não tratado na
// renderização de uma página (server ou client component) e mostra isto em
// vez de tela branca. Reporta pro servidor via /api/log-client-error porque
// um Client Component não tem acesso ao logger do servidor diretamente (ver
// OBSERVABILITY.md §Erros).
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {
      // Se nem o report funcionar, não há mais nada a fazer no client.
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <TriangleAlert className="h-10 w-10 text-destructive" />
      <div>
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Já registramos o problema por aqui. Tente de novo — se continuar acontecendo, volte mais
          tarde.
        </p>
      </div>
      <Button onClick={reset}>Tentar de novo</Button>
    </div>
  );
}
