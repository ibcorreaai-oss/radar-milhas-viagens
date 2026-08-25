'use client';

import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Tooltip mínimo, sem dependência externa — mesmo espírito de
// components/ui/popover.tsx (hand-rolled, sem CLI de componente). Usado
// pela sidebar recolhida (ETAPA 12) pra mostrar o nome do item só com
// ícone visível.
//
// Renderiza via createPortal em document.body (posição calculada a partir
// do getBoundingClientRect do gatilho) em vez de `position: absolute`
// dentro do próprio elemento — a sidebar tem `overflow-y-auto` (pra
// permitir rolar a lista de itens em telas baixas), e qualquer eixo não-
// visible força o CSS a tratar o outro eixo como `auto` também (regra do
// spec), cortando um tooltip posicionado dentro dela. Achado testando de
// verdade no navegador (Playwright), não algo hipotético.
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function updatePosition() {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.top + rect.height / 2, left: rect.right + 8 });
  }

  function show() {
    updatePosition();
    setOpen(true);
  }

  return (
    <span
      ref={ref}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md"
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
}
