import { getResendClient } from '@/lib/email/resend';
import type { EmailTemplate } from '@/lib/email/templates';

export type SendResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

// Envia e-mail via Resend. Nunca lança exceção — sem credencial ou em caso de
// erro, devolve um status descritivo para quem chamou decidir o que fazer
// (ex: gravar em notification_logs).
export async function sendEmail(to: string, template: EmailTemplate): Promise<SendResult> {
  const resend = getResendClient();
  if (!resend) {
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
      return { status: 'failed', reason: String(error.message ?? error) };
    }

    return { status: 'sent' };
  } catch (err) {
    return { status: 'failed', reason: String(err) };
  }
}
