'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { getOrCreateDefaultBucketList } from '@/lib/bucket-list';

export async function addCustomBucketListItem(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) throw new Error('Faça login para usar a Bucket List.');

  const title = String(formData.get('custom_title') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim() || null;
  if (!title) throw new Error('Título é obrigatório.');

  const supabase = await createClient();
  const bucketListId = await getOrCreateDefaultBucketList(ctx.userId);

  const { error } = await supabase
    .from('bucket_list_items')
    .insert({ bucket_list_id: bucketListId, custom_title: title, notes });

  if (error) {
    throw new Error(`Erro ao adicionar item: ${error.message}`);
  }

  revalidatePath('/bucket-list');
}

export async function removeBucketListItem(itemId: string): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) throw new Error('Faça login para usar a Bucket List.');

  const supabase = await createClient();
  // RLS já garante que só o dono da lista consegue apagar — a policy
  // "bucket_list_items: owner via list" filtra por bucket_lists.user_id.
  const { error } = await supabase.from('bucket_list_items').delete().eq('id', itemId);

  if (error) {
    throw new Error(`Erro ao remover item: ${error.message}`);
  }

  revalidatePath('/bucket-list');
}
