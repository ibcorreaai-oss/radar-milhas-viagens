import type { UserRole } from '@/lib/types';

// ETAPA 15 (ver PLATFORM_ADMIN.md) — achado em revisão adversarial: o
// predicado "isso conta como admin" estava reescrito à mão em 4 arquivos
// diferentes (middleware.ts, lib/admin-guard.ts, app/(app)/layout.tsx,
// app/(auth)/admin-login/actions.ts) — um deles esquecer de atualizar
// junto (ex.: ao adicionar super_admin) já causou o bug real desta mesma
// etapa (super_admin bloqueado de todo /admin/* existente). Central aqui.
// Recebe o "profile" cru (ou um pedaço dele) em vez de um UserContext
// inteiro — middleware.ts faz sua própria query direta de
// `{role, blocked_at}` sem passar por getUserContext(), então o tipo
// aceito é o menor formato comum aos dois chamadores.
type RoleLike = { role: UserRole | null | undefined } | null | undefined;
type BlockedLike = { blocked_at: string | null | undefined } | null | undefined;

export function isAdminRole(profile: RoleLike): boolean {
  return profile?.role === 'admin' || profile?.role === 'super_admin';
}

// Idem pro predicado "conta suspensa" — usado tanto nos 4 arquivos acima
// (pra barrar /admin) quanto em toda Server Action que exige usuário
// logado E ativo (achado: bloquear alguém só derrubava a UI, não as
// Server Actions — ver PLATFORM_ADMIN.md).
export function isBlocked(profile: BlockedLike): boolean {
  return Boolean(profile?.blocked_at);
}
