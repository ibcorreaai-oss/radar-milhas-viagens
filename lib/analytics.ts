// ETAPA 15.1 (ver GROWTH.md) — ponto único de disparo de conversão pra
// toda plataforma de ads configurada (components/analytics-scripts.tsx
// decide QUAIS scripts carregam; isto só chama o que já existir no
// `window` — nenhuma plataforma configurada = função vira no-op silencioso).
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    twq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
  }
}

export type ConversionEvent = 'lead' | 'sign_up' | 'subscribe';

const META_EVENT: Record<ConversionEvent, string> = {
  lead: 'Lead',
  sign_up: 'CompleteRegistration',
  subscribe: 'Subscribe',
};

const TIKTOK_EVENT: Record<ConversionEvent, string> = {
  lead: 'SubmitForm',
  sign_up: 'CompleteRegistration',
  subscribe: 'Subscribe',
};

// Diferente de Meta/TikTok (eventos padrão com nome fixo), o Twitter/X Ads
// não tem "nomes de evento" globais — cada conversão precisa de um "Event
// ID" (formato tw-xxxxx-yyyyy) criado manualmente na conta de anúncios do
// Igor. Achado em revisão adversarial: o código mandava o nome interno do
// ConversionEvent (ex.: "lead") direto pro twq(), um ID que a conta do
// Twitter nunca reconhece — a conversão carregava a pixel/PageView
// corretamente, mas nenhum evento de conversão aparecia no Twitter Ads,
// silenciosamente. Sem o Event ID configurado, o evento correspondente
// simplesmente não dispara (mesmo espírito de "sem pixel configurado = no-op").
const TWITTER_EVENT_ENV: Record<ConversionEvent, string | undefined> = {
  lead: process.env.NEXT_PUBLIC_TWITTER_EVENT_ID_LEAD,
  sign_up: process.env.NEXT_PUBLIC_TWITTER_EVENT_ID_SIGNUP,
  subscribe: process.env.NEXT_PUBLIC_TWITTER_EVENT_ID_SUBSCRIBE,
};

export function trackConversion(event: ConversionEvent, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  try {
    window.gtag?.('event', event, params);
    window.fbq?.('track', META_EVENT[event], params);
    const twitterEventId = TWITTER_EVENT_ENV[event];
    if (twitterEventId) {
      window.twq?.('event', twitterEventId, params);
    }
    window.ttq?.track(TIKTOK_EVENT[event], params);
  } catch (err) {
    // Nunca deixar uma falha de pixel de terceiro quebrar o fluxo real do
    // usuário (cadastro, assinatura) — só avisa no console do browser.
    console.error('trackConversion: falha ao disparar evento', err);
  }
}
