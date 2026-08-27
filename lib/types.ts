// Tipos de domínio do Radar Milhas & Viagens.
// Espelham as tabelas em supabase/migrations/0001_schema.sql.
// Não são gerados automaticamente — mantenha em sincronia ao alterar o schema.

export type CabinClass = 'economica' | 'executiva' | 'primeira' | 'qualquer';
export type PlanId = 'free' | 'premium' | 'pro' | 'consultor';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';
// ETAPA 15 (ver PLATFORM_ADMIN.md) — super_admin fica ACIMA de admin, nunca
// ao lado: este produto não é multi-tenant, não existe "tenant admin" pra
// distinguir. is_admin() no banco trata 'admin' e 'super_admin' como
// equivalentes; só a gestão de roles/bloqueio de outro admin exige
// especificamente 'super_admin' (ver admin_set_user_role/admin_set_user_blocked
// em supabase/migrations/0011_super_admin_rbac.sql).
export type UserRole = 'user' | 'admin' | 'super_admin';

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
  blocked_at: string | null;
  blocked_reason: string | null;
  // ETAPA 15.1 (ver GROWTH.md) — programa de indicação: código gerado no
  // trigger handle_new_user, nunca escolhido pelo usuário.
  referral_code: string;
  referred_by_user_id: string | null;
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
  flexible_dates: boolean;
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

export type OpportunityType = 'voo' | 'hotel' | 'transferencia' | 'pacote' | 'evento';

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
  /** Referência opcional a um evento do World Radar — ver ARCHITECTURE.md #2. */
  world_event_id: string | null;
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

// =====================================================================
// World Experience Radar (Radar Milhas & Viagens 3.0 — ver ARCHITECTURE.md)
// Espelham supabase/migrations/0002_world_radar.sql.
// =====================================================================

export type FeatureFlagKey =
  | 'worldRadar'
  | 'bucketList'
  | 'cruiseRadar'
  | 'experienceRadar'
  | 'tripBuilder'
  | 'worldCalendar'
  | 'conciergeAI'
  | 'achievementsPanel'
  | 'stayExperience'
  | 'worldOpportunityEngine'
  | 'inspireMe'
  | 'priceIntelligence';

export interface FeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
  description: string | null;
  updated_at: string;
}

export type SourceType =
  | 'site_oficial'
  | 'organizador'
  | 'promotor'
  | 'federacao'
  | 'clube'
  | 'turismo_oficial'
  | 'companhia'
  | 'ticketing'
  | 'imprensa'
  | 'agregador'
  | 'manual';

export type SourceStatus = 'active' | 'stale' | 'broken' | 'disabled';
export type SourceHealth = 'ok' | 'degraded' | 'down' | 'unknown';

export interface Source {
  id: string;
  source_type: SourceType;
  name: string;
  url: string | null;
  authority_level: number;
  last_checked_at: string | null;
  status: SourceStatus;
  health: SourceHealth;
  created_at: string;
}

export interface Destination {
  id: string;
  city: string;
  region: string | null;
  country: string;
  country_code: string | null;
  continent: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  created_at: string;
}

export type EventRadar =
  | 'festa_tradicional'
  | 'festival_musical'
  | 'show'
  | 'esporte'
  | 'sazonal'
  | 'fenomeno_natural'
  | 'natureza'
  | 'cruzeiro'
  | 'gastronomia'
  | 'cultural'
  | 'trem_terrestre'
  | 'once_in_a_lifetime'
  | 'hidden_gem';

export interface EventCategory {
  id: string;
  slug: string;
  label: string;
  radar: EventRadar;
  icon: string | null;
  created_at: string;
}

export type EventSignificance =
  | 'comum'
  | 'classico'
  | 'derby'
  | 'mata_mata'
  | 'semifinal'
  | 'final'
  | 'evento_historico';

export type EventStatus =
  | 'confirmado'
  | 'previsto'
  | 'estimado'
  | 'em_monitoramento'
  | 'cancelado'
  | 'adiado'
  | 'finalizado';

export type BookNowState = 'monitorar' | 'esperar' | 'boa_janela' | 'comprar' | 'comprar_agora' | 'alto_risco_esgotar';

