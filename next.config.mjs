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
};

export default nextConfig;
