'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createAlert } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { planHasChannel } from '@/lib/plans';
import type { AlertType, CabinClass, PlanId } from '@/lib/types';

const TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: 'voo', label: 'Voo' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transferencia', label: 'Transferência bonificada' },
];

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: 'economica', label: 'Econômica' },
  { value: 'executiva', label: 'Executiva' },
  { value: 'primeira', label: 'Primeira classe' },
  { value: 'qualquer', label: 'Qualquer classe' },
];

// Textos que mudam conforme o tipo de alerta escolhido — o schema não tem
// uma tabela separada para "transferência bonificada": ela usa o mesmo
// `type: 'transferencia'`, com `loyalty_program` guardando o programa de
// origem e `max_points_price` guardando o % mínimo de bônus desejado.
const NAME_PLACEHOLDER: Record<AlertType, string> = {
  voo: 'Ex.: Fortaleza para Lisboa até R$ 2.800',
  hotel: 'Ex.: Hotel em Lisboa até R$ 600/noite',
  transferencia: 'Ex.: Livelo → Smiles acima de 80%',
};

const POINTS_LABEL: Record<AlertType, string> = {
  voo: 'Pontos máximos aceitos',
  hotel: 'Pontos máximos aceitos',
  transferencia: '% de bônus mínimo desejado',
};

const POINTS_PLACEHOLDER: Record<AlertType, string> = {
  voo: 'Ex.: 45000',
  hotel: 'Ex.: 45000',
  transferencia: 'Ex.: 80',
};

const PROGRAM_LABEL: Record<AlertType, string> = {
  voo: 'Programa de pontos (opcional)',
  hotel: 'Programa de pontos (opcional)',
  transferencia: 'Programa de origem',
};

export function AlertForm({
  plan,
  currentCount,
  maxAlerts,
  programNames,
}: {
  plan: PlanId;
  currentCount: number;
  maxAlerts: number;
  /** Nomes dos programas ativos no catálogo — vira dropdown em vez de texto
   * livre, pra nunca gravar um nome que não bate com nada em
   * loyalty_programs (ver DATA_QUALITY.md). */
  programNames: string[];
}) {
  const [type, setType] = useState<AlertType>('voo');
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelWhatsapp, setChannelWhatsapp] = useState(false);

  const whatsappAvailable = planHasChannel(plan, 'whatsapp');
  const limitReached = currentCount >= maxAlerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar alerta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Você usa {currentCount} de {maxAlerts} alertas do seu plano.
        </p>
      </CardHeader>
      <CardContent>
        {limitReached && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning bg-warning/10 p-3 text-sm">
            <p>Limite de alertas do plano atingido. Exclua um alerta ou faça upgrade para criar mais.</p>
            <Link href="/assinatura">
              <Button type="button" size="sm">
                Ver planos
              </Button>
            </Link>
          </div>
        )}

        <form action={createAlert} className="space-y-5">
          <fieldset disabled={limitReached} className="space-y-5 disabled:opacity-60">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="type">Tipo de alerta</Label>
                <Select
                  id="type"
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AlertType)}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome do alerta</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={120}
                  placeholder={NAME_PLACEHOLDER[type]}
                />
              </div>
            </div>

            {type === 'voo' && (
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="origin">Origem</Label>
                  <Input id="origin" name="origin" placeholder="GRU ou Fortaleza" maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="destination">Destino</Label>
                  <Input id="destination" name="destination" placeholder="LIS ou Lisboa" maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cabin_class">Classe</Label>
                  <Select id="cabin_class" name="cabin_class" defaultValue="qualquer">
                    {CABIN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passengers">Passageiros</Label>
                  <Input id="passengers" name="passengers" type="number" min={1} defaultValue={1} />
                </div>
              </div>
            )}

            {type === 'hotel' && (
              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" placeholder="Ex.: Lisboa, Portugal" maxLength={120} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Data inicial (opcional)</Label>
                <Input id="start_date" name="start_date" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">Data final (opcional)</Label>
                <Input id="end_date" name="end_date" type="date" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="flexible_dates" checked={flexibleDates} onCheckedChange={setFlexibleDates} />
              <Label htmlFor="flexible_dates" className="cursor-pointer font-normal">
                Datas flexíveis
              </Label>
            </div>
            {/* Switch é um botão controlado (não input nativo) — o hidden
                input abaixo é que efetivamente viaja no FormData. */}
            <input type="hidden" name="flexible_dates" value={flexibleDates ? 'true' : 'false'} />

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              {type !== 'transferencia' && (
                <div className="space-y-1.5">
                  <Label htmlFor="max_cash_price">Preço máximo em dinheiro (R$, opcional)</Label>
                  <Input
                    id="max_cash_price"
                    name="max_cash_price"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex.: 2800"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="max_points_price">{POINTS_LABEL[type]} (opcional)</Label>
                <Input
                  id="max_points_price"
                  name="max_points_price"
                  type="number"
                  min={0}
                  placeholder={POINTS_PLACEHOLDER[type]}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="loyalty_program">{PROGRAM_LABEL[type]}</Label>
                <Select id="loyalty_program" name="loyalty_program" defaultValue="">
                  <option value="">
                    {type === 'transferencia' ? 'Selecione o programa de origem' : 'Qualquer programa'}
                  </option>
                  {programNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-medium">Canais de aviso</p>
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="channel_email" checked={channelEmail} onCheckedChange={setChannelEmail} />
                  <Label htmlFor="channel_email" className="cursor-pointer font-normal">
                    E-mail
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="channel_whatsapp"
                    checked={channelWhatsapp}
                    onCheckedChange={setChannelWhatsapp}
                    disabled={!whatsappAvailable}
                  />
                  <Label
                    htmlFor="channel_whatsapp"
                    className={cn(
                      'font-normal',
                      whatsappAvailable ? 'cursor-pointer' : 'cursor-not-allowed text-muted-foreground'
                    )}
                  >
                    WhatsApp
                  </Label>
                  {!whatsappAvailable && (
                    <Link href="/assinatura">
                      <Badge variant="accent" className="cursor-pointer">
                        Disponível no plano Pro
                      </Badge>
                    </Link>
                  )}
                </div>
              </div>
              <input type="hidden" name="channel_email" value={channelEmail ? 'true' : 'false'} />
              <input
                type="hidden"
                name="channel_whatsapp"
                value={channelWhatsapp && whatsappAvailable ? 'true' : 'false'}
              />
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              Criar alerta
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
