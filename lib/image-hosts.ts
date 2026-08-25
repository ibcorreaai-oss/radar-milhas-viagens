// Hosts liberados pro otimizador do next/image — ver next.config.mjs
// (remotePatterns) e components/world-event-card.tsx. Mantenha as duas
// listas em sincronia manualmente: next.config.mjs roda fora do compilador
// TypeScript do app (Node puro), então não dá pra importar este arquivo de
// lá sem ferramenta extra — duplicar uma lista de 4 hosts é mais simples e
// mais confiável do que introduzir isso.
export const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'upload.wikimedia.org', 'res.cloudinary.com', 'images.pexels.com'];

// true se a URL puder passar pelo otimizador (host na allowlist, ou o
// próprio bucket do Supabase Storage do projeto). Usado pra decidir entre
// next/image (otimizado) e <img> puro (sempre funciona, qualquer host) —
// nunca deixa uma URL de host desconhecido quebrar a renderização da página.
export function isOptimizableImageHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    if (ALLOWED_IMAGE_HOSTS.includes(hostname)) return true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && hostname === new URL(supabaseUrl).hostname) return true;

    return false;
  } catch {
    return false;
  }
}
