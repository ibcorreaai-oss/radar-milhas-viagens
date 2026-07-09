import type { HotelProvider, HotelSearchParams, NormalizedHotelResult } from '@/lib/providers/types';

const HOTEL_CHAINS = [
  { suffix: 'Novotel', program: 'ALL Accor', stars: 4 },
  { suffix: 'Hilton Garden Inn', program: 'Hilton Honors', stars: 4 },
  { suffix: 'Sheraton', program: 'Marriott Bonvoy', stars: 5 },
  { suffix: 'Holiday Inn', program: 'IHG One Rewards', stars: 3 },
  { suffix: 'Pousada Local', program: null, stars: 3 },
];

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return (h % 1000) / 1000;
  };
}

function nights(checkin?: string, checkout?: string): number {
  if (!checkin || !checkout) return 1;
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  return Math.max(1, Math.round(diff / 86400000));
}

// MockHotelProvider — gera resultados plausíveis e determinísticos para o
// MVP funcionar sem Booking/Expedia configurados.
export class MockHotelProvider implements HotelProvider {
  readonly name = 'mock';

  async search(params: HotelSearchParams): Promise<NormalizedHotelResult[]> {
    const seed = `${params.city}-${params.checkin ?? 'flex'}-${params.guests}-${params.rooms}`;
    const rand = seededRandom(seed);
    const n = nights(params.checkin, params.checkout);

    return HOTEL_CHAINS.map((chain) => {
      const r = rand();
      const perNight = (180 + r * 900) * (1 + (params.rooms - 1) * 0.8);
      const cashPrice = Math.round(perNight * n * 100) / 100;
      const pointsPerNight = Math.round(perNight * 220);
      const pointsPrice = chain.program ? pointsPerNight * n : null;
      const taxes = Math.round(cashPrice * (0.05 + rand() * 0.05) * 100) / 100;

      return {
        provider: 'mock',
        hotelName: `${chain.suffix} ${params.city}`,
        location: `Centro de ${params.city}`,
        rating: Math.round((3.5 + rand() * 1.5) * 10) / 10,
        stars: chain.stars,
        cashPrice,
        pointsPrice,
        taxes,
        currency: 'BRL',
        loyaltyProgram: chain.program,
        cancellationPolicy: rand() > 0.4 ? 'Cancelamento grátis até 24h antes' : 'Não reembolsável',
        breakfastIncluded: rand() > 0.5,
      } satisfies NormalizedHotelResult;
    });
  }
}
