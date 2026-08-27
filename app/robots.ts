import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

const SITE_URL = getSiteUrl();

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
        '/favoritos',
        '/afiliados',
        '/treinamentos',
        '/auth',
        // World Experience Radar (Fases 8-9) — mesmas 3 exigem login
        // (redirect próprio na page, não middleware), achado na auditoria
        // de produção: nunca tinham sido adicionadas aqui.
        '/viagens',
        '/montar-viagem',
        '/concierge',
      ],
      // '/descobrir', '/estadias', '/cruzeiros', '/oportunidades-mundiais',
      // '/onde-ir' e '/viagem-compartilhada' NÃO entram aqui de propósito
      // (mesmo achado da ETAPA 19, estendido nas Fases 3-11): são conteúdo
      // público de verdade (atrás de feature flag, não de login — nenhuma
      // delas está em middleware.ts PROTECTED_PREFIXES nem faz redirect por
      // falta de sessão). Bloquear indexação delas seria um erro, não um
      // ganho de crawl budget.
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
