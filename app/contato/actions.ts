'use server';

import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { contactSchema } from '@/lib/validation/contact-schema';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/send';
import { contactMessageEmail } from '@/lib/email/templates';

export interface ContactState {
  error?: string;
  success?: string;
}

export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: campo invisível pra humano, só bot preenche. Ver contact-form.tsx.
  if (String(formData.get('website') || '').trim()) {
    logger.info('system', 'Mensagem de contato descartada — honeypot preenchido');
    return { success: 'Mensagem enviada! Vamos responder o quanto antes.' };
  }

  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Verifique os campos e tente novamente.' };
  }

  if (!isSupabaseConfigured()) {
    logger.error('integration', 'Contato: Supabase não configurado, mensagem não pôde ser salva');
    return { error: 'Não foi possível enviar sua mensagem agora. Tente novamente em instantes.' };
  }

  const { name, email, subject, message } = parsed.data;
  const supabase = await createClient();

  // ETAPA 19 (auditoria de segurança pré-deploy) — rate limit real, não só
  // honeypot: endpoint público sem autenticação, scriptável. Mesmo padrão
  // do chat público (RPC atômica, migration 0023) — 5 mensagens/dia por
  // e-mail. Falha "aberta" (loga e segue) se a RPC der erro, pra nunca
  // travar um envio legítimo por causa de um problema de infraestrutura.
  //
  // Achado em /code-review (revisão geral 27/08): esta RPC tinha EXECUTE
  // liberado pra anon/authenticated via PostgREST — qualquer um com a anon
  // key (pública) podia chamar /rest/v1/rpc/increment_contact_message_count
  // direto, com QUALQUER e-mail, sem passar por este formulário (DoS barato
  // contra e-mail de terceiro). Primeira tentativa de fechar isso quebrou o
  // formulário real (SUPABASE_SERVICE_ROLE_KEY não estava configurada —
  // revertido na hora, ver histórico do git). Reaplicado em 27/08 depois de
  // configurar a chave na Vercel e confirmar ao vivo que
  // createAdminClient() funciona (migration 0042 revoga o EXECUTE público
  // de novo).
  const { data: countToday, error: rateLimitError } = await createAdminClient().rpc(
    'increment_contact_message_count',
    { target_email: email }
  );
  if (rateLimitError) {
    logger.error('integration', 'Contato: falha ao checar rate limit', { reason: rateLimitError.message });
  } else if (typeof countToday === 'number' && countToday > 5) {
    logger.warn('system', 'Contato: rate limit atingido', { email });
    return { error: 'Muitas mensagens enviadas hoje. Tente novamente amanhã ou fale pelo WhatsApp.' };
  }

  // E-mail primeiro, e o status resultante já entra no insert: a policy de
  // INSERT de contact_messages permite qualquer um escrever, mas só admin
  // pode ler (ver 0006_contact_messages.sql) — em Postgres, INSERT...RETURNING
  // é checado contra a policy de SELECT, não a de INSERT, então pedir
  // `.select()` de volta aqui quebraria com "row-level security policy"
  // mesmo com o insert em si permitido. Por isso: nada de RETURNING, e o
  // status de e-mail vai direto na linha em vez de um UPDATE separado
  // depois (que também não teria policy de UPDATE pra encontrar a linha).
  const adminEmail = process.env.OPS_ALERT_EMAIL;
  let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
  if (adminEmail) {
    const result = await sendEmail(adminEmail, contactMessageEmail({ name, email, subject, message }));
    emailStatus = result.status === 'sent' ? 'sent' : result.status === 'skipped' ? 'skipped' : 'failed';
  } else {
    logger.warn('integration', 'Contato: OPS_ALERT_EMAIL não configurado — mensagem só fica salva, sem notificação');
  }

  const { error: insertError } = await supabase
    .from('contact_messages')
    .insert({ name, email, subject, message, email_status: emailStatus });

  if (insertError) {
    logger.error('integration', 'Falha ao salvar mensagem de contato', { reason: insertError.message });
    return { error: 'Não foi possível enviar sua mensagem agora. Tente novamente em instantes.' };
  }

  logger.info('system', 'Mensagem de contato recebida', { email, subject });
  return { success: 'Mensagem enviada! Vamos responder o quanto antes.' };
}
