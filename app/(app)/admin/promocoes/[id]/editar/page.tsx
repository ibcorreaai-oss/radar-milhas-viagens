import { notFound, redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PromotionForm } from '../../promotion-form';
import { updatePromotion } from '../../actions';
import type { Promotion } from '@/lib/types';

export default async function EditarPromocaoPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('promotions').select('*').eq('id', id).maybeSingle();

  if (!data) {
    notFound();
  }

  const promotion = data as Promotion;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar promoção</h1>
        <p className="mt-1 text-muted-foreground">{promotion.title}</p>
      </div>
      <PromotionForm promotion={promotion} action={updatePromotion.bind(null, id)} />
    </div>
  );
}
