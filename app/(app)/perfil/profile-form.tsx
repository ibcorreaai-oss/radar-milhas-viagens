'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { updateProfile, upsertUserLoyaltyProgram, deleteUserLoyaltyProgram } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { Separator } from '@/components/ui/separator';
import { formatPoints } from '@/lib/utils';
import type { CabinClass, Profile } from '@/lib/types';

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: 'economica', label: 'Econômica' },
  { value: 'executiva', label: 'Executiva' },
  { value: 'primeira', label: 'Primeira classe' },
  { value: 'qualquer', label: 'Qualquer classe' },
];

const CURRENCY_OPTIONS = ['BRL', 'USD', 'EUR'];

export interface UserProgramRow {
  id: string;
  program_id: string;
  points_balance: number;
  estimated_cost_per_1000: number | null;
  loyalty_programs: { id: string; name: string } | null;
}

export interface AllProgramOption {
  id: string;
  name: string;
}

interface ProfileFormProps {
  profile: Profile | null;
  userPrograms: UserProgramRow[];
  allPrograms: AllProgramOption[];
}

export function ProfileForm({ profile, userPrograms, allPrograms }: ProfileFormProps) {
  const [flexibleDates, setFlexibleDates] = useState(profile?.flexible_dates ?? false);
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(profile?.notify_whatsapp ?? false);

  const availablePrograms = useMemo(() => {
    const usedIds = new Set(userPrograms.map((p) => p.program_id));
    return allPrograms.filter((p) => !usedIds.has(p.id));
  }, [allPrograms, userPrograms]);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
          <CardDescription>Usamos isso para personalizar buscas e alertas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile?.full_name ?? ''}
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile?.phone ?? ''}
                  placeholder="(00) 00000-0000"
                  maxLength={30}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="home_airport">Aeroporto de origem</Label>
                <Input
                  id="home_airport"
                  name="home_airport"
                  defaultValue={profile?.home_airport ?? ''}
                  placeholder="GRU, FOR, REC..."
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cabin_class_preference">Classe preferida</Label>
                <Select
                  id="cabin_class_preference"
                  name="cabin_class_preference"
                  defaultValue={profile?.cabin_class_preference ?? 'qualquer'}
                >
                  {CABIN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="favorite_destinations">Destinos favoritos</Label>
              <Input
                id="favorite_destinations"
                name="favorite_destinations"
                defaultValue={(profile?.favorite_destinations ?? []).join(', ')}
                placeholder="Lisboa, Nova York, Buenos Aires"
              />
              <p className="text-xs text-muted-foreground">Separe por vírgula.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="monthly_budget">Orçamento mensal para viagens</Label>
                <Input
                  id="monthly_budget"
                  name="monthly_budget"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={profile?.monthly_budget ?? ''}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preferred_currency">Moeda preferida</Label>
                <Select
                  id="preferred_currency"
                  name="preferred_currency"
                  defaultValue={profile?.preferred_currency ?? 'BRL'}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch id="flexible_dates" checked={flexibleDates} onCheckedChange={setFlexibleDates} />
                <Label htmlFor="flexible_dates" className="cursor-pointer font-normal">
                  Tenho datas flexíveis
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="notify_email" checked={notifyEmail} onCheckedChange={setNotifyEmail} />
                <Label htmlFor="notify_email" className="cursor-pointer font-normal">
                  Notificar por e-mail
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="notify_whatsapp" checked={notifyWhatsapp} onCheckedChange={setNotifyWhatsapp} />
                <Label htmlFor="notify_whatsapp" className="cursor-pointer font-normal">
                  Notificar por WhatsApp
                </Label>
              </div>
            </div>

            {/* Switches são botões controlados — os hidden inputs abaixo é
                que viajam de fato no FormData. */}
            <input type="hidden" name="flexible_dates" value={flexibleDates ? 'true' : 'false'} />
            <input type="hidden" name="notify_email" value={notifyEmail ? 'true' : 'false'} />
            <input type="hidden" name="notify_whatsapp" value={notifyWhatsapp ? 'true' : 'false'} />

            <Button type="submit" className="w-full sm:w-auto">
              Salvar alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus programas de pontos</CardTitle>
          <CardDescription>Mantenha seus saldos atualizados para cálculos e alertas mais precisos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {userPrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não cadastrou nenhum programa.</p>
          ) : (
            <ul className="space-y-3">
              {userPrograms.map((up) => (
                <li
                  key={up.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end sm:justify-between"
                >
                  <form action={upsertUserLoyaltyProgram} className="flex flex-1 flex-wrap items-end gap-3">
                    <input type="hidden" name="program_id" value={up.program_id} />
                    <div className="min-w-[10rem]">
                      <p className="text-sm font-medium">{up.loyalty_programs?.name ?? 'Programa'}</p>
                      <p className="text-xs text-muted-foreground">
                        Saldo atual: {formatPoints(up.points_balance)} pts
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`saldo-${up.id}`}>Saldo (pts)</Label>
                      <Input
                        id={`saldo-${up.id}`}
                        name="points_balance"
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={up.points_balance}
                        className="w-36"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`custo-${up.id}`}>Custo por 1000 pts</Label>
                      <Input
                        id={`custo-${up.id}`}
                        name="estimated_cost_per_1000"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={up.estimated_cost_per_1000 ?? ''}
                        className="w-36"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="secondary">
                      Salvar
                    </Button>
                  </form>
                  <form action={deleteUserLoyaltyProgram}>
                    <input type="hidden" name="id" value={up.id} />
                    <ConfirmSubmitButton
                      size="icon"
                      variant="ghost"
                      aria-label="Remover programa"
                      confirmMessage={`Remover "${up.loyalty_programs?.name ?? 'este programa'}" da sua carteira? O saldo cadastrado (${formatPoints(up.points_balance)} pts) some — você pode cadastrar de novo depois.`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </ConfirmSubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <Separator />

          {availablePrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todos os programas do catálogo já estão cadastrados no seu perfil.
            </p>
          ) : (
            <form action={upsertUserLoyaltyProgram} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] space-y-1.5">
                <Label htmlFor="new_program_id">Adicionar programa</Label>
                <Select id="new_program_id" name="program_id" defaultValue="" required>
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {availablePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_points_balance">Saldo (pts)</Label>
                <Input
                  id="new_points_balance"
                  name="points_balance"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={0}
                  className="w-36"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_estimated_cost_per_1000">Custo por 1000 pts</Label>
                <Input
                  id="new_estimated_cost_per_1000"
                  name="estimated_cost_per_1000"
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-36"
                />
              </div>
              <Button type="submit">Adicionar</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
