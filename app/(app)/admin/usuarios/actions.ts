'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireSuperAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit-log';
import { logger } from '@/lib/logger';
import type { UserRole } from '@/lib/types';

// ETAPA 15 (ver PLATFORM_ADMIN.md) — troca de role é RPC security definer
// (supabase/migrations/0011_super_admin_rbac.sql), não update direto: a
// coluna profiles.role nem é grantável a `authenticated` (ver
// 0001_schema.sql), então nenhum caminho client-side além desta função
// alcança essa coluna. A função já valida "só super_admin" e "nunca ficar
// sem nenhum super_admin" — aqui só chama, autentica de novo (defesa em
// profundidade) e grava auditoria.
export async function setUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<{ error?: string }> {
  const ctx = await requireSuperAdmin();

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_user_role', {
    target_user_id: targetUserId,
    new_role: newRole,
  });

  if (error) {
    logger.warn('audit', 'Falha ao alterar role de usuário', {
      adminId: ctx.userId,
      targetUserId,
      newRole,
      reason: error.message,
    });
    return { error: error.message };
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'role_changed',
    entity: 'profiles',
    entityId: targetUserId,
    metadata: { new_role: newRole },
  });

  revalidatePath('/admin/usuarios');
  return {};
}

export async function setUserBlocked(
  targetUserId: string,
  blocked: boolean,
  reason?: string
): Promise<{ error?: string }> {
  const ctx = await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_user_blocked', {
    target_user_id: targetUserId,
    blocked,
    reason: reason?.trim() || null,
  });

  if (error) {
    logger.warn('audit', 'Falha ao bloquear/desbloquear usuário', {
      adminId: ctx.userId,
      targetUserId,
      blocked,
      reason: error.message,
    });
    return { error: error.message };
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: blocked ? 'user_blocked' : 'user_unblocked',
    entity: 'profiles',
    entityId: targetUserId,
    metadata: blocked ? { reason: reason?.trim() || null } : {},
  });

  revalidatePath('/admin/usuarios');
  return {};
}
