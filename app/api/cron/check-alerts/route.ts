import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFlightProvider, getHotelProvider } from '@/lib/providers';
import { evaluateOpportunity } from '@/lib/scoring/opportunity-engine';
import { planHasChannel } from '@/lib/plans';
import { sendEmail } from '@/lib/email/send';
import { alertFoundEmail } from '@/lib/email/templates';
import { getWhatsAppProvider } from '@/lib/whatsapp';
import { logger } from '@/lib/logger';
import type { Alert, CabinClass, PlanId } from '@/lib/types';

// Cron: /api/cron/check-alerts — roda 1x/dia, 09h (ver vercel.json). Era de
// hora em hora até a ETAPA 19: o plano Hobby da Vercel só permite cron
// diário (achado só na hora do deploy — "Hobby accounts are limited to
// daily cron jobs"). Rodar mais de 1x/dia exige upgrade pra Pro — decisão
// de custo que fica com o Igor, documentada em MANUAL_ACTIONS.md.
// Percorre alertas ativos vencidos (last_checked_at nulo ou mais antigo que
// check_frequency_hours), busca preços via provider (mock ou real), roda o
// OpportunityEngine e dispara notificações por e-mail/WhatsApp quando o
// alerta bate os critérios do usuário. Nunca deixa um erro em um alerta
// derrubar os demais.

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Sem CRON_SECRET configurado no ambiente, recusa por segurança — nunca
  // roda sem o secret.
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

