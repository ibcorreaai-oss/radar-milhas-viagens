import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Endpoint de healthcheck pra monitoramento de uptime externo (UptimeRobot,
// Better Uptime, etc. — ver OBSERVABILITY.md §Uptime). Público de propósito
// (sem CRON_SECRET): um monitor de uptime precisa bater aqui sem credencial.
// Nunca devolve detalhe de erro no corpo da resposta — só ok/degraded por
// checagem; o motivo detalhado vai só pro log estruturado do servidor.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, 'ok' | 'skipped' | 'error'> = {};
  let healthy = true;

  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!supabaseConfigured) {
    checks.database = 'skipped';
  } else {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const { error } = await admin.from('loyalty_programs').select('id', { count: 'exact', head: true });

      if (error) {
        checks.database = 'error';
        healthy = false;
        logger.error('system', 'Health check: falha ao consultar banco', { reason: error.message });
      } else {
        checks.database = 'ok';
      }
    } catch (err) {
      checks.database = 'error';
      healthy = false;
      logger.error('system', 'Health check: exceção ao consultar banco', {
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
