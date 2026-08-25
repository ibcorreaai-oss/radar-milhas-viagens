import { ImageResponse } from 'next/og';

// Convenção de arquivo do Next.js (App Router): gera a imagem de Open
// Graph/Twitter Card em /opengraph-image automaticamente, sem depender de
// um arquivo estático — zero custo (roda no Edge Runtime da própria
// Vercel), e herda pra todas as rotas que não definem a própria imagem
// (mesma regra de herança do resto da Metadata API). Ver SEO_GEO.md.
export const runtime = 'edge';
export const alt = 'Radar Milhas & Viagens — Viaje mais. Pague menos.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#0b1220',
          backgroundImage: 'radial-gradient(circle at 80% 20%, #1d4ed8 0%, #0b1220 55%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: '#1d4ed8',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
            }}
          >
            ✈️
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: '#ffffff', fontWeight: 700 }}>
            Radar Milhas &amp; Viagens
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 68, color: '#ffffff', fontWeight: 800, lineHeight: 1.1 }}>
          Viaje mais. Pague menos.
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#cbd5f5', marginTop: 28, maxWidth: 900 }}>
          Compare dinheiro vs pontos e milhas automaticamente — e receba alerta só quando valer a pena.
        </div>
      </div>
    ),
    { ...size }
  );
}
