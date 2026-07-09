import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CadastroForm } from './cadastro-form';

export default function CadastroPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta grátis</CardTitle>
        <CardDescription>
          Entre para o clube e comece a receber alertas de viagem com IA — em dinheiro ou em
          pontos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CadastroForm />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 text-center text-sm text-muted-foreground">
        <span>
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
