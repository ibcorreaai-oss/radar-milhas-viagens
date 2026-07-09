import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm, type UserProgramRow, type AllProgramOption } from './profile-form';

export default async function PerfilPage() {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const [{ data: userProgramsData }, { data: allProgramsData }] = await Promise.all([
    supabase
      .from('user_loyalty_programs')
      .select('*, loyalty_programs(id, name)')
      .eq('user_id', ctx.userId),
    supabase.from('loyalty_programs').select('id, name').eq('active', true).order('name'),
  ]);

  const userPrograms = (userProgramsData ?? []) as unknown as UserProgramRow[];
  const allPrograms = (allProgramsData ?? []) as AllProgramOption[];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-muted-foreground">
          Dados pessoais, preferências de busca e saldos de pontos.
        </p>
      </div>

      <ProfileForm profile={ctx.profile} userPrograms={userPrograms} allPrograms={allPrograms} />
    </div>
  );
}
