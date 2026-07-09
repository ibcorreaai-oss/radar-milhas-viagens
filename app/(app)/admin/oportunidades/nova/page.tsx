import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { OpportunityForm } from '../opportunity-form';
import { createOpportunity } from '../actions';

export default async function NovaOportunidadePage() {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova oportunidade</h1>
        <p className="mt-1 text-muted-foreground">Cadastre uma oportunidade manualmente para a vitrine.</p>
      </div>
      <OpportunityForm action={createOpportunity} />
    </div>
  );
}
