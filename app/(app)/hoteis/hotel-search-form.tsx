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

const STARS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Qualquer categoria' },
  { value: '3', label: '3+ estrelas' },
  { value: '4', label: '4+ estrelas' },
  { value: '5', label: '5 estrelas' },
];

export function HotelSearchForm() {
  const [payWithPoints, setPayWithPoints] = useState(true);

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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" placeholder="Ex.: Fortaleza" required maxLength={80} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="checkin">Check-in</Label>
              <Input id="checkin" name="checkin" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout">Check-out</Label>
              <Input id="checkout" name="checkout" type="date" required />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="payWithPoints" checked={payWithPoints} onCheckedChange={setPayWithPoints} />
              <Label htmlFor="payWithPoints" className="cursor-pointer font-normal">
                Também quero pagar com pontos
              </Label>
            </div>
          </div>

          {/* O switch acima é um botão controlado (não input nativo) — o
              hidden input abaixo é que efetivamente viaja no FormData. No
              MVP é só copy: o mock já traz as duas opções quando o hotel
              tem programa de fidelidade. */}
          <input type="hidden" name="payWithPoints" value={payWithPoints ? 'true' : 'false'} />

          <Separator />

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="guests">Hóspedes</Label>
              <Input id="guests" name="guests" type="number" min={1} defaultValue={2} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rooms">Quartos</Label>
              <Input id="rooms" name="rooms" type="number" min={1} defaultValue={1} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxBudgetPerNight">Orçamento máx./noite</Label>
              <Input
                id="maxBudgetPerNight"
                name="maxBudgetPerNight"
                type="number"
                min={0}
                placeholder="Opcional"
              />
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
