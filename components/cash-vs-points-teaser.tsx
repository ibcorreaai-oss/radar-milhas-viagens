import { ArrowRight, Wallet, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ScoreBadge } from '@/components/score-badge';
import { buttonVariants } from '@/components/ui/button';
import { formatBRL, formatPoints, cn } from '@/lib/utils';

// Exemplo estático e ilustrativo do CashVsPoints — não é uma oferta real,
// só mostra visualmente o que o OpportunityEngine calcula de verdade quando
// o usuário faz uma busca (ver /hoteis, /voos e components/price-comparison-card.tsx).
const EXAMPLE = {
  hotel: 'Hotel Beira-Mar, Fortaleza',
  cashPrice: 1480,
  pointsPrice: 38000,
  taxes: 59,
  program: 'Livelo',
  score: 92,
};

export function CashVsPointsTeaser() {
  const valorMilheiro = ((EXAMPLE.cashPrice - EXAMPLE.taxes) / EXAMPLE.pointsPrice) * 1000;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Encontre oportunidades que outros viajantes não percebem
            </h2>
            <p className="mt-4 text-muted-foreground">
              Toda busca no Radar compara automaticamente o preço em dinheiro com o custo real de
              usar pontos — taxas incluídas — e mostra o valor que você está obtendo por cada
              milheiro. Sem planilha, sem calculadora à parte.
            </p>
            <Link
              href="/cadastro"
              className={cn(buttonVariants({ size: 'lg' }), 'mt-8')}
            >
              Comparar dinheiro e pontos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Card className="border-primary/20 shadow-lg">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Exemplo ilustrativo
                  </p>
                  <p className="text-sm font-semibold">{EXAMPLE.hotel}</p>
                </div>
                <ScoreBadge score={EXAMPLE.score} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" /> Dinheiro
                  </p>
                  <p className="mt-1 text-xl font-bold">{formatBRL(EXAMPLE.cashPrice)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" /> {EXAMPLE.program}
                  </p>
                  <p className="mt-1 text-xl font-bold">{formatPoints(EXAMPLE.pointsPrice)} pts</p>
                  <p className="text-xs text-muted-foreground">+ {formatBRL(EXAMPLE.taxes)} em taxas</p>
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 p-3 text-sm">
                <p>
                  Valor do milheiro:{' '}
                  <span className="font-semibold text-foreground">{formatBRL(valorMilheiro)}</span>
                </p>
                <p className="mt-1 font-medium text-primary">→ Melhor usar pontos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
