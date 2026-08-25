'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Popover mínimo, sem dependência externa: um hook que controla estado
// aberto/fechado + fecha ao clicar fora ou apertar Esc, e um painel
// posicionado. Cada campo de busca (data, hóspedes, destino) usa o próprio
// gatilho (botão, input) e só reaproveita este hook + painel.
export function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return { open, setOpen, ref };
}

export function PopoverPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      className={cn(
        'absolute left-0 top-full z-50 mt-2 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}
