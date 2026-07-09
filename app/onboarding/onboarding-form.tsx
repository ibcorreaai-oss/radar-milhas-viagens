'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { CabinClass, LoyaltyProgram, Profile, UserLoyaltyProgram } from '@/lib/types';
import { completeOnboarding, type OnboardingState } from './actions';

const CABIN_CLASS_LABEL: Record<CabinClass, string> = {
  economica: 'Econômica',
  executiva: 'Executiva',
  primeira: 'Primeira classe',
  qualquer: 'Qualquer',
};

const PROGRAM_TYPE_LABEL: Record<LoyaltyProgram['type'], string> = {
  banco: 'Banco/Cartão',
  companhia_aerea: 'Companhia aérea',
  hotel: 'Hotel',
  coalizao: 'Coalizão',
};

const initialState: OnboardingState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'Salvando...' : 'Concluir e ir para o dashboard'}
    </Button>
  );
}

export function OnboardingForm({
  profile,
  programs,
  userPrograms,
}: {
  profile: Profile | null;
  programs: LoyaltyProgram[];
  userPrograms: UserLoyaltyProgram[];
}) {
  const [state, formAction] = useActionState(completeOnboarding, initialState);

  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(
    () => new Set(userPrograms.map((up) => up.program_id))
  );
  const [flexibleDates, setFlexibleDates] = useState(profile?.flexible_dates ?? false);
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(profile?.notify_whatsapp ?? false);

  const balanceByProgram = Object.fromEntries(
    userPrograms.map((up) => [up.program_id, up.points_balance])
  );

  function toggleProgram(id: string) {
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="flexible_dates" value={flexibleDates ? 'true' : 'false'} />
      <input type="hidden" name="notify_email" value={notifyEmail ? 'true' : 'false'} />
      <input type="hidden" name="notify_whatsapp" value={notifyWhatsapp ? 'true' : 'false'} />
      {Array.from(selectedPrograms).map((id) => (
        <input key={id} type="hidden" name="programs" value={id} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">De onde você viaja</CardTitle>
          <CardDescription>Usamos isso para priorizar os alertas de voo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="home_airport">Cidade ou aeroporto de origem</Label>
            <Input
              id="home_airport"
              name="home_airport"
              placeholder="Ex: Fortaleza (FOR) ou GRU"
              defaultValue={profile?.home_airport ?? ''}
              required
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="favorite_destinations">Destinos favoritos</Label>
            <Input
              id="favorite_destinations"
              name="favorite_destinations"
              placeholder="Ex: Lisboa, Nova York, Buenos Aires"
              defaultValue={profile?.favorite_destinations?.join(', ') ?? ''}
            />
            <p className="text-xs text-muted-foreground">Separe os destinos por vírgula.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seus programas de pontos</CardTitle>
          <CardDescription>
            Marque os programas que você usa e, se souber, o saldo aproximado. Dá pra ajustar
            depois no seu perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {programs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum programa cadastrado ainda — você pode adicionar depois no seu perfil.
            </p>
          )}
          {programs.map((program) => {
            const checked = selectedPrograms.has(program.id);
            return (
              <div
                key={program.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={checked}
                    onCheckedChange={() => toggleProgram(program.id)}
                    id={`program-${program.id}`}
                  />
                  <div>
                    <Label htmlFor={`program-${program.id}`} className="cursor-pointer">
                      {program.name}
                    </Label>
                    <div className="mt-1">
                      <Badge variant="outline">{PROGRAM_TYPE_LABEL[program.type]}</Badge>
                    </div>
                  </div>
                </div>
                {checked && (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    name={`balance_${program.id}`}
                    placeholder="Saldo aproximado"
                    defaultValue={balanceByProgram[program.id] ?? ''}
                    className="sm:w-44"
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferências de viagem</CardTitle>
          <CardDescription>Ajustam a nota e a recomendação dos alertas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cabin_class_preference">Classe preferida</Label>
            <Select
              id="cabin_class_preference"
              name="cabin_class_preference"
              defaultValue={profile?.cabin_class_preference ?? 'qualquer'}
            >
              {(Object.keys(CABIN_CLASS_LABEL) as CabinClass[]).map((value) => (
                <option key={value} value={value}>
                  {CABIN_CLASS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="flexible_dates_switch">Datas flexíveis</Label>
              <p className="text-xs text-muted-foreground">
                Aceito ver oportunidades em datas próximas às que eu buscar.
              </p>
            </div>
            <Switch
              id="flexible_dates_switch"
              checked={flexibleDates}
              onCheckedChange={setFlexibleDates}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="monthly_budget">Orçamento mensal para viagens (R$)</Label>
            <Input
              id="monthly_budget"
              name="monthly_budget"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ex: 800"
              defaultValue={profile?.monthly_budget ?? ''}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como você quer ser avisado</CardTitle>
          <CardDescription>Você pode mudar isso a qualquer momento no seu perfil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify_email_switch">Alertas por e-mail</Label>
              <p className="text-xs text-muted-foreground">
                Avisamos quando encontrarmos uma oportunidade que bate com o seu perfil.
              </p>
            </div>
            <Switch
              id="notify_email_switch"
              checked={notifyEmail}
              onCheckedChange={setNotifyEmail}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify_whatsapp_switch">Alertas por WhatsApp</Label>
              <p className="text-xs text-muted-foreground">
                Disponível nos planos Pro e Consultor/Agência.
              </p>
            </div>
            <Switch
              id="notify_whatsapp_switch"
              checked={notifyWhatsapp}
              onCheckedChange={setNotifyWhatsapp}
            />
          </div>

          {notifyWhatsapp && (
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+55 11 91234-5678"
                defaultValue={profile?.phone ?? ''}
                required={notifyWhatsapp}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
