import { createClient } from '@/lib/supabase/server';

export interface AuditLogEntry {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

// Grava em audit_logs (schema já existe desde 0001_schema.sql, mas nunca
// tinha sido escrito por nenhuma action — ver DISASTER_RECOVERY.md §4).
// Uso principal: guardar um snapshot da linha ANTES de excluí-la, pra dar
// pro admin um jeito de saber o que sumiu e recriar manualmente sem
// precisar de um restore de banco inteiro por um único registro apagado
// sem querer.
//
// Nunca deixa a ação principal falhar por causa do log — se o insert do
// log der erro, só reporta no console do server. Uma falha de auditoria
// não pode virar uma indisponibilidade.
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_logs').insert({
    user_id: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    console.error(
      `[audit-log] falha ao registrar ${entry.action} em ${entry.entity}/${entry.entityId}: ${error.message}`
    );
  }
}
