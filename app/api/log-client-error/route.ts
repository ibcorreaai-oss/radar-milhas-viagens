import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Recebe erros não tratados capturados pelos error boundaries do client
// (app/error.tsx, app/global-error.tsx) e registra no logger estruturado do
// servidor — um Client Component não tem acesso ao Resend/console do
// servidor diretamente. Rota pública de propósito (o boundary dispara antes
// de qualquer coisa que dependa de sessão), então usa logger.error() e NÃO
// logger.critical(): um endpoint público que qualquer um pode martelar não
// pode ser o gatilho de e-mail de alerta crítico (vetor de abuso/spam).
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string; digest?: string; stack?: string; url?: string };

    logger.error('system', 'Erro não tratado capturado no client (error boundary)', {
      message: typeof body.message === 'string' ? body.message.slice(0, 500) : undefined,
      digest: typeof body.digest === 'string' ? body.digest.slice(0, 200) : undefined,
      url: typeof body.url === 'string' ? body.url.slice(0, 300) : undefined,
    });
  } catch {
    // Corpo inválido — não vale a pena logar isso como erro, só ignora.
  }

  return NextResponse.json({ received: true });
}
