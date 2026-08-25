import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// Cron: /api/cron/expire-opportunities — roda 1x por dia (ver vercel.json).
// Remove da vitrine pública as oportunidades já expiradas.

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
  const nowIso = new Date().toISOString();

  try {
    const { data: deleted, error } = await admin
      .from('opportunities')
      .delete()
      .lt('expires_at', nowIso)
      .select('id');

    if (error) {
      logger.error('cron', 'expire-opportunities: erro ao remover oportunidades expiradas', { reason: error.message });
      return NextResponse.json({ error: 'erro ao remover oportunidades expiradas' }, { status: 500 });
    }

    logger.info('cron', 'expire-opportunities finalizado', { deleted: deleted?.length ?? 0 });
    return NextResponse.json({ deleted: deleted?.length ?? 0 });
  } catch (err) {
    logger.error('cron', 'expire-opportunities: erro inesperado', {
      reason: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'erro inesperado' }, { status: 500 });
  }
}
