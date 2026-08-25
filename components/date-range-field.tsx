'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePopover, PopoverPanel } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DateRangeFieldProps {
  startName: string;
  endName: string;
  startLabel?: string;
  endLabel?: string;
  defaultStart?: string | null;
  defaultEnd?: string | null;
  /** Desabilita a escolha de data final (ex.: voo só ida). O valor final enviado fica vazio. */
  disableEnd?: boolean;
  required?: boolean;
  className?: string;
}

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTH_FORMAT = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const DAY_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getTime() === b.getTime();
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildMonthGrid(monthAnchor: Date): (Date | null)[] {
  const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  const offset = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Calendário de um mês por vez (mais leve que dois meses lado a lado),
// com navegação prev/next e seleção de intervalo por dois cliques.
export function DateRangeField({
  startName,
  endName,
  startLabel = 'Entrada',
  endLabel = 'Saída',
  defaultStart,
  defaultEnd,
  disableEnd = false,
  required,
  className,
}: DateRangeFieldProps) {
  const { open, setOpen, ref } = usePopover();
  const [start, setStart] = useState<Date | null>(fromISODate(defaultStart));
  const [end, setEnd] = useState<Date | null>(disableEnd ? null : fromISODate(defaultEnd));
  const [viewMonth, setViewMonth] = useState<Date>(() => start ?? new Date());

  const today = useMemo(() => startOfDay(new Date()), []);
  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  function handlePickDay(day: Date) {
    if (day < today) return;

    if (disableEnd) {
      setStart(day);
      setOpen(false);
      return;
    }

    if (!start || (start && end)) {
      setStart(day);
      setEnd(null);
      return;
    }

    if (day < start) {
      setStart(day);
      setEnd(null);
      return;
    }

    setEnd(day);
    setOpen(false);
  }

  const triggerLabel =
    start && end
      ? `${DAY_FORMAT.format(start)} – ${DAY_FORMAT.format(end)}`
      : start
        ? `${DAY_FORMAT.format(start)} – ?`
        : 'Escolha as datas';

  return (
    <div ref={ref} className={cn('relative space-y-1.5', className)}>
      <Label>{disableEnd ? startLabel : `${startLabel} / ${endLabel}`}</Label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn(!start && 'text-muted-foreground')}>{triggerLabel}</span>
      </button>

      <input type="hidden" name={startName} value={start ? toISODate(start) : ''} required={required} />
      {!disableEnd && <input type="hidden" name={endName} value={end ? toISODate(end) : ''} />}

      {open && (
        <PopoverPanel className="w-72">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium">{capitalizeFirst(MONTH_FORMAT.format(viewMonth))}</p>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={`${w}-${i}`}>{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
            {grid.map((day, i) => {
              if (!day) return <span key={`empty-${i}`} />;

              const disabled = day < today;
              const isStart = sameDay(day, start);
              const isEnd = sameDay(day, end);
              const inRange = !!start && !!end && day > start && day < end;

              return (
                <button
                  key={toISODate(day)}
                  type="button"
                  disabled={disabled}
                  onClick={() => handlePickDay(day)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground/40',
                    !disabled && 'hover:bg-primary/10',
                    inRange && 'rounded-none bg-primary/10',
                    (isStart || isEnd) && 'bg-primary font-semibold text-primary-foreground hover:bg-primary'
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
}
