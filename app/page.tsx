import Link from 'next/link';
import {
  Hotel,
  Bell,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Search,
  Calculator,
  MessageCircle,
  Tag,
  Bot,
  ArrowRight,
  CheckCircle2,
  ListChecks,
  SlidersHorizontal,
  BadgeCheck,
  ScrollText,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PLANS, PLAN_ORDER } from '@/lib/plans';

const STEPS = [
  {
    icon: SlidersHorizontal,
    title: 'Conte suas preferências',
    description:
      'Aeroporto de origem, destinos favoritos, orçamento e os programas de pontos que você já tem — Livelo, Esfera, Smiles, LATAM Pass e outros.',
  },
  {
    icon: TrendingUp,
    title: 'O radar compara dinheiro vs. pontos',
    description:
      'A cada verificação, cruzamos o preço em dinheiro com o custo real de usar (ou comprar) pontos e calculamos o que realmente vale mais a pena.',
  },
  {
    icon: Bell,
    title: 'Você recebe alerta só quando vale a pena',
    description:
      'Nada de notificação toda hora. O alerta chega por e-mail (ou WhatsApp, nos planos superiores) apenas quando a oportunidade passa no nosso score.',
  },
  {
    icon: CheckCircle2,
    title: 'Decida com confiança',
    description:
      'Você recebe a recomendação em texto simples — pagar em dinheiro, usar pontos, transferir com bônus ou esperar — e confirma a compra direto no site oficial.',
  },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Busca de voos',
    description: 'Compare preços em dinheiro e em pontos para as rotas que você mais usa.',
  },
  {
    icon: Hotel,
    title: 'Busca de hotéis',
    description: 'Veja diárias em dinheiro ou pontos, com café da manhã e política de cancelamento.',
  },
  {
    icon: Calculator,
    title: 'Calculadora de pontos',
    description: 'Descubra o valor real do seu milheiro e se vale a pena resgatar, comprar ou esperar.',
  },
  {
    icon: Bell,
    title: 'Alertas inteligentes',
    description: 'Monitoramento contínuo por e-mail ou WhatsApp, avisando só quando o preço cai de verdade.',
  },
  {
    icon: Tag,
    title: 'Promoções selecionadas',
    description: 'Transferências bonificadas, compra de pontos e passagens em promoção, com curadoria.',
  },
  {
    icon: Bot,
    title: 'Consultor IA',
    description: 'Tire dúvidas sobre a melhor forma de usar seus pontos em uma conversa, sem jargão técnico.',
  },
];

const TRUST_POINTS = [
  {
    icon: ScrollText,
    title: 'Sem letra miúda',
    description: 'Planos claros, sem taxa escondida e sem pegadinha de contrato.',
  },
  {
    icon: BadgeCheck,
    title: 'Cancele quando quiser',
    description: 'Assinatura mês a mês. Cancelou hoje, para de ser cobrado no próximo ciclo.',
  },
  {
    icon: ShieldCheck,
    title: 'Você decide, nós só avisamos',
    description: 'Nunca compramos ou emitimos nada por você — a decisão final é sempre sua.',
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,hsl(var(--primary)/0.12),transparent_45%),radial-gradient(circle_at_85%_10%,hsl(var(--accent)/0.15),transparent_40%)]"
          />
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Clube de alertas de viagem com IA
              </Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Você não precisa virar especialista em milhas para viajar pagando menos
              </h1>
              <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
                O Radar Milhas &amp; Viagens é uma assinatura que vigia o preço de passagens e
                hotéis por você — em dinheiro ou em pontos — e avisa só quando realmente vale a
                pena. Sem planilha, sem grupo de WhatsApp, sem virar expert.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}>
                  Criar conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#precos"
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
                >
                  Ver planos
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Grátis para começar. Sem cartão de crédito.
              </p>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-16 border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Como funciona</h2>
              <p className="mt-4 text-muted-foreground">
                Quatro passos entre criar sua conta e parar de perder tempo comparando preço na
                mão.
              </p>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <div key={step.title} className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                    Passo {index + 1}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* A pergunta central */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Card className="border-primary/20 bg-primary text-primary-foreground shadow-lg">
              <CardContent className="p-8 text-center sm:p-12">
                <ListChecks className="mx-auto h-8 w-8 opacity-90" />
                <p className="mx-auto mt-6 max-w-2xl text-balance text-2xl font-semibold leading-snug sm:text-3xl">
                  &ldquo;Nesta viagem, vale mais a pena pagar em dinheiro, usar pontos, transferir
                  pontos, comprar pontos ou esperar promoção?&rdquo;
                </p>
                <p className="mx-auto mt-6 max-w-xl text-primary-foreground/85">
                  É essa a pergunta que qualquer pessoa que acumula pontos se faz na hora de comprar
                  uma passagem. O Radar responde automaticamente, com um score de 0 a 100 e uma
                  recomendação em texto simples — sem você precisar entender de milheiro, bônus de
                  transferência ou classe promocional.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Funcionalidades */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo que você precisa para decidir bem
              </h2>
              <p className="mt-4 text-muted-foreground">
                Uma central única para pesquisar, comparar e ser avisado — em vez de dez abas
                abertas.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-4 text-base">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Preços */}
        <section id="precos" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Planos para cada tipo de viajante
              </h2>
              <p className="mt-4 text-muted-foreground">
                Comece de graça. Faça upgrade quando quiser mais alertas, WhatsApp e a IA
                consultora.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {PLAN_ORDER.map((planId) => {
                const plan = PLANS[planId];
                const isFeatured = planId === 'pro';
                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      'flex flex-col',
                      isFeatured && 'border-primary shadow-lg ring-1 ring-primary'
                    )}
                  >
                    <CardHeader>
                      {isFeatured && (
                        <Badge variant="accent" className="mb-3 w-fit">
                          Mais escolhido
                        </Badge>
                      )}
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="pt-2 text-3xl font-bold tracking-tight">
                        {plan.priceLabel}
                      </div>
                      <CardDescription>
                        {plan.searchesPerDay === null
                          ? 'Buscas ilimitadas'
                          : `${plan.searchesPerDay} ${plan.searchesPerDay === 1 ? 'busca' : 'buscas'} por dia`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <ul className="flex-1 space-y-3 text-sm">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/cadastro?plano=${plan.id}`}
                        className={cn(
                          buttonVariants({ variant: isFeatured ? 'default' : 'outline' }),
                          'mt-6 w-full'
                        )}
                      >
                        Começar
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Prova social / confiança */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {TRUST_POINTS.map((point) => (
                <div key={point.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                    <point.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{point.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{point.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <MessageCircle className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
              Pare de virar refém das planilhas de milhas
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Crie sua conta grátis em menos de dois minutos e deixe o radar avisar quando valer a
              pena viajar.
            </p>
            <div className="mt-8">
              <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }))}>
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Aviso legal curto */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Separator className="mb-10" />
            <div className="rounded-xl border border-border bg-muted/40 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Radar Milhas &amp; Viagens é uma ferramenta de comparação e alertas. Não somos
                agência de viagens, não emitimos passagens e não garantimos preço ou
                disponibilidade.{' '}
                <Link href="/aviso-precos" className="font-medium text-primary underline underline-offset-4">
                  Leia o aviso completo
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
