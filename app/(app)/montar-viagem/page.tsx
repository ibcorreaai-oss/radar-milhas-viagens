import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getUserContext } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  EXPERIENCE_TAG_LABEL,
  TRIP_PACE_LABEL,
  TRIP_VARIANT_LABEL,
  TRIP_OPTIMIZATION_LABEL,
  type ExperienceTag,
  type TripPace,
  type TripVariant,
  type TripOptimization,
} from '@/lib/types';
import { createTrip } from './actions';

export const metadata: Metadata = {
  title: 'Montar Viagem — AI Trip Builder',
  description: 'Monte um itinerário completo com orçamento estimado por IA.',
};

const INTEREST_OPTIONS = Object.keys(EXPERIENCE_TAG_LABEL) as ExperienceTag[];
const PACE_OPTIONS = Object.keys(TRIP_PACE_LABEL) as TripPace[];
const VARIANT_OPTIONS = Object.keys(TRIP_VARIANT_LABEL) as TripVariant[];
const OPTIMIZATION_OPTIONS = Object.keys(TRIP_OPTIMIZATION_LABEL) as TripOptimization[];

const ELIGIBLE_PLANS = ['pro', 'consultor'];

export default async function MontarViagemPage() {
  const flags = await getFeatureFlags();
  if (!flags.tripBuilder) notFound();

  const ctx = await getUserContext();
  if (!ctx) redirect('/login?next=/montar-viagem');

  if (!ELIGIBLE_PLANS.includes(ctx.plan)) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Trip Builder</h1>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            O Trip Builder está disponível nos planos Pro e Consultor.{' '}
            <a href="/assinatura" className="underline">
              Ver planos
            </a>
            .
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          Montar Viagem
        </h1>
        <p className="mt-1 text-muted-foreground">
          A IA monta um roteiro dia a dia e um orçamento estimado — os valores são sempre estimativas, nunca preços
          reais confirmados.
        </p>
      </div>

      <form action={createTrip} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sobre a viagem</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Nome da viagem</Label>
              <Input id="title" name="title" placeholder="Ex.: Lua de mel em Portugal" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origin">Origem</Label>
              <Input id="origin" name="origin" placeholder="Ex.: São Paulo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destino</Label>
              <Input id="destination" name="destination" placeholder="Ex.: Lisboa, Portugal" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Data de ida (opcional)</Label>
              <Input id="start_date" name="start_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Data de volta (opcional)</Label>
              <Input id="end_date" name="end_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nights">Noites (se não informar datas exatas)</Label>
              <Input id="nights" name="nights" type="number" min={1} max={60} defaultValue={5} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget_total">Orçamento total (opcional, R$)</Label>
              <Input id="budget_total" name="budget_total" type="number" min={0} step="0.01" placeholder="Ex.: 8000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="travelers_adults">Adultos</Label>
              <Input id="travelers_adults" name="travelers_adults" type="number" min={1} max={20} defaultValue={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="travelers_children">Crianças</Label>
              <Input id="travelers_children" name="travelers_children" type="number" min={0} max={20} defaultValue={0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pace">Ritmo</Label>
                <Select id="pace" name="pace" defaultValue="moderado">
                  {PACE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {TRIP_PACE_LABEL[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="variant">Variante</Label>
                <Select id="variant" name="variant" defaultValue="balanced">
                  {VARIANT_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {TRIP_VARIANT_LABEL[v]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Interesses</Label>
              <div className="flex flex-wrap gap-3">
                {INTEREST_OPTIONS.map((tag) => (
                  <label key={tag} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="interests" value={tag} className="h-4 w-4 rounded border-input" />
                    {EXPERIENCE_TAG_LABEL[tag]}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Prioridades de otimização</Label>
              <div className="flex flex-wrap gap-3">
                {OPTIMIZATION_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" name="optimizations" value={opt} className="h-4 w-4 rounded border-input" />
                    {TRIP_OPTIMIZATION_LABEL[opt]}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full">
          <Sparkles className="h-4 w-4" />
          Gerar itinerário
        </Button>
      </form>
    </div>
  );
}
