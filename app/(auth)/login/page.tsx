import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse sua conta para ver seus alertas e oportunidades de viagem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={next} />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 text-center text-sm text-muted-foreground">
        <span>
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Criar conta grátis
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
