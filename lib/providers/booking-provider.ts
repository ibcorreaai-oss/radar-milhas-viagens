import type { HotelProvider, HotelSearchParams } from '@/lib/providers/types';
import { ProviderNotConfiguredError } from '@/lib/providers/types';

// BookingProvider — PREPARADO, não implementado no MVP.
// Requer aprovação do programa de afiliados/Demand API da Booking.com.
// Quando BOOKING_API_KEY existir, implementar aqui e mapear para
// NormalizedHotelResult (ver lib/providers/types.ts).
export class BookingHotelProvider implements HotelProvider {
  readonly name = 'booking';

  async search(_params: HotelSearchParams): ReturnType<HotelProvider['search']> {
    throw new ProviderNotConfiguredError('Booking.com');
  }
}

export function isBookingConfigured(): boolean {
  return Boolean(process.env.BOOKING_API_KEY);
}
