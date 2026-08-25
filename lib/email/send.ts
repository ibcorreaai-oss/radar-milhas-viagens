import { getResendClient } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import type { EmailTemplate } from '@/lib/email/templates';

export type SendResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

// Envia e-mail via Resend. Nunca lança exceção — sem credencial ou em caso de
// erro, devolve um status descritivo para quem chamou decidir o que fazer
// (ex: gravar em notification_logs) — e também loga aqui, no limite da
// integração, pra nenhum caller precisar lembrar de logar falha de envio.
export async function sendEmail(to: string, template: EmailTemplate): Promise<SendResult> {
  const resend = getResendClient();
  if (!resend) {
    logger.warn('integration', 'Envio de e-mail pulado — RESEND_API_KEY não configurada', {
      subject: template.subject,
    });
    return { status: 'skipped', reason: 'RESEND_API_KEY não configurada' };
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Radar Milhas <alertas@radarmilhas.com>',
      to,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      const reason = String(error.message ?? error);
      logger.error('integration', 'Falha ao enviar e-mail via Resend', { subject: template.subject, reason });
      return { status: 'failed', reason };
    }

    logger.info('integration', 'E-mail enviado via Resend', { subject: template.subject });
    return { status: 'sent' };
  } catch (err) {
    const reason = String(err);
    logger.error('integration', 'Exceção ao enviar e-mail via Resend', { subject: template.subject, reason });
    return { status: 'failed', reason };
  }
}
