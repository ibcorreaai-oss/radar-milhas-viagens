'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import type { ThemePreference } from '@/lib/theme';

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Escuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
];

// Alternador de tema (claro/escuro/sistema) — reaproveitado na home
// (SiteHeader + menu mobile) e nas páginas logadas (AppSidebar). Todas as
// instâncias compartilham o mesmo estado via useTheme() (ThemeProvider em
// app/layout.tsx) — nenhuma mantém estado local próprio, pra nunca
// divergir entre si (ver componente do Provider pro raciocínio completo).
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Tema do aplicativo"
      className={cn('inline-flex items-center gap-0.5 rounded-md border border-input p-0.5', className)}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-pressed={active}
            title={opt.label}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
