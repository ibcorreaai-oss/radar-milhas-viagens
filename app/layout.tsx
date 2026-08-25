import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radar Milhas & Viagens — Clube de alertas de viagem com IA',
  description:
    'Assinatura que vigia preços de passagem e hotel — em dinheiro ou em pontos — e avisa só quando vale a pena.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica a classe .dark ANTES do primeiro paint — sem isso, a
            página sempre renderia clara por uma fração de segundo mesmo
            com o usuário preferindo escuro (FOUC). Ver lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