export interface WorldEvent {
  id: string;
  category_id: string | null;
  destination_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  significance: EventSignificance | null;
  start_date: string | null;
  end_date: string | null;
  status: EventStatus;
  once_in_a_lifetime: boolean;
  hidden_gem: boolean;
  experience_score: number;
  book_now_state: BookNowState;
  confidence_score: number;
  source_id: string | null;
  source_url: string | null;
  cover_image_url: string | null;
  tags: string[];
  featured: boolean;
  last_checked_at: string | null;
  last_changed_at: string | null;
  is_mock: boolean;
  created_at: string;
  updated_at: string;
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  confirmado: 'Confirmado',
  previsto: 'Previsto',
  estimado: 'Estimado',
  em_monitoramento: 'Em monitoramento',
  cancelado: 'Cancelado',
  adiado: 'Adiado',
  finalizado: 'Finalizado',
};

export const EVENT_RADAR_LABEL: Record<EventRadar, string> = {
  festa_tradicional: 'Festa tradicional',
  festival_musical: 'Festival musical',
  show: 'Show',
  esporte: 'Esporte',
  sazonal: 'Sazonal',
  fenomeno_natural: 'Fenômeno natural',
  natureza: 'Natureza & Wildlife',
  cruzeiro: 'Cruzeiro',
  gastronomia: 'Gastronomia',
  cultural: 'Cultural',
  trem_terrestre: 'Trem & Terrestre',
  once_in_a_lifetime: 'Once in a Lifetime',
  hidden_gem: 'Hidden Gem',
};

// =====================================================================
// FASE 3 — Stay Experience (World Experience Radar)
// Espelham supabase/migrations/0025_stay_experience.sql.
// =====================================================================

export type StayCategory =
  | 'hotel'
  | 'resort'
  | 'pousada'
  | 'lodge'
  | 'safari_lodge'
  | 'glamping'
  | 'villa'
  | 'chalet'
  | 'ryokan'
  | 'overwater_bungalow'
  | 'boutique_hotel'
  | 'eco_lodge'
  | 'castle_hotel'
  | 'cave_hotel'
  | 'treehouse'
  | 'desert_camp'
  | 'ski_resort'
  | 'wellness_retreat'
  | 'all_inclusive';

export type ExperienceTag =
  | 'BEACH'
  | 'SNOW'
  | 'NATURE'
  | 'LUXURY'
  | 'ROMANTIC'
  | 'FAMILY'
  | 'ADVENTURE'
  | 'WELLNESS'
  | 'GASTRONOMY'
  | 'SAFARI'
  | 'SKI'
  | 'DIVING'
  | 'REMOTE'
  | 'UNIQUE'
  | 'ALL_INCLUSIVE'
  | 'OVERWATER'
  | 'NORTHERN_LIGHTS';

// Estado de proveniência do dado — mais rigoroso que o is_mock simples da
// Fase 2 (pedido explícito do prompt da Fase 3+). "mock" é o único estado
// usado sem uma fonte real por trás; os demais pressupõem source_id/url.
export type VerificationStatus = 'verified' | 'unverified' | 'estimated' | 'stale' | 'mock';

export interface Stay {
  id: string;
  destination_id: string | null;
  name: string;
  slug: string;
  category: StayCategory;
  experience_tags: ExperienceTag[];
  description: string | null;
  price_from_cash: number | null;
  price_currency: string;
  price_unit: 'diaria' | 'pacote';
  best_season: string | null;
  stay_score: number;
  source_id: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  last_verified_at: string | null;
  verification_status: VerificationStatus;
  confidence_score: number;
  is_mock: boolean;
  cover_image_url: string | null;
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const STAY_CATEGORY_LABEL: Record<StayCategory, string> = {
  hotel: 'Hotel',
  resort: 'Resort',
  pousada: 'Pousada',
  lodge: 'Lodge',
  safari_lodge: 'Safari Lodge',
  glamping: 'Glamping',
  villa: 'Villa',
  chalet: 'Chalé',
  ryokan: 'Ryokan',
  overwater_bungalow: 'Bangalô sobre a água',
  boutique_hotel: 'Hotel boutique',
  eco_lodge: 'Eco Lodge',
  castle_hotel: 'Hotel-castelo',
  cave_hotel: 'Hotel em caverna',
  treehouse: 'Casa na árvore',
  desert_camp: 'Acampamento no deserto',
  ski_resort: 'Resort de ski',
  wellness_retreat: 'Retiro de bem-estar',
  all_inclusive: 'All-inclusive',
};

export const EXPERIENCE_TAG_LABEL: Record<ExperienceTag, string> = {
  BEACH: 'Praia',
  SNOW: 'Neve',
  NATURE: 'Natureza',
  LUXURY: 'Luxo',
  ROMANTIC: 'Romântico',
  FAMILY: 'Família',
  ADVENTURE: 'Aventura',
  WELLNESS: 'Bem-estar',
  GASTRONOMY: 'Gastronomia',
  SAFARI: 'Safári',
  SKI: 'Ski',
  DIVING: 'Mergulho',
  REMOTE: 'Remoto',
  UNIQUE: 'Único',
  ALL_INCLUSIVE: 'All-inclusive',
  OVERWATER: 'Sobre a água',
  NORTHERN_LIGHTS: 'Aurora Boreal',
};

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: 'Verificado',
  unverified: 'Não verificado',
  estimated: 'Estimado',
  stale: 'Desatualizado',
  mock: 'Dado de exemplo',
};