function passesPriceCriteria(
  alert: Alert,
  result: { cashPrice: number | null; pointsPrice: number | null }
): boolean {
  const hasCashCeiling = alert.max_cash_price != null;
  const hasPointsCeiling = alert.max_points_price != null;

  // Sem teto de preço definido no alerta, não filtra por preço.
  if (!hasCashCeiling && !hasPointsCeiling) return true;

  const cashOk =
    hasCashCeiling && result.cashPrice != null && result.cashPrice <= (alert.max_cash_price as number);
  const pointsOk =
    hasPointsCeiling &&
    result.pointsPrice != null &&
    result.pointsPrice <= (alert.max_points_price as number);

  return Boolean(cashOk || pointsOk);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: activeAlerts, error: alertsError } = await admin
    .from('alerts')
    .select('*')
    .eq('active', true);

  if (alertsError) {
    await logger.critical('cron', 'check-alerts: erro ao buscar alertas ativos', { reason: alertsError.message });
    return NextResponse.json({ error: 'erro ao buscar alertas' }, { status: 500 });
  }

  const now = Date.now();
  const dueAlerts = ((activeAlerts ?? []) as Alert[]).filter((alert) => {
    if (!alert.last_checked_at) return true;
    const lastChecked = new Date(alert.last_checked_at).getTime();
    if (Number.isNaN(lastChecked)) return true;
    const hoursSince = (now - lastChecked) / (1000 * 60 * 60);
    return hoursSince >= (alert.check_frequency_hours || 24);
  });

  let checked = 0;
  let triggered = 0;

  for (const alert of dueAlerts) {
    const nowIso = new Date().toISOString();
    let markedChecked = false;

    try {
      checked += 1;

      // --- Dono do alerta: subscription (plano) + profile (contatos) ---
      const [{ data: subscription }, { data: profile }] = await Promise.all([
        admin.from('subscriptions').select('plan').eq('user_id', alert.user_id).maybeSingle(),
        admin
          .from('profiles')
          .select('email, phone, notify_email, notify_whatsapp')
          .eq('user_id', alert.user_id)
          .maybeSingle(),
      ]);

      const plan = ((subscription?.plan as PlanId | undefined) ?? 'free') as PlanId;

      // --- Transferência: sem provider de busca no MVP, só marca checado ---
      if (alert.type === 'transferencia') {
        await admin.from('alerts').update({ last_checked_at: nowIso }).eq('id', alert.id);
        markedChecked = true;
        continue;
      }

      // --- Busca preços via provider (mock ou real, transparente) ---
      let candidates: Array<{
        cashPrice: number | null;
        pointsPrice: number | null;
        taxes: number;
        loyaltyProgram: string | null;
        stops?: number;
        flexibleDates?: boolean;
      }> = [];

      if (alert.type === 'voo') {
        const provider = getFlightProvider();
        const results = await provider.search({
          origin: alert.origin ?? '',
          destination: alert.destination ?? '',
          departureDate: alert.start_date ?? undefined,
          cabinClass: (alert.cabin_class as CabinClass | null) ?? 'qualquer',
          adults: alert.passengers || 1,
          children: 0,
          infants: 0,
          flexibleDates: alert.flexible_dates,
        });
        candidates = results.map((r) => ({
          cashPrice: r.cashPrice,
          pointsPrice: r.pointsPrice,
          taxes: r.taxes,
          loyaltyProgram: r.loyaltyProgram,
          stops: r.stops,
          flexibleDates: alert.flexible_dates,
        }));
      } else if (alert.type === 'hotel') {
        const provider = getHotelProvider();
        const results = await provider.search({
          city: alert.city ?? '',
          checkin: alert.start_date ?? undefined,
          checkout: alert.end_date ?? undefined,
          guests: alert.passengers || 2,
          rooms: 1,
        });
        candidates = results.map((r) => ({
          cashPrice: r.cashPrice,
          pointsPrice: r.pointsPrice,
          taxes: r.taxes,
          loyaltyProgram: r.loyaltyProgram,
        }));
      }

      // --- Valor médio do milheiro por programa (para o score) ---
      const programNames = Array.from(
        new Set(candidates.map((c) => c.loyaltyProgram).filter((p): p is string => Boolean(p)))
      );
      const mileValueByProgram = new Map<string, number | null>();
      if (programNames.length > 0) {
        const { data: programs } = await admin
          .from('loyalty_programs')
          .select('name, average_mile_value')
          .in('name', programNames);
        for (const p of programs ?? []) {
          mileValueByProgram.set(p.name as string, (p.average_mile_value as number | null) ?? null);
        }
      }

      // --- Roda o OpportunityEngine em cada candidato, pega o melhor score ---
      let best: {
        cashPrice: number | null;
        pointsPrice: number | null;
        taxes: number;
        loyaltyProgram: string | null;
        score: number;
        recommendationText: string;
      } | null = null;

      for (const candidate of candidates) {
        const averageMileValue = candidate.loyaltyProgram
          ? mileValueByProgram.get(candidate.loyaltyProgram) ?? null
          : null;

        const evaluation = evaluateOpportunity({
          cashPrice: candidate.cashPrice,
          pointsPrice: candidate.pointsPrice,
          taxes: candidate.taxes,
          averageMileValue,
          flexibleDates: candidate.flexibleDates,
          stops: candidate.stops,
        });

        if (!best || evaluation.score > best.score) {
          best = {
            cashPrice: candidate.cashPrice,
            pointsPrice: candidate.pointsPrice,
            taxes: candidate.taxes,
            loyaltyProgram: candidate.loyaltyProgram,
            score: evaluation.score,
            recommendationText: evaluation.recommendationText,
          };
        }
      }

      const didTrigger = Boolean(best && best.score >= 60 && passesPriceCriteria(alert, best));

      if (didTrigger && best) {
        const routeOrCity =
          alert.type === 'voo'
            ? `${alert.origin ?? '?'} → ${alert.destination ?? '?'}`
            : alert.city ?? '';

        const detailsUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/alertas`;
        const emailTemplate = alertFoundEmail({
          alertName: alert.name,
          routeOrCity,
          cashPrice: best.cashPrice,
          pointsPrice: best.pointsPrice,
          taxes: best.taxes,
          program: best.loyaltyProgram,
          score: best.score,
          recommendationText: best.recommendationText,
          detailsUrl,
        });

        const whatsappMessage =
          `Radar Milhas & Viagens: encontramos algo para o alerta "${alert.name}" (${routeOrCity}), ` +
          `score ${best.score}/100. ${best.recommendationText} Confira: ${detailsUrl}`;

        const logs: Array<{
          user_id: string;
          alert_id: string;
          channel: 'email' | 'whatsapp';
          message: string;
          status: 'sent' | 'failed' | 'skipped';
          sent_at: string;
        }> = [];

        if (alert.channel_email && planHasChannel(plan, 'email')) {
          if (profile?.email) {
            const result = await sendEmail(profile.email, emailTemplate);
            logs.push({
              user_id: alert.user_id,
              alert_id: alert.id,
              channel: 'email',
              message: emailTemplate.subject,
              status: result.status,
              sent_at: nowIso,
            });
          } else {
            logs.push({
              user_id: alert.user_id,
              alert_id: alert.id,
              channel: 'email',
              message: emailTemplate.subject,
              status: 'skipped',
              sent_at: nowIso,
            });
          }
        }

        if (alert.channel_whatsapp && planHasChannel(plan, 'whatsapp')) {
          if (profile?.phone) {
            const result = await getWhatsAppProvider().sendText(profile.phone, whatsappMessage);
            logs.push({
              user_id: alert.user_id,
              alert_id: alert.id,
              channel: 'whatsapp',
              message: whatsappMessage,
              status: result.status,
              sent_at: nowIso,
            });
          } else {
            logs.push({
              user_id: alert.user_id,
              alert_id: alert.id,
              channel: 'whatsapp',
              message: whatsappMessage,
              status: 'skipped',
              sent_at: nowIso,
            });
          }
        }

        if (logs.length > 0) {
          // Falha de envio em si já é logada na camada de integração
          // (lib/email/send.ts, lib/whatsapp/providers/*) — aqui só cobre o
          // caso de o INSERT em notification_logs falhar.
          const { error: logError } = await admin.from('notification_logs').insert(logs);
          if (logError) {
            logger.error('integration', 'check-alerts: erro ao gravar notification_logs', {
              alertId: alert.id,
              reason: logError.message,
            });
          }
        }

        await admin
          .from('alerts')
          .update({ last_triggered_at: nowIso, last_checked_at: nowIso })
          .eq('id', alert.id);
        markedChecked = true;
        triggered += 1;
      } else {
        await admin.from('alerts').update({ last_checked_at: nowIso }).eq('id', alert.id);
        markedChecked = true;
      }
    } catch (err) {
      logger.error('cron', 'check-alerts: erro ao processar alerta', {
        alertId: alert.id,
        reason: err instanceof Error ? err.message : String(err),
      });
      if (!markedChecked) {
        // Marca como checado mesmo em erro, pra não ficar reprocessando o
        // mesmo alerta quebrado a cada execução do cron.
        await admin
          .from('alerts')
          .update({ last_checked_at: nowIso })
          .eq('id', alert.id)
          .then(
            () => {},
            () => {}
          );
      }
      continue;
    }
  }

  logger.info('cron', 'check-alerts finalizado', { dueCount: dueAlerts.length, checked, triggered });
  return NextResponse.json({ checked, triggered });
}
