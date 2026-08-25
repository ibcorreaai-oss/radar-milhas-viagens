'use client';

import { useState } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { usePopover, PopoverPanel } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface GuestCounterConfig {
  key: string;
  label: string;
  hint?: string;
  min: number;
  max?: number;
  defaultValue: number;
}

export interface GuestsFieldProps {
  fieldLabel: string;
  counters: GuestCounterConfig[];
  summary: (values: Record<string, number>) => string;
  className?: string;
}

// Popover com steppers (- valor +) para hóspedes/quartos/passageiros. Cada
// counter vira um hidden input com o nome de campo que o backend já espera
// (ex.: "guests"/"rooms" em /hoteis, "adults"/"children"/"infants" em /voos)
// — não muda contrato nenhum, só melhora a interação.
export function GuestsField({ fieldLabel, counters, summary, className }: GuestsFieldProps) {
  const { open, setOpen, ref } = usePopover();
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(counters.map((c) => [c.key, c.defaultValue]))
  );

  function change(key: string, delta: number) {
    const config = counters.find((c) => c.key === key);
    if (!config) return;
    setValues((prev) => {
      const next = prev[key] + delta;
      const min = config.min;
      const max = config.max ?? Infinity;
      if (next < min || next > max) return prev;
      return { ...prev, [key]: next };
    });
  }

  return (
    <div ref={ref} className={cn('relative space-y-1.5', className)}>
      <Label>{fieldLabel}</Label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-left text-sm shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>{summary(values)}</span>
      </button>

      {counters.map((c) => (
        <input key={c.key} type="hidden" name={c.key} value={values[c.key]} />
      ))}

      {open && (
        <PopoverPanel className="w-72 !left-auto right-0 space-y-4">
          {counters.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                {c.hint && <p className="text-xs text-muted-foreground">{c.hint}</p>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Diminuir ${c.label.toLowerCase()}`}
                  disabled={values[c.key] <= c.min}
                  onClick={() => change(c.key, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-input disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-4 text-center text-sm tabular-nums">{values[c.key]}</span>
                <button
                  type="button"
                  aria-label={`Aumentar ${c.label.toLowerCase()}`}
                  disabled={values[c.key] >= (c.max ?? Infinity)}
                  onClick={() => change(c.key, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-input disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </PopoverPanel>
      )}
    </div>
  );
}
