import { Resend } from 'resend';

// Cliente Resend — nunca lança erro se a key não existir. Quem chama trata o
// `null` (fallback silencioso, ver lib/email/send.ts).
export function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
