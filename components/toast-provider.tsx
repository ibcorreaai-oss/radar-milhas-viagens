'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sistema de notificação global (ETAPA 13 — NeuroUX: "feedback imediato" e
// "celebrar conquistas") — mesmo padrão de Context de theme-provider.tsx/
// language-provider.tsx. Antes desta etapa o app não tinha NENHUM mecanismo
// de confirmação temporária: `/perfil` redirecionava com `?sucesso=1` três
// vezes (actions.ts) sem nada consumir o parâmetro — a pessoa salvava o
// perfil e não via confirmação nenhuma. Ver components/toast-from-query.tsx
// pra como isso foi corrigido.
export type ToastVariant = 'success' | 'info' | 'celebration' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  show: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  celebration: CheckCircle2,
  error: AlertCircle,
};

const VARIANT_STYLE: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success/10 text-foreground',
  info: 'border-border bg-card text-foreground',
  celebration: 'border-primary/30 bg-primary/10 text-foreground',
  error: 'border-destructive/30 bg-destructive/10 text-foreground',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
      >
        {toasts.map((t) => {
          const Icon = VARIANT_ICON[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3.5 shadow-lg',
                VARIANT_STYLE[t.variant]
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="mt-0.5 text-muted-foreground">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Fechar notificação"
                className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-black/5 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() precisa estar dentro de <ToastProvider> (ver app/layout.tsx).');
  }
  return ctx;
}
