import type { FlightProvider, FlightSearchParams } from '@/lib/providers/types';
import { ProviderNotConfiguredError } from '@/lib/providers/types';

// DuffelProvider — PREPARADO, não implementado no MVP.
// Duffel cobre busca + reserva + possível emissão futura. Quando
// DUFFEL_ACCESS_TOKEN existir, implementar chamada a /air/offer_requests e
// mapear para NormalizedFlightResult (ver lib/providers/types.ts).
export class DuffelFlightProvider implements FlightProvider {
  readonly name = 'duffel';

  async search(_params: FlightSearchParams): ReturnType<FlightProvider['search']> {
    throw new ProviderNotConfiguredError('Duffel');
  }
}

export function isDuffelConfigured(): boolean {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN);
}
