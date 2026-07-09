import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Cron: /api/cron/refresh-promotions — roda 1x por dia (ver vercel.json).
// Atualiza o status de promoções conforme a data: expira as vencidas,
// ativa as que entraram no período de vigência.

export const dynamic = 'force-dynamic';

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
  const today = new Date().toISOString().slice(0, 10);

  let expiredCount = 0;
  let activatedCount = 0;

  try {
    const { data: expired, error: expireError } = await admin
      .from('promotions')
      .update({ status: 'expirada' })
      .lt('end_date', today)
      .neq('status', 'expirada')
      .select('id');

    if (expireError) {
      console.error('[cron/refresh-promotions] erro ao expirar promoções:', expireError);
    } else {
      expiredCount = expired?.length ?? 0;
    }
  } catch (err) {
    console.error('[cron/refresh-promotions] erro inesperado ao expirar promoções:', err);
  }

  try {
    // end_date é opcional (promoção sem data de fim definida) — se usasse só
    // .gte('end_date', today), uma linha com end_date NULL nunca bateria a
    // condição (NULL >= X é NULL, não true, em SQL) e ficaria presa em
    // "futura" pra sempre mesmo depois do start_date passar.
    const { data: activated, error: activateError } = await admin
      .from('promotions')
      .update({ status: 'ativa' })
      .eq('status', 'futura')
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .select('id');

    if (activateError) {
      console.error('[cron/refresh-promotions] erro ao ativar promoções:', activateError);
    } else {
      activatedCount = activated?.length ?? 0;
    }
  } catch (err) {
    console.error('[cron/refresh-promotions] erro inesperado ao ativar promoções:', err);
  }

  return NextResponse.json({ expired: expiredCount, activated: activatedCount });
}
