'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { getOrCreateDefaultBucketList } from '@/lib/bucket-list';

export async function saveEventToBucketList(worldEventId: string): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) {
    throw new Error('Faça login para salvar na Bucket List.');
  }

  const supabase = await createClient();
  const bucketListId = await getOrCreateDefaultBucketList(ctx.userId);

  const { error } = await supabase
    .from('bucket_list_items')
    .insert({ bucket_list_id: bucketListId, world_event_id: worldEventId });

  // 23505 = unique_violation — já estava salvo, não é erro do ponto de
  // vista do usuário (o índice único bucket_list_items_unique_event evita
  // duplicata).
  if (error && error.code !== '23505') {
    throw new Error(`Erro ao salvar na Bucket List: ${error.message}`);
  }

  revalidatePath('/descobrir');
  revalidatePath('/bucket-list');
}
