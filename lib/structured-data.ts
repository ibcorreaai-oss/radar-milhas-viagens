// Dados estruturados (schema.org / JSON-LD) — site-wide, injetados no
// <head> por app/layout.tsx. Objetivo duplo: rich results no Google (SEO
// tradicional) e contexto factual pra IA generativa citar o produto
// corretamente (GEO — ver SEO_GEO.md). Estático de propósito (sem gerar em
// runtime): os dados abaixo (nome, planos, preço) mudam raramente e não
// dependem de banco — gerar em runtime seria complexidade sem ganho.
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { getSiteUrl } from '@/lib/site-url';

const SITE_URL = getSiteUrl();

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Radar Milhas & Viagens',
  url: SITE_URL,
  description:
    'Clube de assinatura que compara preços de passagem e hotel em dinheiro e em pontos/milhas, e avisa por e-mail ou WhatsApp quando vale a pena reservar.',
  areaServed: 'BR',
  availableLanguage: 'pt-BR',
};

export const SOFTWARE_APPLICATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Radar Milhas & Viagens',
  applicationCategory: 'TravelApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'Compara automaticamente o preço de passagens e hotéis pago em dinheiro contra o custo real de usar pontos/milhas de programas de fidelidade (Livelo, Esfera, Smiles, LATAM Pass, Azul Fidelidade e outros), calcula o valor do milheiro e recomenda a melhor forma de pagar. Envia alertas por e-mail ou WhatsApp quando o preço cai ou aparece uma boa oportunidade de resgate. Todo cadastro novo tem 5 dias de teste grátis, sem cartão de crédito.',
  // ETAPA 19 (achado em auditoria de SEO pré-deploy) — antes só listava o
  // preço mensal; a opção anual (ETAPA 16) nunca tinha entrado aqui, então
  // rich results/IA generativa não sabiam que ela existe.
  offers: PLAN_ORDER.flatMap((planId) => {
    const plan = PLANS[planId];
    const monthly = {
      '@type': 'Offer',
      name: `Plano ${plan.name} (mensal)`,
      price: (plan.priceCents / 100).toFixed(2),
      priceCurrency: 'BRL',
      description: plan.features.join(', '),
    };
    if (plan.annualPriceCents == null) return [monthly];
    return [
      monthly,
      {
        '@type': 'Offer',
        name: `Plano ${plan.name} (anual)`,
        price: (plan.annualPriceCents / 100).toFixed(2),
        priceCurrency: 'BRL',
        description: plan.features.join(', '),
      },
    ];
  }),
};
