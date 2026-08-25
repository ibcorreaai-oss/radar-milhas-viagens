import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LanguageProvider } from '@/components/language-provider';
import { HomeContent } from '@/components/home-content';

export default function HomePage() {
  return (
    <LanguageProvider>
      <SiteHeader />
      <HomeContent />
      <SiteFooter />
    </LanguageProvider>
  );
}
