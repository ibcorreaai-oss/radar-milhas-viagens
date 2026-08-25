'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/form-error';
import type { LoyaltyProgram, LoyaltyProgramType } from '@/lib/types';

const TYPE_OPTIONS: { value: LoyaltyProgramType; label: string }[] = [
  { value: 'banco', label: 'Banco' },
  { value: 'companhia_aerea', label: 'Companhia aérea' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'coalizao', label: 'Coalizão' },
];

export function LoyaltyProgramForm({
  program,
  action,
  error,
}: {
  program?: LoyaltyProgram;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [active, setActive] = useState(program?.active ?? true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{program ? 'Editar programa' : 'Novo programa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required maxLength={120} defaultValue={program?.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue={program?.type ?? 'companhia_aerea'}>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <Input id="country" name="country" defaultValue={program?.country ?? 'BR'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="average_mile_value">Valor médio do milheiro (R$)</Label>
              <Input
                id="average_mile_value"
                name="average_mile_value"
                type="number"
                min={0}
                step="0.0001"
                defaultValue={program?.average_mile_value ?? 0}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="transfer_partners">Parceiros de transferência</Label>
            <Textarea
              id="transfer_partners"
              name="transfer_partners"
              rows={2}
              placeholder="Separe por vírgula: Itaú, Bradesco, C6 Bank"
              defaultValue={program?.transfer_partners?.join(', ') ?? ''}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="validity_notes">Notas de validade</Label>
            <Textarea
              id="validity_notes"
              name="validity_notes"
              rows={3}
              defaultValue={program?.validity_notes ?? ''}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas gerais</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={program?.notes ?? ''} />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active" className="cursor-pointer font-normal">
              Programa ativo
            </Label>
          </div>
          {/* Switch é um botão controlado — o hidden input é o que
              efetivamente viaja no FormData, igual ao padrão usado em
              app/(app)/voos/flight-search-form.tsx. */}
          <input type="hidden" name="active" value={active ? 'true' : 'false'} />

          <div className="flex gap-3">
            <Button type="submit">{program ? 'Salvar alterações' : 'Criar programa'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
