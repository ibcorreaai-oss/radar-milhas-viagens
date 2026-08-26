import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { BillingInterval } from '@/lib/plans';

interface BillingIntervalToggleProps {
  interval: BillingInterval;
}

// Server Component de propósito — troca de mensal/anual é só um link que
// muda ?interval= na URL (o page.tsx lê o searchParams e recalcula os
// preços de cada card no servidor). Evita transformar a página inteira de
// planos num client component só por causa de um toggle.
export function BillingIntervalToggle({ interval }: BillingIntervalToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1">
      <Link
        href="/assinatura?interval=month"
        className={cn(
          'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          interval === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        )}
      >
        Mensal
      </Link>
      <Link
        href="/assinatura?interval=year"
        className={cn(
          'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
          interval === 'year' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
        )}
      >
        Anual
        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-xs font-semibold text-success">
          2 meses grátis
        </span>
      </Link>
    </div>
  );
}
