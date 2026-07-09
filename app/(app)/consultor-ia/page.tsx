import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { EmptyState } from '@/components/empty-state';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ConsultorChat } from './consultor-chat';

const ELIGIBLE_PLANS = ['pro', 'consultor'];

export default async function ConsultorIAPage() {
  const ctx = await getUserContext();

  if (!ctx) {
    redirect('/login');
  }

  if (!ELIGIBLE_PLANS.includes(ctx.plan)) {
    return (
      <div className="p-6">
        <EmptyState
          title="Consultor IA é exclusivo dos planos Pro e Consultor"
          description="Assine o plano Pro ou Consultor/Agência para conversar com a IA especializada em pontos e milhas do clube, com recomendações baseadas no seu saldo e nas oportunidades do momento."
          icon={Sparkles}
          action={
            <Link href="/assinatura" className={cn(buttonVariants({ variant: 'default' }))}>
              Ver planos
            </Link>
          }
        />
      </div>
    );
  }

  // O contexto (saldo de pontos, preferências, oportunidades) é montado
  // dentro da própria Server Action (askConsultant → loadUserContext), a
  // partir da sessão real — não construímos nem passamos isso pelo client.

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Consultor IA</h1>
        <p className="mt-1 text-muted-foreground">
          Converse com a IA do clube sobre pontos, milhas e a melhor estratégia para sua próxima viagem.
        </p>
      </div>
      <ConsultorChat />
    </div>
  );
}
