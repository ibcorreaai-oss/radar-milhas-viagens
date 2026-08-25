'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { HOME_DICTIONARIES, type HomeDictionary, type Locale } from '@/lib/i18n/translations';

const LANGUAGE_STORAGE_KEY = 'radar-lang';

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: HomeDictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Idioma da home (ETAPA 12) — mesmo padrão do ThemeProvider (Context +
// localStorage), mas escopado só à página inicial: só aqui existe o botão
// de troca de idioma, então só aqui esse Provider é montado (ver
// app/page.tsx). O resto do site (34 telas logadas) continua só em pt-BR.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt-BR');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Locale | null;
      if (stored && stored in HOME_DICTIONARIES) {
        setLocaleState(stored);
        return;
      }
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === 'en') setLocaleState('en');
      else if (browserLang === 'fr') setLocaleState('fr');
      else if (browserLang === 'es') setLocaleState('es');
    } catch {
      // localStorage/navigator indisponível — segue em pt-BR.
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Sem persistência disponível — ainda aplica pro resto da sessão.
    }
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: HOME_DICTIONARIES[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage() precisa estar dentro de <LanguageProvider> (ver app/page.tsx).');
  }
  return ctx;
}
