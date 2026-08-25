import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { PromotionForm } from '../promotion-form';
import { createPromotion } from '../actions';

export default async function NovaPromocaoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }
  const { erro } = await searchParams;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova promoção</h1>
        <p className="mt-1 text-muted-foreground">Cadastre uma nova promoção para a vitrine do clube.</p>
      </div>
      <PromotionForm action={createPromotion} error={erro} />
    </div>
  );
}
