'use client';

import { useState } from 'react';
import { searchHotels } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DestinationField } from '@/components/destination-field';
import { DateRangeField } from '@/components/date-range-field';
import { GuestsField } from '@/components/guests-field';

const STARS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Qualquer categoria' },
  { value: '3', label: '3+ estrelas' },
  { value: '4', label: '4+ estrelas' },
  { value: '5', label: '5 estrelas' },
];

export function HotelSearchForm() {
  const [payWithPoints, setPayWithPoints] = useState(true);
  const [flexibleDates, setFlexibleDates] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar hospedagem</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare preço em dinheiro e em pontos para a mesma estadia — a recomendação é calculada
          automaticamente.
        </p>
      </CardHeader>
      <CardContent>
        <form action={searchHotels} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DestinationField
              name="city"
              label="Cidade"
              placeholder="Ex.: Fortaleza"
              required
              className="sm:col-span-2"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateRangeField startName="checkin" endName="checkout" startLabel="Check-in" endLabel="Check-out" required />
            <GuestsField
              fieldLabel="Hóspedes e quartos"
              counters={[
                { key: 'guests', label: 'Hóspedes', min: 1, defaultValue: 2 },
                { key: 'rooms', label: 'Quartos', min: 1, defaultValue: 1 },
              ]}
              summary={(v) => `${v.guests} hóspede${v.guests > 1 ? 's' : ''} · ${v.rooms} quarto${v.rooms > 1 ? 's' : ''}`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="payWithPoints" checked={payWithPoints} onCheckedChange={setPayWithPoints} />
              <Label htmlFor="payWithPoints" className="cursor-pointer font-normal">
                Também quero pagar com pontos
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="flexibleDates" checked={flexibleDates} onCheckedChange={setFlexibleDates} />
              <Label htmlFor="flexibleDates" className="cursor-pointer font-normal">
                Minhas datas são flexíveis
              </Label>
            </div>
          </div>

          {/* Os switches acima são botões controlados (não inputs nativos) — os
              hidden inputs abaixo é que efetivamente viajam no FormData. */}
          <input type="hidden" name="payWithPoints" value={payWithPoints ? 'true' : 'false'} />
          <input type="hidden" name="flexibleDates" value={flexibleDates ? 'true' : 'false'} />

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="maxBudgetPerNight">Orçamento máx./noite</Label>
              <Input id="maxBudgetPerNight" name="maxBudgetPerNight" type="number" min={0} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="starsMin">Categoria mínima</Label>
              <Select id="starsMin" name="starsMin" defaultValue="">
                {STARS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            Buscar hotéis
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
