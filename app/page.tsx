import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LanguageProvider } from '@/components/language-provider';
import { HomeContent } from '@/components/home-content';
import { HomeAssistantWidget } from '@/components/home-assistant-widget';

// ETAPA 19 (achado em auditoria de SEO pré-deploy) — o resto do title/
// description já vem do default em app/layout.tsx; só faltava o canonical
// explícito (nenhuma página do projeto tinha até esta etapa).
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <LanguageProvider>
      <SiteHeader />
      <HomeContent />
      <SiteFooter />
      <HomeAssistantWidget />
    </LanguageProvider>
  );
}
