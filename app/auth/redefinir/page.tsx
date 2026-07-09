import Link from 'next/link';
import { Plane } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RedefinirForm } from './redefinir-form';

// Fora do grupo (auth) de propósito: /auth/redefinir é acessado a partir do
// link de e-mail de recuperação (via /auth/callback), não do fluxo normal
// de login/cadastro. Replica visualmente o mesmo layout centralizado.
export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Plane className="h-5 w-5 text-primary" />
        Radar Milhas & Viagens
      </Link>
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Criar nova senha</CardTitle>
            <CardDescription>Escolha uma nova senha para a sua conta.</CardDescription>
          </CardHeader>
          <CardContent>
            <RedefinirForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
