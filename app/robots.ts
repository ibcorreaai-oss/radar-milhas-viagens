import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Espelha middleware.ts PROTECTED_PREFIXES — tudo que exige login vira
// disallow aqui também. Não é a barreira de segurança (a RLS + middleware
// já são); é só sinal de "não vale a pena rastrear isto" pra não gastar
// orçamento de crawl do Google numa tela de login-wall.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/admin',
        '/api',
        '/alertas',
        '/perfil',
        '/assinatura',
        '/onboarding',
        '/hoteis',
        '/voos',
        '/bucket-list',
        '/consultor-ia',
        '/descobrir',
        '/auth',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
