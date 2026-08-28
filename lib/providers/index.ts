import type { FlightProvider, HotelProvider, PromotionProvider } from '@/lib/providers/types';
import { MockFlightProvider } from '@/lib/providers/mock-flight-provider';
import { MockHotelProvider } from '@/lib/providers/mock-hotel-provider';
import { ManualPromotionProvider } from '@/lib/providers/manual-promotion-provider';
import { AmadeusFlightProvider, AmadeusHotelProvider, isAmadeusConfigured } from '@/lib/providers/amadeus-provider';
import { DuffelFlightProvider, isDuffelConfigured } from '@/lib/providers/duffel-provider';
import { BookingHotelProvider, isBookingConfigured } from '@/lib/providers/booking-provider';
import { SerpApiFlightProvider, isSerpApiConfigured } from '@/lib/providers/serpapi-flight-provider';

// Factories — nunca deixam o app quebrar por falta de credencial. Se a env
// var da API paga não existir, cai automaticamente no mock.
//
// SerpApi entra ANTES de Duffel/Amadeus na prioridade: é o único provider de
// voo de verdade implementado hoje (Amadeus/Duffel são stubs "preparado, não
// implementado" — ver os respectivos arquivos), gratuito (plano Free, sem
// cartão) e com fallback interno pro mock em qualquer falha/estouro de cota
// (nunca lança), então é seguro deixar como preferência automática assim que
// SERPAPI_KEY existir.

export function getFlightProvider(): FlightProvider {
  if (isSerpApiConfigured()) return new SerpApiFlightProvider();
  if (isDuffelConfigured()) return new DuffelFlightProvider();
  if (isAmadeusConfigured()) return new AmadeusFlightProvider();
  return new MockFlightProvider();
}

// Variante usada só pelo cron de alertas (app/api/cron/check-alerts).
// Bucket de cota separado ('serpapi_alerts', teto bem menor que o
// interativo) — sem isso, alertas ativos checados 1x/dia competiriam pela
// mesma cota mensal da SerpApi que a busca interativa do usuário usa,
// podendo esgotá-la sozinhos e "roubar" cota que deveria sobrar pra quem
// está buscando na hora (achado em code-review).
export function getFlightProviderForAlerts(): FlightProvider {
  // Sem 2º argumento: o construtor já aplica o teto reservado pro bucket
  // 'serpapi_alerts' automaticamente (ver serpapi-flight-provider.ts).
  if (isSerpApiConfigured()) return new SerpApiFlightProvider('serpapi_alerts');
  if (isDuffelConfigured()) return new DuffelFlightProvider();
  if (isAmadeusConfigured()) return new AmadeusFlightProvider();
  return new MockFlightProvider();
}

export function getHotelProvider(): HotelProvider {
  if (isBookingConfigured()) return new BookingHotelProvider();
  if (isAmadeusConfigured()) return new AmadeusHotelProvider();
  return new MockHotelProvider();
}

export function getPromotionProvider(): PromotionProvider {
  return new ManualPromotionProvider();
}

export * from '@/lib/providers/types';