// =====================================================================
// FASE 4 — Cruise Radar (World Experience Radar)
// Espelham supabase/migrations/0026_cruise_radar.sql.
// =====================================================================

export type CruiseCategory = 'oceanico' | 'fluvial' | 'expedicao' | 'tematico' | 'volta_ao_mundo';

export type CruiseRegionTag =
  | 'CARIBE'
  | 'MEDITERRANEO'
  | 'FIORDES_NORUEGUESES'
  | 'AMAZONIA'
  | 'NILO'
  | 'MISSISSIPI'
  | 'ANTARTIDA'
  | 'ARTICO'
  | 'BRASIL'
  | 'DANUBIO'
  | 'RENO'
  | 'DOURO';

export type CabinCategory = 'interna' | 'vista_mar' | 'varanda' | 'suite';

export interface Cruise {
  id: string;
  embarkation_destination_id: string | null;
  name: string;
  slug: string;
  cruise_line: string | null;
  ship_name: string | null;
  category: CruiseCategory;
  region_tags: CruiseRegionTag[];
  route_description: string | null;
  nights: number;
  ports_count: number;
  cabin_category: CabinCategory | null;
  price_from_cash: number | null;
  price_currency: string;
  cruise_score: number;
  source_id: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  last_verified_at: string | null;
  verification_status: VerificationStatus;
  confidence_score: number;
  is_mock: boolean;
  cover_image_url: string | null;
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const CRUISE_CATEGORY_LABEL: Record<CruiseCategory, string> = {
  oceanico: 'Oceânico',
  fluvial: 'Fluvial',
  expedicao: 'Expedição',
  tematico: 'Temático/Cultural',
  volta_ao_mundo: 'Volta ao mundo',
};

export const CRUISE_REGION_TAG_LABEL: Record<CruiseRegionTag, string> = {
  CARIBE: 'Caribe',
  MEDITERRANEO: 'Mediterrâneo',
  FIORDES_NORUEGUESES: 'Fiordes Noruegueses',
  AMAZONIA: 'Amazônia',
  NILO: 'Nilo',
  MISSISSIPI: 'Mississippi',
  ANTARTIDA: 'Antártida',
  ARTICO: 'Ártico',
  BRASIL: 'Brasil',
  DANUBIO: 'Danúbio',
  RENO: 'Reno',
  DOURO: 'Douro',
};

export const CABIN_CATEGORY_LABEL: Record<CabinCategory, string> = {
  interna: 'Interna',
  vista_mar: 'Vista mar',
  varanda: 'Varanda',
  suite: 'Suíte',
};

export interface BucketList {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface BucketListItem {
  id: string;
  bucket_list_id: string;
  world_event_id: string | null;
  // stay_id/cruise_id — Fase 7 (Alerts + Bucket List evolution), ver 0029_bucket_list_alerts_evolution.sql.
  stay_id: string | null;
  cruise_id: string | null;
  // trip_id — Fase 8 (AI Trip Builder), ver 0030_ai_trip_builder.sql.
  trip_id: string | null;
  custom_title: string | null;
  notes: string | null;
  last_alert_sent_at: string | null;
  created_at: string;
}

// =====================================================================
// FASE 8 — AI Trip Builder (World Experience Radar)
// Espelham supabase/migrations/0030_ai_trip_builder.sql.
// =====================================================================

export type TripPace = 'tranquilo' | 'moderado' | 'intenso';
export type TripVariant = 'economy' | 'balanced' | 'premium';
export type TripStatus = 'ativa' | 'arquivada';

export interface TripItineraryDay {
  day: number;
  date: string | null;
  morning: string;
  afternoon: string;
  evening: string;
}

export interface TripBudgetBreakdown {
  flights: number | null;
  hotels: number | null;
  transport: number | null;
  food: number | null;
  tickets: number | null;
  experiences: number | null;
  cruise: number | null;
  other: number | null;
  estimated_total: number | null;
  currency: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  origin: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  travelers_adults: number;
  travelers_children: number;
  budget_total: number | null;
  interests: ExperienceTag[];
  pace: TripPace;
  variant: TripVariant;
  optimizations: string[];
  itinerary: TripItineraryDay[];
  budget_breakdown: TripBudgetBreakdown;
  summary: string | null;
  ai_generated: boolean;
  status: TripStatus;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export const TRIP_PACE_LABEL: Record<TripPace, string> = {
  tranquilo: 'Tranquilo',
  moderado: 'Moderado',
  intenso: 'Intenso',
};

export const TRIP_VARIANT_LABEL: Record<TripVariant, string> = {
  economy: 'Econômica',
  balanced: 'Equilibrada',
  premium: 'Premium',
};

export type TripOptimization =
  | 'reduzir_custo'
  | 'menos_deslocamentos'
  | 'mais_experiencias'
  | 'mais_descanso'
  | 'mais_gastronomia'
  | 'mais_natureza';

export const TRIP_OPTIMIZATION_LABEL: Record<TripOptimization, string> = {
  reduzir_custo: 'Reduzir custo',
  menos_deslocamentos: 'Menos deslocamentos',
  mais_experiencias: 'Mais experiências',
  mais_descanso: 'Mais descanso',
  mais_gastronomia: 'Mais gastronomia',
  mais_natureza: 'Mais natureza',
};

// =====================================================================
// Favoritos (ETAPA 14 — ver AUTH_AND_ADMIN.md §8)
// Espelham supabase/migrations/0009_favorites_and_media_storage.sql.
// =====================================================================

export type FavoriteItemType = 'promotion' | 'loyalty_program';

export interface Favorite {
  id: string;
  user_id: string;
  item_type: FavoriteItemType;
  item_id: string;
  created_at: string;
}

// =====================================================================
// Contato / leads (ETAPA 12 + 15.1 — ver GROWTH.md)
// Espelham supabase/migrations/0006_contact_messages.sql + 0013.
// =====================================================================

export type ContactMessageSource = 'contato' | 'home_ai_chat';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  email_status: 'pending' | 'sent' | 'skipped' | 'failed';
  source: ContactMessageSource;
  created_at: string;
}

// =====================================================================
// Central de Treinamentos / Mini LMS (ETAPA 15.2 — ver TRAINING.md).
// Espelham supabase/migrations/0017_training_lms.sql.
// =====================================================================

export type TrainingContentStatus = 'draft' | 'published' | 'archived';
export type TrainingContentType = 'video' | 'text' | 'quiz';
export type VideoProviderKey = 'youtube' | 'vimeo' | 'bunny' | 'cloudflare' | 'supabase' | 'url';

export interface TrainingModule {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  order_index: number;
  status: TrainingContentStatus;
  created_at: string;
  updated_at: string;
}

export interface LessonResource {
  title: string;
  url: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  description: string | null;
  content_type: TrainingContentType;
  video_provider: VideoProviderKey;
  video_ref: string | null;
  duration_seconds: number;
  order_index: number;
  is_required: boolean;
  keywords: string[];
  resources: LessonResource[];
  thumbnail_url: string | null;
  status: TrainingContentStatus;
  created_at: string;
  updated_at: string;
}

export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: LessonProgressStatus;
  progress_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string;
  created_at: string;
}

export const TRAINING_STATUS_LABEL: Record<TrainingContentStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
};
