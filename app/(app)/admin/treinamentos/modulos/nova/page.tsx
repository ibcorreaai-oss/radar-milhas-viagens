import { requireAdmin } from '@/lib/admin-guard';
import { ModuleForm } from '../../module-form';
import { createModule } from '../../actions';

export default async function NovoModuloPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireAdmin();
  const { erro } = await searchParams;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo módulo</h1>
        <p className="mt-1 text-muted-foreground">Crie um módulo para organizar aulas do treinamento.</p>
      </div>
      <ModuleForm action={createModule} error={erro} />
    </div>
  );
}
