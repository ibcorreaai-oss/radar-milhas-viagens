// Tipos de domínio do Radar Milhas & Viagens.
// Espelham as tabelas em supabase/migrations/0001_schema.sql.
// Não são gerados automaticamente — mantenha em sincronia ao alterar o schema.

export type CabinClass = 'economica' | 'executiva' | 'primeira' | 'qualquer';
export type PlanId = 'free' | 'premium' | 'pro' | 'consultor';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';
export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  home_airport: string | null;
  favorite_destinations: string[];
  cabin_class_preference: CabinClass;
  flexible_dates: boolean;
  monthly_budget: number | null;
  notify_email: boolean;
  notify_whatsapp: boolean;
  preferred_currency: string;
  language: string;
  timezone: string;
  onboarding_done: boolean;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type LoyaltyProgramType = 'banco' | 'companhia_aerea' | 'hotel' | 'coalizao';

export interface LoyaltyProgram {
  id: string;
  name: string;
  type: LoyaltyProgramType;
  country: string;
  average_mile_value: number;
  transfer_partners: string[];
  validity_notes: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface UserLoyaltyProgram {
  id: string;
  user_id: string;
  program_id: string;
  points_balance: number;
  estimated_cost_per_1000: number | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlightSearch {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  cabin_class: CabinClass;
  passengers_adults: number;
  passengers_children: number;
  passengers_infants: number;
  flexible_dates: boolean;
  created_at: string;
}

export type Recommendation =
  | 'use_pontos'
  | 'pague_dinheiro'
  | 'espere_promocao'
  | 'compre_pontos_se_abaixo'
  | 'transfira_com_bonus'
  | 'nao_vale_pontos'
  | 'boa_opcao_cashback'
  | 'melhor_custo_beneficio';

export interface FlightResult {
  id: string;
  search_id: string;
  provider: string;
  airline: string;
  origin: string;
  destination: string;
  departure_datetime: string;
  arrival_datetime: string;
  duration_minutes: number;
  stops: number;
  cash_price: number | null;
  points_price: number | null;
  taxes: number;
  currency: string;
  loyalty_program: string | null;
  score: number;
  recommendation: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface HotelSearch {
  id: string;
  user_id: string;
  city: string;
  checkin: string | null;
  checkout: string | null;
  guests: number;
  rooms: number;
  created_at: string;
}

export interface HotelResult {
  id: string;
  search_id: string;
  provider: string;
  hotel_name: string;
  location: string | null;
  rating: number | null;
  stars: number | null;
  cash_price: number | null;
  points_price: number | null;
  taxes: number;
  currency: string;
  loyalty_program: string | null;
  cancellation_policy: string | null;
  breakfast_included: boolean;
  score: number;
  recommendation: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export type AlertType = 'voo' | 'hotel' | 'transferencia';

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  name: string;
  origin: string | null;
  destination: string | null;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  flexible_dates: boolean;
  max_cash_price: number | null;
  max_points_price: number | null;
  loyalty_program: string | null;
  cabin_class: string | null;
  passengers: number;
  channel_email: boolean;
  channel_whatsapp: boolean;
  active: boolean;
  check_frequency_hours: number;
  last_checked_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
}

export type OpportunityType = 'voo' | 'hotel' | 'transferencia' | 'pacote';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  origin: string | null;
  destination: string | null;
  city: string | null;
  cash_price: number | null;
  points_price: number | null;
  taxes: number;
  loyalty_program: string | null;
  score: number;
  recommendation: string | null;
  featured: boolean;
  expires_at: string | null;
  source: string;
  affiliate_url: string | null;
  affiliate_provider: string | null;
  commission_type: string | null;
  tracking_id: string | null;
  created_at: string;
}

export type PromotionType =
  | 'transferencia_bonificada'
  | 'compra_pontos'
  | 'passagem'
  | 'hotel'
  | 'pacote'
  | 'clube'
  | 'cartao'
  | 'cashback'
  | 'cupom';

export type PromotionStatus = 'ativa' | 'expirada' | 'futura';

export interface Promotion {
  id: string;
  title: string;
  type: PromotionType;
  program: string | null;
  bonus_percentage: number | null;
  start_date: string | null;
  end_date: string | null;
  rules: string | null;
  url: string | null;
  score: number;
  status: PromotionStatus;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationChannel = 'email' | 'whatsapp' | 'telegram' | 'push';

export interface NotificationLog {
  id: string;
  user_id: string | null;
  alert_id: string | null;
  channel: NotificationChannel;
  message: string | null;
  status: 'sent' | 'failed' | 'skipped';
  sent_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Classificação textual do score de oportunidade (0-100).
export type ScoreTier = 'imperdivel' | 'excelente' | 'bom' | 'normal' | 'nao_recomendado';

export function scoreTier(score: number): ScoreTier {
  if (score >= 90) return 'imperdivel';
  if (score >= 75) return 'excelente';
  if (score >= 60) return 'bom';
  if (score >= 40) return 'normal';
  return 'nao_recomendado';
}

export const SCORE_TIER_LABEL: Record<ScoreTier, string> = {
  imperdivel: 'Imperdível',
  excelente: 'Excelente',
  bom: 'Bom negócio',
  normal: 'Normal',
  nao_recomendado: 'Não vale a pena',
};
