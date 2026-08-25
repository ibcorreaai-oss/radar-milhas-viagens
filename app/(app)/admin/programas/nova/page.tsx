import { requireAdmin } from '@/lib/admin-guard';
import { LoyaltyProgramForm } from '../loyalty-program-form';
import { createLoyaltyProgram } from '../actions';

export default async function NovoProgramaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireAdmin();
  const { erro } = await searchParams;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo programa</h1>
        <p className="mt-1 text-muted-foreground">Cadastre um programa de fidelidade no catálogo.</p>
      </div>
      <LoyaltyProgramForm action={createLoyaltyProgram} error={erro} />
    </div>
  );
}
