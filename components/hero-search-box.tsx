'use client';

import { useState } from 'react';
import { Search, Hotel, Plane } from 'lucide-react';
import { searchHotels } from '@/app/(app)/hoteis/actions';
import { searchFlights } from '@/app/(app)/voos/actions';
import { DestinationField } from '@/components/destination-field';
import { DateRangeField } from '@/components/date-range-field';
import { GuestsField } from '@/components/guests-field';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SearchMode = 'hospedagens' | 'voos';

// Search box grande da home. Reaproveita as mesmas Server Actions de
// /hoteis e /voos (mesmo gate de plano, mesmo OpportunityEngine, mesmo
// banco) — só entrega uma porta de entrada mais rápida que "faça login,
// depois preencha o formulário lá dentro".
export function HeroSearchBox() {
  const [mode, setMode] = useState<SearchMode>('hospedagens');
  const [flexibleDates, setFlexibleDates] = useState(false);

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-2 shadow-xl sm:p-3">
      <div className="flex gap-1 p-1">
        <button
          type="button"
          onClick={() => setMode('hospedagens')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            mode === 'hospedagens' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Hotel className="h-4 w-4" />
          Hospedagens
        </button>
        <button
          type="button"
          onClick={() => setMode('voos')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            mode === 'voos' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Plane className="h-4 w-4" />
          Voos
        </button>
      </div>

      {mode === 'hospedagens' ? (
        <form key="hospedagens" action={searchHotels} className="space-y-3 p-2 sm:p-3">
          <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1.4fr]">
            <DestinationField name="city" label="Destino" placeholder="Para onde você vai?" required />
            <DateRangeField startName="checkin" endName="checkout" startLabel="Check-in" endLabel="Check-out" required />
            <GuestsField
              fieldLabel="Hóspedes"
              counters={[
                { key: 'guests', label: 'Hóspedes', min: 1, defaultValue: 2 },
                { key: 'rooms', label: 'Quartos', min: 1, defaultValue: 1 },
              ]}
              summary={(v) => `${v.guests} hóspede${v.guests > 1 ? 's' : ''} · ${v.rooms} quarto${v.rooms > 1 ? 's' : ''}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <Switch id="hero-flexible-hotel" checked={flexibleDates} onCheckedChange={setFlexibleDates} />
              <Label htmlFor="hero-flexible-hotel" className="cursor-pointer font-normal text-muted-foreground">
                Minhas datas são flexíveis
              </Label>
            </div>
            <input type="hidden" name="flexibleDates" value={flexibleDates ? 'true' : 'false'} />
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              Encontrar oportunidades
            </Button>
          </div>
        </form>
      ) : (
        <form key="voos" action={searchFlights} className="space-y-3 p-2 sm:p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <DestinationField name="origin" label="Origem" placeholder="De onde você sai?" required />
            <DestinationField name="destination" label="Destino" placeholder="Para onde você vai?" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1.4fr]">
            <DateRangeField startName="departureDate" endName="returnDate" startLabel="Ida" endLabel="Volta" required />
            <GuestsField
              fieldLabel="Passageiros"
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

          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <Switch id="hero-flexible-flight" checked={flexibleDates} onCheckedChange={setFlexibleDates} />
              <Label htmlFor="hero-flexible-flight" className="cursor-pointer font-normal text-muted-foreground">
                Minhas datas são flexíveis
              </Label>
            </div>
            <input type="hidden" name="flexibleDates" value={flexibleDates ? 'true' : 'false'} />
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Search className="h-4 w-4" />
              Encontrar oportunidades
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
