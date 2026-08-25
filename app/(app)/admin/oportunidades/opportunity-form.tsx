'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FormError } from '@/components/form-error';
import type { Opportunity, OpportunityType } from '@/lib/types';

const TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'voo', label: 'Voo' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'pacote', label: 'Pacote' },
];

// Converte um ISO timestamptz vindo do banco para o formato que
// <input type="datetime-local"> aceita como defaultValue.
function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OpportunityForm({
  opportunity,
  action,
  error,
}: {
  opportunity?: Opportunity;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [featured, setFeatured] = useState(opportunity?.featured ?? false);
  // Controlado à parte do <input type="datetime-local"> (que não tem
  // timezone embutido) para converter pra ISO/UTC no horário local do
  // navegador do admin antes de submeter — senão o Postgres interpreta a
  // string "YYYY-MM-DDTHH:mm" como UTC, adiantando/atrasando a expiração.
  const [expiresAtLocal, setExpiresAtLocal] = useState(toDatetimeLocalValue(opportunity?.expires_at));
  const expiresAtIso = expiresAtLocal ? new Date(expiresAtLocal).toISOString() : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{opportunity ? 'Editar oportunidade' : 'Nova oportunidade'}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required maxLength={200} defaultValue={opportunity?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue={opportunity?.type ?? 'voo'}>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={opportunity?.description ?? ''} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="origin">Origem</Label>
              <Input id="origin" name="origin" placeholder="GRU" defaultValue={opportunity?.origin ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destino</Label>
              <Input id="destination" name="destination" placeholder="LIS" defaultValue={opportunity?.destination ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" placeholder="Lisboa" defaultValue={opportunity?.city ?? ''} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cash_price">Preço em dinheiro (R$)</Label>
              <Input
                id="cash_price"
                name="cash_price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={opportunity?.cash_price ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="points_price">Preço em pontos</Label>
              <Input
                id="points_price"
                name="points_price"
                type="number"
                min={0}
                step="1"
                defaultValue={opportunity?.points_price ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxes">Taxas (R$)</Label>
              <Input
                id="taxes"
                name="taxes"
                type="number"
                min={0}
                step="0.01"
                defaultValue={opportunity?.taxes ?? 0}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="loyalty_program">Programa de fidelidade</Label>
              <Input
                id="loyalty_program"
                name="loyalty_program"
                placeholder="Ex.: Smiles"
                defaultValue={opportunity?.loyalty_program ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input id="score" name="score" type="number" min={0} max={100} defaultValue={opportunity?.score ?? 0} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recommendation">Recomendação</Label>
            <Textarea id="recommendation" name="recommendation" rows={2} defaultValue={opportunity?.recommendation ?? ''} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="expires_at">Expira em</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={expiresAtLocal}
                onChange={(e) => setExpiresAtLocal(e.target.value)}
              />
              <input type="hidden" name="expires_at" value={expiresAtIso} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Origem do dado</Label>
              <Input id="source" name="source" defaultValue={opportunity?.source ?? 'manual'} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
            <Label htmlFor="featured" className="cursor-pointer font-normal">
              Destacar na vitrine
            </Label>
          </div>
          <input type="hidden" name="featured" value={featured ? 'true' : 'false'} />

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="affiliate_url">URL de afiliado</Label>
              <Input
                id="affiliate_url"
                name="affiliate_url"
                type="url"
                placeholder="https://..."
                defaultValue={opportunity?.affiliate_url ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="affiliate_provider">Provedor de afiliado</Label>
              <Input id="affiliate_provider" name="affiliate_provider" defaultValue={opportunity?.affiliate_provider ?? ''} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="commission_type">Tipo de comissão</Label>
              <Input id="commission_type" name="commission_type" defaultValue={opportunity?.commission_type ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking_id">Tracking ID</Label>
              <Input id="tracking_id" name="tracking_id" defaultValue={opportunity?.tracking_id ?? ''} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit">{opportunity ? 'Salvar alterações' : 'Criar oportunidade'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
