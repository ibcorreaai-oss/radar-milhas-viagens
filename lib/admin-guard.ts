import { redirect } from 'next/navigation';
import { getUserContext, type UserContext } from '@/lib/auth';
import { isAdminRole, isBlocked } from '@/lib/roles';

// Toda Server Action da área /admin deve chamar isto ANTES de tocar no
// banco — as páginas admin já checam role no server component, mas uma
// Server Action pode ser invocada diretamente (fetch ao endpoint da action)
// sem passar pela renderização da página, então precisa da própria
// checagem. Isso é defesa em profundidade em cima da RLS (que já restringe
// insert/update/delete de promotions/loyalty_programs/opportunities a
// public.is_admin()) — não é a única barreira, mas fecha o gap de nunca
// depender só de uma policy de banco para autorização de escrita.
//
// ETAPA 15 (achado em revisão adversarial): checar só `role` deixava uma
// sessão já aberta de um admin recém-bloqueado continuar chamando
// QUALQUER Server Action de /admin/* — bloquear alguém só derrubava a
// renderização (app/(app)/layout.tsx), não estas checagens. `is_admin()`
// no banco também passou a exigir `blocked_at is null`
// (0012_blocked_account_enforcement.sql) — isto é a camada de app,
// aquela é a de banco, nenhuma das duas sozinha bastava.
export async function requireAdmin(): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx || !isAdminRole(ctx.profile) || isBlocked(ctx.profile)) {
    redirect('/dashboard');
  }
  return ctx;
}

// Pro punhado de ações que só o Administrador Principal pode fazer
// (gerenciar role de outro usuário, bloquear outro admin): gestão de
// conteúdo comum (promoções, eventos etc.) continua bastando requireAdmin().
export async function requireSuperAdmin(): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx || ctx.profile?.role !== 'super_admin' || isBlocked(ctx.profile)) {
    redirect('/dashboard');
  }
  return ctx;
}
