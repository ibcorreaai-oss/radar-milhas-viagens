import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { LoyaltyProgramForm } from '../loyalty-program-form';
import { createLoyaltyProgram } from '../actions';

export default async function NovoProgramaPage() {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo programa</h1>
        <p className="mt-1 text-muted-foreground">Cadastre um programa de fidelidade no catálogo.</p>
      </div>
      <LoyaltyProgramForm action={createLoyaltyProgram} />
    </div>
  );
}
