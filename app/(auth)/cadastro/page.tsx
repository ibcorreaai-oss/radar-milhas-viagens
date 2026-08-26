import type { Metadata } from 'next';
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

// ETAPA 19 (achado em auditoria de SEO pré-deploy) — sem isso, /login e
// /cadastro caíam no title default do layout raiz (idêntico ao da home),
// título duplicado entre páginas indexadas no sitemap.
export const metadata: Metadata = {
  title: 'Criar conta grátis',
  description:
    '5 dias de teste grátis no Radar Milhas & Viagens. Cadastre-se com e-mail e comece a receber alertas de voos e hotéis em dinheiro ou pontos.',
  alternates: { canonical: '/cadastro' },
  openGraph: {
    title: 'Criar conta grátis — Radar Milhas & Viagens',
    description:
      '5 dias de teste grátis no Radar Milhas & Viagens. Cadastre-se com e-mail e comece a receber alertas de voos e hotéis em dinheiro ou pontos.',
    url: '/cadastro',
  },
};

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
