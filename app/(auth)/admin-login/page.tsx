import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminLoginForm } from './admin-login-form';

export const metadata = {
  title: 'Acesso administrativo',
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <Card>
      <CardHeader>
        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Área restrita</span>
        </div>
        <CardTitle>Acesso administrativo</CardTitle>
        <CardDescription>Só para administradores do Radar Milhas & Viagens.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminLoginForm />
      </CardContent>
      <CardFooter className="justify-center text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:underline">
          Sou usuário — voltar para o login normal
        </Link>
      </CardFooter>
    </Card>
  );
}
