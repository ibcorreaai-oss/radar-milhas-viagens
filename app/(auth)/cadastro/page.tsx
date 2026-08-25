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

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // ETAPA 15.1 (ver GROWTH.md) — programa de indicação: quem chega por
  // /cadastro?ref=CODIGO tem a indicação resolvida no próprio trigger
  // handle_new_user (supabase/migrations/0013), não aqui — este componente
  // só repassa o código adiante.
  const { ref } = await searchParams;

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
        <CadastroForm referredByCode={ref} />
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
