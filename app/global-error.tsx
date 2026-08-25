'use client';

import { useEffect } from 'react';

// Último recurso: só dispara se o próprio app/layout.tsx (root layout)
// lançar um erro — error.tsx não cobre esse caso porque ele é irmão do
// layout, não um wrapper dele. Precisa renderizar <html>/<body> própria
// porque substitui o root layout inteiro enquanto está ativo. Ver
// OBSERVABILITY.md §Erros.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch('/api/log-client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>O Radar Milhas &amp; Viagens teve um problema</h1>
          <p style={{ maxWidth: 380, color: '#6b7280', fontSize: 14 }}>
            Já registramos o problema por aqui. Recarregue a página em instantes.
          </p>
          <button
            onClick={reset}
            style={{ padding: '8px 20px', borderRadius: 6, background: '#0f766e', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
