// Tipos de entrada/saída da camada de providers — desacoplados do schema do
// banco. Um provider real (Amadeus, Duffel, Booking) só precisa devolver
// estas formas; quem grava no banco (server actions) mapeia para as tabelas.

import type { CabinClass } from '@/lib/types';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  cabinClass: CabinClass;
  adults: number;
  children: number;
  infants: number;
  flexibleDates: boolean;
}

export interface NormalizedFlightResult {
  provider: string;
  airline: string;
  origin: string;
  destination: string;
  departureDatetime: string;
  arrivalDatetime: string;
  durationMinutes: number;
  stops: number;
  cashPrice: number | null;
  pointsPrice: number | null;
  taxes: number;
  currency: string;
  loyaltyProgram: string | null;
}

export interface HotelSearchParams {
  city: string;
  checkin?: string;
  checkout?: string;
  guests: number;
  rooms: number;
}

export interface NormalizedHotelResult {
  provider: string;
  hotelName: string;
  location: string | null;
  rating: number | null;
  stars: number | null;
  cashPrice: number | null;
  pointsPrice: number | null;
  taxes: number;
  currency: string;
  loyaltyProgram: string | null;
  cancellationPolicy: string | null;
  breakfastIncluded: boolean;
}

export interface NormalizedPromotion {
  title: string;
  type: string;
  program: string | null;
  bonusPercentage: number | null;
  startDate: string | null;
  endDate: string | null;
  rules: string | null;
  url: string | null;
}

export interface FlightProvider {
  readonly name: string;
  search(params: FlightSearchParams): Promise<NormalizedFlightResult[]>;
}

export interface HotelProvider {
  readonly name: string;
  search(params: HotelSearchParams): Promise<NormalizedHotelResult[]>;
}

export interface PointsProvider {
  readonly name: string;
  getAverageMileValue(programName: string): Promise<number | null>;
}

export interface PromotionProvider {
  readonly name: string;
  list(): Promise<NormalizedPromotion[]>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(providerName: string) {
    super(`${providerName}: credenciais não configuradas — usando fallback.`);
    this.name = 'ProviderNotConfiguredError';
  }
}
