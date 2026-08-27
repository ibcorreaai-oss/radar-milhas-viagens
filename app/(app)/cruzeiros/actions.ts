'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { getOrCreateDefaultBucketList } from '@/lib/bucket-list';

export async function saveCruiseToBucketList(cruiseId: string): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) {
    throw new Error('Faça login para salvar na Bucket List.');
  }

  const supabase = await createClient();
  const bucketListId = await getOrCreateDefaultBucketList(ctx.userId);

  const { error } = await supabase.from('bucket_list_items').insert({ bucket_list_id: bucketListId, cruise_id: cruiseId });

  // 23505 = unique_violation — já estava salvo, não é erro do ponto de
  // vista do usuário (índice único bucket_list_items_unique_cruise evita duplicata).
  if (error && error.code !== '23505') {
    throw new Error(`Erro ao salvar na Bucket List: ${error.message}`);
  }

  revalidatePath('/cruzeiros');
  revalidatePath('/bucket-list');
}
