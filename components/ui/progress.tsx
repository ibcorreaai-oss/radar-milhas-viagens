import { cn } from '@/lib/utils';

// Barra de progresso mínima, sem dependência externa — mesmo espírito de
// components/ui/popover.tsx. Usada pra "sensação de progresso" (ETAPA 13 —
// NeuroUX): completude do onboarding, completude do perfil.
export function Progress({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
