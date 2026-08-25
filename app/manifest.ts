import type { MetadataRoute } from 'next';

// PWA: permite "Adicionar à tela inicial" no celular/tablet/desktop direto
// pelo navegador (Chrome/Edge/Safari) — sem loja de app, sem toolchain nativo
// (a alternativa mais pesada, Tauri, ficou de fora por decisão do Igor na
// ETAPA 12: precisaria de Rust + processo de build separado do deploy web
// atual). Ícones em public/icons/ (gerados nesta etapa a partir do
// app/icon.svg existente).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Radar Milhas & Viagens',
    short_name: 'Radar Milhas',
    description:
      'Clube de assinatura que compara preços de passagem e hotel em dinheiro e em pontos/milhas, e avisa quando vale a pena reservar.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1447e6',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
