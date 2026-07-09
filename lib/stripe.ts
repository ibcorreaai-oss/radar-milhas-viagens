import Stripe from 'stripe';

// Cliente Stripe compartilhado — server-side only (nunca importar em código
// que roda no browser). Se STRIPE_SECRET_KEY não estiver configurada, o
// client é criado com uma chave placeholder: o SDK do Stripe lança erro na
// construção se receber string vazia, então isso evita quebrar o build/import
// (ex: `next build` "collecting page data" nas rotas que importam este
// módulo). Só falha em runtime se algo de fato chamar a API sem credencial
// real configurada (aceitável no MVP — as actions que usam isso já tratam a
// ausência de config antes de chegar aqui).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_not_configured');
