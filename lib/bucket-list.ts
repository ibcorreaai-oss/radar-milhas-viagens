import { createClient } from '@/lib/supabase/server';

// Bucket list padrão do usuário — criada sob demanda no primeiro "salvar"
// ou na primeira visita a /bucket-list. Um usuário tem uma única lista
// nesta fase (schema já suporta múltiplas via `unique(user_id, name)`,
// mas a UI ainda não expõe criar listas nomeadas — fica para fase futura).
export async function getOrCreateDefaultBucketList(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('bucket_lists')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Minha Bucket List')
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from('bucket_lists')
    .insert({ user_id: userId, name: 'Minha Bucket List' })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Erro ao criar Bucket List: ${error?.message ?? 'desconhecido'}`);
  }

  return created.id as string;
}
