import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radar Milhas & Viagens — Clube de alertas de viagem com IA',
  description:
    'Assinatura que vigia preços de passagem e hotel — em dinheiro ou em pontos — e avisa só quando vale a pena.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
