'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, applyTheme, type ThemePreference } from '@/lib/theme';

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Estado de tema centralizado — sem isto, cada <ThemeToggle> (header desktop
// + menu mobile + sidebar logada) mantinha o próprio useState local, e
// escolher "Escuro" num deles não atualizava os outros (achado no teste de
// regressão da ETAPA 10: os toggles ficavam mostrando estados diferentes na
// mesma página). Um Provider único no root layout resolve isso na raiz —
// padrão igual ao que next-themes usa, sem precisar da dependência.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>('system');

  useEffect(() => {
    let stored: ThemePreference = 'system';
    try {
      stored = (localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null) ?? 'system';
    } catch {
      // localStorage indisponível — segue com 'system'.
    }
    setThemeState(stored);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      setThemeState((current) => {
        if (current === 'system') applyTheme('system');
        return current;
      });
    };
    media.addEventListener('change', onSystemChange);
    return () => media.removeEventListener('change', onSystemChange);
  }, []);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Sem persistência disponível — ainda aplica pro resto da sessão.
    }
    applyTheme(next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() precisa estar dentro de <ThemeProvider> (ver app/layout.tsx).');
  }
  return ctx;
}
