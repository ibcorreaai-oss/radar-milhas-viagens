import { sendEmail } from '@/lib/email/send';
import { opsAlertEmail } from '@/lib/email/templates';

export interface OpsAlertParams {
  category: string;
  message: string;
  fields?: Record<string, unknown>;
}

// Nome do header de autenticação do webhook n8n — não é segredo (só o
// VALUE em N8N_ALERT_WEBHOOK_SECRET é), por isso fica fixo no código em vez
// de env var. Precisa bater exatamente com a credencial "Radar Milhas &
// Viagens - Webhook Auth" configurada no workflow do n8n (ver
// AUTOMATIONS.md).
const N8N_ALERT_HEADER_NAME = 'X-Radar-Milhas-Secret';

// ETAPA 17 (ver AUTOMATIONS.md) — segundo canal de alerta crítico, via
// webhook n8n → Telegram. Mesmo padrão já usado pelo Igor em outros apps
// (ErgoFácil, Auditoria Cívica): um workflow n8n com autenticação por
// header que só encaminha pro Telegram dele. Roda em paralelo ao e-mail,
// nunca lança — uma falha aqui não pode derrubar quem chamou nem impedir o
// outro canal de tentar. Timeout curto (5s) porque isto roda dentro de
// Server Actions/Route Handlers que não podem ficar pendurados esperando
// uma automação externa responder.
async function notifyOpsViaN8n(params: OpsAlertParams): Promise<void> {
  const url = process.env.N8N_ALERT_WEBHOOK_URL;
  const secret = process.env.N8N_ALERT_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.warn(
      `[notify-ops] N8N_ALERT_WEBHOOK_URL/N8N_ALERT_WEBHOOK_SECRET não configurados — alerta não enviado via Telegram (${params.category}): ${params.message}`
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [N8N_ALERT_HEADER_NAME]: secret,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[notify-ops] webhook n8n respondeu ${response.status} — alerta pode não ter chegado no Telegram`);
    }
  } catch (err) {
    console.error(`[notify-ops] falha ao chamar webhook n8n: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Alerta operacional pro Igor quando algo crítico acontece: falha de
// pagamento, falha sistêmica de autenticação, erro não tratado em rota
// crítica. Reaproveita o Resend já configurado (lib/email/send.ts) — não
// introduz canal novo nem custo novo. Sem OPS_ALERT_EMAIL configurado, só
// registra um aviso no console e segue — nunca bloqueia quem chamou (ver
// lib/logger.ts, que é o único chamador direto esperado).
async function notifyOpsViaEmail(params: OpsAlertParams): Promise<void> {
  const to = process.env.OPS_ALERT_EMAIL;
  if (!to) {
    console.warn(
      `[notify-ops] OPS_ALERT_EMAIL não configurado — alerta crítico não enviado por e-mail (${params.category}): ${params.message}`
    );
    return;
  }

  const template = opsAlertEmail(params);
  const result = await sendEmail(to, template);

  if (result.status === 'failed') {
    console.error(`[notify-ops] falha ao enviar alerta operacional por e-mail: ${result.reason}`);
  }
}

// Os dois canais rodam em paralelo e são independentes (Promise.allSettled
// — um falhar nunca impede o outro nem propaga erro pra quem chamou).
// Hoje (26/08) RESEND_API_KEY ainda não está configurado neste projeto, então
// o Telegram é, na prática, o único canal que realmente avisa alguém.
export async function notifyOps(params: OpsAlertParams): Promise<void> {
  await Promise.allSettled([notifyOpsViaEmail(params), notifyOpsViaN8n(params)]);
}
