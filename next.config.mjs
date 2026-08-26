// Hosts de imagem permitidos pro otimizador do next/image. Curado, não
// wildcard: cover_image_url (world_events) é texto livre digitado por um
// admin confiável hoje, mas o otimizador de imagem da Vercel busca a URL
// no servidor — um remotePatterns aberto viraria vetor de SSRF se esse
// campo algum dia aceitar entrada de alguém não confiável. Pra liberar um
// host novo, adicione aqui E em lib/image-hosts.ts (as duas listas
// precisam estar em sincronia — ver comentário lá do porquê de serem dois
// arquivos em vez de um import compartilhado).
const ALLOWED_IMAGE_HOSTS = [
  'images.unsplash.com',
  'upload.wikimedia.org',
  'res.cloudinary.com',
  'images.pexels.com',
];

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

// ETAPA 19 (auditoria de segurança pré-deploy) — cabeçalhos HTTP de
// segurança que faltavam por completo. Deliberadamente SEM
// Content-Security-Policy aqui: o app carrega scripts de terceiros
// variados e opcionais (GA4, Meta/Google/TikTok/Twitter pixel — ver
// lib/analytics.ts — cada um só se a env var existir), então uma CSP
// estrita escrita sem testar contra tráfego real correria risco real de
// quebrar algum desses scripts silenciosamente. HSTS também não entra
// aqui: a Vercel já aplica automaticamente quando o domínio próprio com
// HTTPS for configurado (parte do próprio plano do Igor pra depois do
// deploy) — declarar de novo aqui não muda nada, só duplica.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Clickjacking: o app não precisa nunca rodar dentro de um iframe de
  // outro site.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nenhuma dessas APIs de navegador é usada — nega explicitamente em vez
  // de deixar implícito.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      ...ALLOWED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname })),
      ...(supabaseHost ? [{ protocol: 'https', hostname: supabaseHost }] : []),
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
