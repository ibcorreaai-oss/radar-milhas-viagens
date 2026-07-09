import type { FlightProvider, HotelProvider, FlightSearchParams, HotelSearchParams } from '@/lib/providers/types';
import { ProviderNotConfiguredError } from '@/lib/providers/types';

// AmadeusProvider — PREPARADO, não implementado no MVP.
// Quando o Igor tiver AMADEUS_CLIENT_ID/SECRET aprovados, implementar aqui:
// 1) autenticar via OAuth2 client_credentials (cache do token);
// 2) chamar Flight Offers Search / Hotel Search;
// 3) mapear a resposta para NormalizedFlightResult/NormalizedHotelResult.
// A factory em lib/providers/index.ts já cai para o mock automaticamente
// enquanto as env vars estiverem vazias — não precisa mudar nada na UI.
export class AmadeusFlightProvider implements FlightProvider {
  readonly name = 'amadeus';

  async search(_params: FlightSearchParams): ReturnType<FlightProvider['search']> {
    throw new ProviderNotConfiguredError('Amadeus');
  }
}

export class AmadeusHotelProvider implements HotelProvider {
  readonly name = 'amadeus';

  async search(_params: HotelSearchParams): ReturnType<HotelProvider['search']> {
    throw new ProviderNotConfiguredError('Amadeus');
  }
}

export function isAmadeusConfigured(): boolean {
  return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);
}
