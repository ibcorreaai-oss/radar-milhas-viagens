import type { FlightProvider, HotelProvider, PromotionProvider } from '@/lib/providers/types';
import { MockFlightProvider } from '@/lib/providers/mock-flight-provider';
import { MockHotelProvider } from '@/lib/providers/mock-hotel-provider';
import { ManualPromotionProvider } from '@/lib/providers/manual-promotion-provider';
import { AmadeusFlightProvider, AmadeusHotelProvider, isAmadeusConfigured } from '@/lib/providers/amadeus-provider';
import { DuffelFlightProvider, isDuffelConfigured } from '@/lib/providers/duffel-provider';
import { BookingHotelProvider, isBookingConfigured } from '@/lib/providers/booking-provider';

// Factories — nunca deixam o app quebrar por falta de credencial. Se a env
// var da API paga não existir, cai automaticamente no mock.

export function getFlightProvider(): FlightProvider {
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
