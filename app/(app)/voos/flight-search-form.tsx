'use client';

import { useState } from 'react';
import { searchFlights } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DestinationField } from '@/components/destination-field';
import { DateRangeField } from '@/components/date-range-field';
import { GuestsField } from '@/components/guests-field';
import type { CabinClass } from '@/lib/types';

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: 'economica', label: 'Econômica' },
  { value: 'executiva', label: 'Executiva' },
  { value: 'primeira', label: 'Primeira classe' },
  { value: 'qualquer', label: 'Qualquer classe' },
];

export function FlightSearchForm() {
  const [oneWay, setOneWay] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [compareBoth, setCompareBoth] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar passagens</CardTitle>
        <p className="text-sm text-muted-foreground">
          Compare preço em dinheiro e em pontos para a mesma rota — a recomendação é calculada
          automaticamente.
        </p>
      </CardHeader>
      <CardContent>
        <form action={searchFlights} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DestinationField name="origin" label="Origem" placeholder="GRU ou São Paulo" required />
            <DestinationField name="destination" label="Destino" placeholder="LIS ou Lisboa" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DateRangeField
              startName="departureDate"
              endName="returnDate"
              startLabel="Data de ida"
              endLabel="Data de volta"
              disableEnd={oneWay}
              required
            />
            <GuestsField
              fieldLabel="Passageiros e classe"
              counters={[
                { key: 'adults', label: 'Adultos', min: 1, defaultValue: 1 },
                { key: 'children', label: 'Crianças', min: 0, defaultValue: 0 },
                { key: 'infants', label: 'Bebês', min: 0, defaultValue: 0 },
              ]}
              summary={(v) => {
                const total = v.adults + v.children + v.infants;
                return `${total} passageiro${total > 1 ? 's' : ''}`;
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="oneWay" checked={oneWay} onCheckedChange={setOneWay} />
              <Label htmlFor="oneWay" className="cursor-pointer font-normal">
                Só ida
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="flexibleDates" checked={flexibleDates} onCheckedChange={setFlexibleDates} />
              <Label htmlFor="flexibleDates" className="cursor-pointer font-normal">
                Datas flexíveis
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="compareBoth" checked={compareBoth} onCheckedChange={setCompareBoth} />
              <Label htmlFor="compareBoth" className="cursor-pointer font-normal">
                Comparar dinheiro e pontos
              </Label>
            </div>
          </div>

          {/* Os switches acima são botões controlados (não inputs nativos) —
              os hidden inputs abaixo é que efetivamente viajam no FormData.
              "compareBoth" é só copy no MVP: a action sempre traz preço em
              dinheiro E em pontos quando o resultado tem os dois disponíveis. */}
          <input type="hidden" name="oneWay" value={oneWay ? 'true' : 'false'} />
          <input type="hidden" name="flexibleDates" value={flexibleDates ? 'true' : 'false'} />
          <input type="hidden" name="compareBoth" value={compareBoth ? 'true' : 'false'} />

          <Separator />

          <div className="space-y-1.5 sm:w-64">
            <Label htmlFor="cabinClass">Classe</Label>
            <Select id="cabinClass" name="cabinClass" defaultValue="economica">
              {CABIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            Buscar voos
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
