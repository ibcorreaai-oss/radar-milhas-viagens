'use client';

import { Languages } from 'lucide-react';
import { usePopover, PopoverPanel } from '@/components/ui/popover';
import { useLanguage } from '@/components/language-provider';
import { LOCALE_LABELS, LOCALE_NAMES, type Locale } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';

const LOCALES: Locale[] = ['pt-BR', 'en', 'fr', 'es'];

// Seletor de idioma da home (ETAPA 12) — só existe aqui, nunca no
// SiteHeader compartilhado com o resto do site (ver LanguageProvider).
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Escolher idioma"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Languages className="h-4 w-4" />
        {LOCALE_LABELS[locale]}
      </button>

      {open && (
        <PopoverPanel className="right-0 w-40 !left-auto p-1.5">
          <div role="group" aria-label="Idioma" className="flex flex-col">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                aria-pressed={locale === l}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-sm transition-colors',
                  locale === l ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
                )}
              >
                {LOCALE_NAMES[l]}
              </button>
            ))}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
}
