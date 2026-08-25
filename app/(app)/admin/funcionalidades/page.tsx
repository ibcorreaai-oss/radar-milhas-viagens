import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FeatureFlagRow } from './feature-flag-row';
import type { FeatureFlag } from '@/lib/types';

// Rótulos amigáveis pros keys conhecidos (ver lib/feature-flags.ts pros
// defaults) — uma flag nova ainda aparece com o key cru até ganhar entrada
// aqui, nunca fica escondida da lista.
const FLAG_LABELS: Record<string, string> = {
  worldRadar: 'World Radar (Descobrir)',
  bucketList: 'Bucket List',
  cruiseRadar: 'Cruise Radar',
  experienceRadar: 'Experience Radar',
  tripBuilder: 'Trip Builder',
  worldCalendar: 'World Calendar',
  conciergeAI: 'Concierge IA',
  achievementsPanel: 'Painel de conquistas (dashboard)',
};

export default async function AdminFuncionalidadesPage() {
  // Defesa em profundidade — mesmo padrão de todo page.tsx de /admin/*
  // (o middleware já bloqueia, isto cobre renderização fora dele).
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase.from('feature_flags').select('*').order('key');
  const flags = (data ?? []) as FeatureFlag[];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Funcionalidades</h1>
        <p className="mt-1 text-muted-foreground">
          Ligue ou desligue funcionalidades experimentais do produto. Fecha a pendência antiga de
          só dar pra alternar isso via SQL direto no Supabase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
          <CardDescription>
            Alterações valem para todo mundo imediatamente — sem precisar de deploy novo.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {flags.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Nenhuma feature flag cadastrada.</p>
          ) : (
            flags.map((flag) => (
              <FeatureFlagRow
                key={flag.key}
                flagKey={flag.key}
                label={FLAG_LABELS[flag.key] ?? flag.key}
                description={flag.description}
                initialEnabled={flag.enabled}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
