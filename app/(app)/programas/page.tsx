import { Wallet } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoyaltyProgramCard } from '@/components/loyalty-program-card';
import { EmptyState } from '@/components/empty-state';
import type { LoyaltyProgram, LoyaltyProgramType } from '@/lib/types';

const TYPE_ORDER: LoyaltyProgramType[] = ['banco', 'companhia_aerea', 'hotel', 'coalizao'];

const TYPE_TAB_LABEL: Record<LoyaltyProgramType, string> = {
  banco: 'Bancos/Cartões',
  companhia_aerea: 'Companhias aéreas',
  hotel: 'Hotéis',
  coalizao: 'Coalizão',
};

export default async function ProgramasPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6">
        <EmptyState
          title="Catálogo de programas ainda não disponível"
          description="O catálogo de programas de pontos está sendo configurado. Volte em breve."
          icon={Wallet}
        />
      </div>
    );
  }

  const ctx = await getUserContext();
  const supabase = await createClient();

  // Catálogo de programas e saldo do usuário são independentes — buscar em
  // paralelo em vez de sequencial evita esperar a primeira query terminar
  // pra só então começar a segunda.
  const [{ data: programsData }, { data: userProgramsData }] = await Promise.all([
    supabase.from('loyalty_programs').select('*').eq('active', true).order('name'),
    ctx
      ? supabase.from('user_loyalty_programs').select('program_id, points_balance').eq('user_id', ctx.userId)
      : Promise.resolve({ data: null }),
  ]);

  const programs = (programsData ?? []) as LoyaltyProgram[];

  const balanceByProgram = new Map<string, number>();
  ((userProgramsData ?? []) as { program_id: string; points_balance: number }[]).forEach((ulp) => {
    balanceByProgram.set(ulp.program_id, ulp.points_balance);
  });

  const programsByType = TYPE_ORDER.reduce<Record<LoyaltyProgramType, LoyaltyProgram[]>>(
    (acc, type) => {
      acc[type] = programs.filter((p) => p.type === type);
      return acc;
    },
    { banco: [], companhia_aerea: [], hotel: [], coalizao: [] }
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Programas de pontos e milhas</h1>
        <p className="mt-1 text-muted-foreground">
          Catálogo de programas monitorados pelo clube, com o valor médio do milheiro de cada um.
        </p>
      </div>

      <Tabs defaultValue={TYPE_ORDER[0]}>
        <TabsList>
          {TYPE_ORDER.map((type) => (
            <TabsTrigger key={type} value={type}>
              {TYPE_TAB_LABEL[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {TYPE_ORDER.map((type) => (
          <TabsContent key={type} value={type}>
            {programsByType[type].length === 0 ? (
              <EmptyState
                title={`Nenhum programa cadastrado em ${TYPE_TAB_LABEL[type]}`}
                description="Volte em breve — o catálogo do clube está em expansão."
                icon={Wallet}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {programsByType[type].map((program) => (
                  <LoyaltyProgramCard
                    key={program.id}
                    program={program}
                    userBalance={balanceByProgram.get(program.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
