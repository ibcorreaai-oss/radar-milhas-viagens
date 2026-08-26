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
import { LoginForm } from './login-form';

// ETAPA 19 (achado em auditoria de SEO pré-deploy) — ver mesmo comentário
// em app/(auth)/cadastro/page.tsx.
export const metadata: Metadata = {
  title: 'Entrar',
  description: 'Entre no Radar Milhas & Viagens com código por e-mail ou senha.',
  alternates: { canonical: '/login' },
  openGraph: {
    title: 'Entrar — Radar Milhas & Viagens',
    description: 'Entre no Radar Milhas & Viagens com código por e-mail ou senha.',
    url: '/login',
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const { next, error, message } = await searchParams;

  // ETAPA 15 — app/auth/callback/route.ts redireciona pra cá com
  // ?error=blocked&message=... quando o login via Google é de uma conta
  // suspensa (ver lib/auth-block.ts). `error=auth` (falha de troca de code,
  // já existia antes desta etapa) cai no fallback genérico.
  //
  // ETAPA 15.1 (achado revisando antes do fim da etapa): `message` já vem
  // decodificado pelo Next.js (searchParams entrega valores decodificados
  // de propósito) — chamar decodeURIComponent() de novo aqui é um
  // double-decode. Se `blocked_reason` (definido livremente por um admin
  // em /admin/usuarios) tiver um "%" sozinho (ex.: "atrasou 30% dos
  // pagamentos"), decodeURIComponent quebra com URIError — a página
  // /login inteira cairia em 500 pra essa pessoa específica.
  const errorMessage = error
    ? message || 'Não foi possível concluir o login. Tente novamente.'
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse sua conta para ver seus alertas e oportunidades de viagem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}
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
