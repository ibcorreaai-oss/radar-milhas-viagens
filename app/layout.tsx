import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/toast-provider';
import { AnalyticsScripts } from '@/components/analytics-scripts';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import { ORGANIZATION_JSON_LD, SOFTWARE_APPLICATION_JSON_LD } from '@/lib/structured-data';
import { getSiteUrl } from '@/lib/site-url';
import './globals.css';

const SITE_URL = getSiteUrl();
const SITE_NAME = 'Radar Milhas & Viagens';
const SITE_DESCRIPTION =
  'Assinatura que vigia preços de passagem e hotel — em dinheiro ou em pontos — e avisa só quando vale a pena. Compare dinheiro vs pontos e milhas automaticamente.';

// metadataBase é obrigatório pra toda URL relativa de Open Graph/Twitter
// (ex.: a imagem gerada em app/opengraph-image.tsx) resolver como absoluta
// nas plataformas que consomem esses metadados (WhatsApp, X, LinkedIn,
// Slack, etc.) — sem isso, o preview do link social simplesmente não
// aparece. Ver SEO_GEO.md.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Clube de alertas de viagem com IA`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // PWA (ETAPA 12): manifest gerado por app/manifest.ts é linkado
  // automaticamente pelo Next — só o ícone da Apple precisa de metadata
  // explícita (iOS não lê o manifest pra isso).
  icons: { apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Radar Milhas' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Clube de alertas de viagem com IA`,
    description: SITE_DESCRIPTION,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Clube de alertas de viagem com IA`,
    description: SITE_DESCRIPTION,
  },
  // Meta keywords é ignorado pelo Google desde 2009 — de propósito não
  // incluído aqui (ver SEO_GEO.md sobre o que é prática atual vs. cargo cult).
};

export const viewport: Viewport = {
  themeColor: '#1447e6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica a classe .dark ANTES do primeiro paint — sem isso, a
            página sempre renderia clara por uma fração de segundo mesmo
            com o usuário preferindo escuro (FOUC). Ver lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* JSON-LD (schema.org) — GEO/AEO: dá pra IA generativa (ChatGPT,
            Gemini, Perplexity) e rich results do Google um resumo factual
            e estruturado do produto, sem depender de raspar texto solto da
            página. Ver lib/structured-data.ts e SEO_GEO.md. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APPLICATION_JSON_LD) }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AnalyticsScripts />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
