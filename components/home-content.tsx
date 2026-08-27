'use client';

import Image from 'next/image';
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
import { HeroSearchBox } from '@/components/hero-search-box';
import { CashVsPointsTeaser } from '@/components/cash-vs-points-teaser';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/components/language-provider';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PLANS, PLAN_ORDER } from '@/lib/plans';

const STEP_ICONS = [SlidersHorizontal, TrendingUp, Bell, CheckCircle2];
const FEATURE_ICONS = [Search, Hotel, Calculator, Bell, Tag, Bot];
const TRUST_ICONS = [ScrollText, BadgeCheck, ShieldCheck];

// Fotos reais (Unsplash, licença gratuita p/ uso comercial — mesmos hosts já
// liberados em next.config.mjs/lib/image-hosts.ts). Uma por passo/
// funcionalidade, na mesma ordem de STEP_ICONS/FEATURE_ICONS — índice 5 de
// FEATURE_IMAGES (Consultor IA) continua usando a imagem gerada por IA já
// existente, pra não duplicar o card que já tinha foto.
const STEP_IMAGES = [
  'https://images.unsplash.com/photo-1655722724447-2d2a3071e7f8?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1730789701634-5386e7271462?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470350576089-539d5a852bf7?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549894595-4698795b38ee?w=1200&q=80&auto=format&fit=crop',
];

const FEATURE_IMAGES = [
  'https://images.unsplash.com/photo-1499063078284-f78f7d89616a?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578898886225-c7c894047899?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1537724326059-2ea20251b9c8?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544365712-91cd4904cd07?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502301197179-65228ab57f78?w=800&q=80&auto=format&fit=crop',
  '/images/consultor-ia.png',
];

// Conteúdo traduzível da home (ETAPA 12) — client component porque depende
// do idioma escolhido em runtime (useLanguage/LanguageProvider em
// app/page.tsx). SiteHeader/SiteFooter ficam de fora de propósito: são
// compartilhados com o resto do site (termos, contato, cadastro etc.) e
// traduzir só ali sem traduzir as outras 30+ telas logadas criaria uma
// experiência inconsistente pra quem navegasse além da home. A renderização
// inicial (SSR, o que o Google/crawler vê) sempre usa pt-BR — a troca de
// idioma só acontece depois de hidratado, via localStorage — então SEO/GEO
// não regride. Ver lib/i18n/translations.ts para o motivo do escopo.
export function HomeContent() {
  const { t } = useLanguage();

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,hsl(var(--primary)/0.12),transparent_45%),radial-gradient(circle_at_85%_10%,hsl(var(--accent)/0.15),transparent_40%)]"
        />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {t.hero.badge}
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t.hero.title}
            </h1>
            <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">{t.hero.subtitle}</p>
          </div>

          <div className="relative mx-auto mt-10 h-56 w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl sm:h-72">
            <Image
              src="/images/hero-airport.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-cover"
            />
          </div>

          <div className="mt-10">
            <HeroSearchBox />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t.hero.freeNote}{' '}
              <Link href="#precos" className="font-medium text-primary underline underline-offset-4">
                {t.hero.verPlanos}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <CashVsPointsTeaser />

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-16 border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.steps.title}</h2>
            <p className="mt-4 text-muted-foreground">{t.steps.subtitle}</p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.steps.items.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <div
                  key={step.title}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative h-32 w-full">
                    <Image
                      src={STEP_IMAGES[index]}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                    <div className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {step.step}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* A pergunta central */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-10%,hsl(var(--primary-foreground)/0.20),transparent_50%),radial-gradient(circle_at_92%_110%,hsl(var(--primary-foreground)/0.14),transparent_45%)]"
            />
            <CardContent className="relative p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-inset ring-primary-foreground/20">
                <ListChecks className="h-7 w-7" />
              </div>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-2xl font-semibold leading-snug sm:text-3xl">
                {t.question.quote}
              </p>
              <p className="mx-auto mt-6 max-w-xl text-primary-foreground/85">{t.question.body}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.features.title}</h2>
            <p className="mt-4 text-muted-foreground">{t.features.subtitle}</p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((feature, index) => {
              const Icon = FEATURE_ICONS[index];
              return (
                <Card key={feature.title} className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative h-32 w-full">
                    <Image
                      src={FEATURE_IMAGES[index]}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 380px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-4 text-base">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="scroll-mt-16 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.pricing.title}</h2>
            <p className="mt-4 text-muted-foreground">{t.pricing.subtitle}</p>
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
                        {t.pricing.maisEscolhido}
                      </Badge>
                    )}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="pt-2 text-3xl font-bold tracking-tight">{plan.priceLabel}</div>
                    <CardDescription>
                      {plan.searchesPerDay === null
                        ? t.pricing.ilimitadas
                        : t.pricing.buscasPorDia(plan.searchesPerDay)}
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
                      {t.pricing.comecar}
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
            {t.trust.items.map((point, index) => {
              const Icon = TRUST_ICONS[index];
              return (
                <div key={point.title} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold">{point.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <MessageCircle className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{t.finalCta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t.finalCta.subtitle}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }))}>
              {t.finalCta.criarConta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contato" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
              {t.finalCta.falarComAGente}
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
              {t.legal.text}{' '}
              <Link href="/aviso-precos" className="font-medium text-primary underline underline-offset-4">
                {t.legal.link}
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
