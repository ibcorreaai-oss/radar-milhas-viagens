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

export function trackConversion(event: ConversionEvent, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  try {
    window.gtag?.('event', event, params);
    window.fbq?.('track', META_EVENT[event], params);
    window.twq?.('event', event, params);
    window.ttq?.track(TIKTOK_EVENT[event], params);
  } catch (err) {
    // Nunca deixar uma falha de pixel de terceiro quebrar o fluxo real do
    // usuário (cadastro, assinatura) — só avisa no console do browser.
    console.error('trackConversion: falha ao disparar evento', err);
  }
}
