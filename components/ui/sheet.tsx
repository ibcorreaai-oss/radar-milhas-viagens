'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Drawer/Sheet lateral mínimo, sem dependência externa — mesmo espírito de
// components/ui/popover.tsx. Usado pela navegação mobile do dashboard
// (ETAPA 12 — antes desta etapa, o AppShell logado não tinha NENHUMA
// alternativa mobile: a sidebar de 240px ficava fixa mesmo em telas
// pequenas). Fica sempre montado (não desmonta ao fechar) pra permitir a
// transição de slide suave; quando fechado, sai de tela + some da árvore
// de acessibilidade (aria-hidden) + para de aceitar clique
// (pointer-events-none).
export function Sheet({
  open,
  onClose,
  ariaLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Tab trap: sem isto, quem navega só por teclado passa direto pelos
      // elementos atrás do overlay enquanto o Sheet está aberto (achado real
      // da auditoria de acessibilidade, 27/08).
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  // Move o foco pro painel assim que ele abre — mesmo achado acima, metade
  // do problema (a outra metade é o trap de Tab).
  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  // Sem isto, fechar o Sheet clicando no botão "Fechar menu" (que fica
  // DENTRO do próprio Sheet) deixa o foco preso num elemento que acabou de
  // virar aria-hidden — o navegador avisa (corretamente) que isso quebra
  // acessibilidade pra quem usa leitor de tela. Tira o foco de qualquer
  // coisa dentro do painel assim que ele fecha.
  useEffect(() => {
    if (open) return;
    if (containerRef.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={cn('fixed inset-0 z-50 md:hidden', !open && 'pointer-events-none')}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
