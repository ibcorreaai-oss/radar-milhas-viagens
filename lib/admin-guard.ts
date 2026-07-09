import { redirect } from 'next/navigation';
import { getUserContext, type UserContext } from '@/lib/auth';

// Toda Server Action da área /admin deve chamar isto ANTES de tocar no
// banco — as páginas admin já checam role no server component, mas uma
// Server Action pode ser invocada diretamente (fetch ao endpoint da action)
// sem passar pela renderização da página, então precisa da própria
// checagem. Isso é defesa em profundidade em cima da RLS (que já restringe
// insert/update/delete de promotions/loyalty_programs/opportunities a
// public.is_admin()) — não é a única barreira, mas fecha o gap de nunca
// depender só de uma policy de banco para autorização de escrita.
export async function requireAdmin(): Promise<UserContext> {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }
  return ctx;
}
