import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { trialEndingEmail } from '@/lib/email/templates';
import { logger } from '@/lib/logger';

// Cron: /api/cron/check-trials — roda 1x/dia (ver vercel.json). ETAPA 16
// (ver MONETIZATION.md e GROWTH.md #pendência "trial terminando"): agora
// que existe um teste de 5 dias de verdade (0022_trial_period.sql), este
// cron fecha o gap que o GROWTH.md já tinha sinalizado — trialEndingEmail
// existia desde a ETAPA 7 mas nunca tinha gatilho nenhum.
//
// Dedupe via notification_logs (reaproveitado, sem coluna nova): antes de
// mandar, checa se já mandou esse aviso pro mesmo usuário nas últimas 48h
// — protege contra reprocessar o mesmo dia em caso de redeploy/retry do
// Vercel Cron.
export const dynamic = 'force-dynamic';

const TRIAL_ENDING_MESSAGE = 'trial_ending_soon';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: expiringSoon, error } = await admin
    .from('subscriptions')
    .select('user_id, trial_ends_at')
    .eq('status', 'trialing')
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', in24h.toISOString());

  if (error) {
    await logger.critical('cron', 'check-trials: erro ao buscar trials expirando', { reason: error.message });
    return NextResponse.json({ error: 'erro ao buscar trials' }, { status: 500 });
  }

  let notified = 0;

  for (const row of expiringSoon ?? []) {
    const userId = row.user_id as string;
    const trialEndsAt = row.trial_ends_at as string;

    try {
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const { data: alreadySent } = await admin
        .from('notification_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('message', TRIAL_ENDING_MESSAGE)
        .gte('sent_at', twoDaysAgo)
        .maybeSingle();

      if (alreadySent) continue;

      const { data: profile } = await admin
        .from('profiles')
        .select('email')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile?.email) continue;

      const daysLeft = Math.max(1, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const result = await sendEmail(profile.email, trialEndingEmail({ daysLeft }));

      await admin.from('notification_logs').insert({
        user_id: userId,
        alert_id: null,
        channel: 'email',
        message: TRIAL_ENDING_MESSAGE,
        status: result.status,
        sent_at: now.toISOString(),
      });

      if (result.status === 'sent') notified += 1;
    } catch (err) {
      logger.error('cron', 'check-trials: erro ao processar aviso de trial', {
        userId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  logger.info('cron', 'check-trials finalizado', { candidates: (expiringSoon ?? []).length, notified });
  return NextResponse.json({ candidates: (expiringSoon ?? []).length, notified });
}
