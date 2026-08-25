'use client';

import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ETAPA 15 (achado em revisão adversarial) — app/(app)/layout.tsx é um
// Server Component; chamar supabase.auth.signOut() por lá usa o client
// SERVIDOR (lib/supabase/server.ts), cujo adaptador de cookies engole em
// silêncio qualquer escrita fora de Server Action/Route Handler (try/catch
// escrito pra outro propósito, ver comentário lá) — a sessão nunca era
// derrubada de verdade, só a UI escondia o produto. O logout que já
// funciona no app inteiro (components/app-shell.tsx, handleSignOut) é
// client-side com o browser client — mesmo mecanismo aqui.
export function BlockedAccountScreen({ reason }: { reason: string | null }) {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Conta suspensa</h1>
        <p className="text-muted-foreground">
          Sua conta foi suspensa{reason ? `: ${reason}.` : '.'} Se acha que isso é um engano, entre
          em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
