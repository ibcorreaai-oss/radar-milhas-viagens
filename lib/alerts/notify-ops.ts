import { sendEmail } from '@/lib/email/send';
import { opsAlertEmail } from '@/lib/email/templates';

export interface OpsAlertParams {
  category: string;
  message: string;
  fields?: Record<string, unknown>;
}

// Alerta operacional pro Igor quando algo crítico acontece: falha de
// pagamento, falha sistêmica de autenticação, erro não tratado em rota
// crítica. Reaproveita o Resend já configurado (lib/email/send.ts) — não
// introduz canal novo nem custo novo. Sem OPS_ALERT_EMAIL configurado, só
// registra um aviso no console e segue — nunca bloqueia quem chamou (ver
// lib/logger.ts, que é o único chamador direto esperado).
export async function notifyOps(params: OpsAlertParams): Promise<void> {
  const to = process.env.OPS_ALERT_EMAIL;
  if (!to) {
    console.warn(
      `[notify-ops] OPS_ALERT_EMAIL não configurado — alerta crítico não enviado (${params.category}): ${params.message}`
    );
    return;
  }

  const template = opsAlertEmail(params);
  const result = await sendEmail(to, template);

  if (result.status === 'failed') {
    console.error(`[notify-ops] falha ao enviar alerta operacional por e-mail: ${result.reason}`);
  }
}
