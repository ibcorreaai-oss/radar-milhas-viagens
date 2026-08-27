import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

const SITE_URL = getSiteUrl();

// Só rotas realmente públicas e indexáveis — nada atrás de login (o
// middleware redireciona pra /login mesmo assim, então indexar seria
// desperdiçar orçamento de rastreamento do Google com uma página vazia).
// Ver SEO_GEO.md e middleware.ts (PROTECTED_PREFIXES) — se uma rota nova
// entrar na lista de protegidas, ela não deveria estar aqui.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/promocoes', changeFrequency: 'daily', priority: 0.8 },
    { path: '/descobrir', changeFrequency: 'daily', priority: 0.7 },
    { path: '/estadias', changeFrequency: 'daily', priority: 0.7 },
    { path: '/cruzeiros', changeFrequency: 'daily', priority: 0.7 },
    { path: '/oportunidades-mundiais', changeFrequency: 'daily', priority: 0.7 },
    { path: '/onde-ir', changeFrequency: 'daily', priority: 0.7 },
    { path: '/programas', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/calculadora', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/cadastro', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/login', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/aviso-precos', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/contato', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/termos', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/privacidade', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/politica-afiliados', changeFrequency: 'yearly', priority: 0.3 },
  ];

  const now = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
