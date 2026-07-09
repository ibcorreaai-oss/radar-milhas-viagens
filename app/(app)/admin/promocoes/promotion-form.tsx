'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Promotion, PromotionType, PromotionStatus } from '@/lib/types';

const TYPE_OPTIONS: { value: PromotionType; label: string }[] = [
  { value: 'transferencia_bonificada', label: 'Transferência bonificada' },
  { value: 'compra_pontos', label: 'Compra de pontos' },
  { value: 'passagem', label: 'Passagem' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'pacote', label: 'Pacote' },
  { value: 'clube', label: 'Clube' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'cupom', label: 'Cupom' },
];

const STATUS_OPTIONS: { value: PromotionStatus; label: string }[] = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'futura', label: 'Futura' },
  { value: 'expirada', label: 'Expirada' },
];

export function PromotionForm({
  promotion,
  action,
}: {
  promotion?: Promotion;
  action: (formData: FormData) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{promotion ? 'Editar promoção' : 'Nova promoção'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required maxLength={200} defaultValue={promotion?.title} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue={promotion?.type ?? 'passagem'}>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={promotion?.status ?? 'ativa'}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="program">Programa</Label>
              <Input
                id="program"
                name="program"
                placeholder="Ex.: Livelo, Smiles"
                defaultValue={promotion?.program ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bonus_percentage">Bônus (%)</Label>
              <Input
                id="bonus_percentage"
                name="bonus_percentage"
                type="number"
                min={0}
                step="0.01"
                defaultValue={promotion?.bonus_percentage ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Início</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={promotion?.start_date ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fim</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={promotion?.end_date ?? ''} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rules">Regras</Label>
            <Textarea id="rules" name="rules" rows={4} defaultValue={promotion?.rules ?? ''} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" type="url" placeholder="https://..." defaultValue={promotion?.url ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input id="score" name="score" type="number" min={0} max={100} defaultValue={promotion?.score ?? 0} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit">{promotion ? 'Salvar alterações' : 'Criar promoção'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
