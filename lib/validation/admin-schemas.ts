import { z } from 'zod';

// Schemas de validação das 4 entidades de catálogo do admin
// (oportunidades/promoções/programas/eventos) — espelham exatamente os
// CHECK constraints do banco (supabase/migrations/0001, 0002, 0004), pra
// rejeitar dado inválido com mensagem específica ANTES de bater no
// Postgres, em vez de deixar o banco recusar com um erro genérico. O banco
// continua sendo a fonte de verdade final (defesa em profundidade) — isto
// é só a primeira camada, mais rápida e mais amigável.
//
// Todos os campos opcionais usam .nullable() (não .optional()): os
// `rawXForm()` de cada action SEMPRE entregam a chave, com `null` quando
// vazio — nunca omitem a chave. Isso mantém o tipo inferido como `T | null`
// em vez de `T | null | undefined`, mais simples de consumir depois.

// --- Oportunidades ---
export const opportunitySchema = z.object({
  type: z.enum(['voo', 'hotel', 'transferencia', 'pacote', 'evento']),
  title: z.string().trim().min(1, 'Título é obrigatório.').max(200),
  description: z.string().trim().max(2000).nullable(),
  origin: z.string().trim().max(80).nullable(),
  destination: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(120).nullable(),
  cash_price: z.number().nonnegative('Preço em dinheiro não pode ser negativo.').nullable(),
  points_price: z.number().int().nonnegative('Preço em pontos não pode ser negativo.').nullable(),
  taxes: z.number().nonnegative('Taxas não podem ser negativas.').default(0),
  loyalty_program: z.string().trim().max(120).nullable(),
  score: z.number().int().min(0, 'Score mínimo é 0.').max(100, 'Score máximo é 100.'),
  recommendation: z.string().trim().max(2000).nullable(),
  featured: z.boolean().default(false),
  expires_at: z.string().trim().nullable(),
  source: z.string().trim().min(1).max(80).default('manual'),
  affiliate_url: z.string().trim().url('URL de afiliado inválida.').max(500).nullable(),
  affiliate_provider: z.string().trim().max(120).nullable(),
  commission_type: z.string().trim().max(80).nullable(),
  tracking_id: z.string().trim().max(120).nullable(),
});
export type OpportunityInput = z.infer<typeof opportunitySchema>;

// --- Promoções ---
export const promotionSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório.').max(200),
  type: z.enum([
    'transferencia_bonificada',
    'compra_pontos',
    'passagem',
    'hotel',
    'pacote',
    'clube',
    'cartao',
    'cashback',
    'cupom',
  ]),
  program: z.string().trim().max(120).nullable(),
  bonus_percentage: z.number().nonnegative('Bônus não pode ser negativo.').nullable(),
  start_date: z.string().trim().nullable(),
  end_date: z.string().trim().nullable(),
  rules: z.string().trim().max(2000).nullable(),
  url: z.string().trim().url('URL inválida.').max(500).nullable(),
  score: z.number().int().min(0, 'Score mínimo é 0.').max(100, 'Score máximo é 100.'),
  status: z.enum(['ativa', 'expirada', 'futura']),
});
export type PromotionInput = z.infer<typeof promotionSchema>;

// --- Programas de fidelidade ---
export const loyaltyProgramSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório.').max(120),
  type: z.enum(['banco', 'companhia_aerea', 'hotel', 'coalizao']),
  country: z.string().trim().min(1).max(4).default('BR'),
  average_mile_value: z.number().nonnegative('Valor do milheiro não pode ser negativo.').default(0),
  transfer_partners: z.array(z.string().trim().min(1)).default([]),
  validity_notes: z.string().trim().max(1000).nullable(),
  notes: z.string().trim().max(1000).nullable(),
  active: z.boolean().default(true),
});
export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>;

// --- Eventos (World Radar) ---
export const worldEventSchema = z.object({
  title: z.string().trim().min(1, 'Título é obrigatório.').max(200),
  slug: z.string().trim().min(1, 'Não foi possível gerar um slug válido a partir do título.').max(200),
  category_id: z.string().trim().uuid().nullable(),
  destination_id: z.string().trim().uuid().nullable(),
  source_id: z.string().trim().uuid().nullable(),
  description: z.string().trim().max(2000).nullable(),
  significance: z
    .enum(['comum', 'classico', 'derby', 'mata_mata', 'semifinal', 'final', 'evento_historico'])
    .nullable(),
  start_date: z.string().trim().nullable(),
  end_date: z.string().trim().nullable(),
  status: z.enum(['confirmado', 'previsto', 'estimado', 'em_monitoramento', 'cancelado', 'adiado', 'finalizado']),
  once_in_a_lifetime: z.boolean().default(false),
  hidden_gem: z.boolean().default(false),
  featured: z.boolean().default(false),
  is_mock: z.boolean().default(false),
  source_url: z.string().trim().url('URL da fonte inválida.').max(500).nullable(),
  cover_image_url: z.string().trim().url('URL da imagem inválida.').max(500).nullable(),
  tags: z.array(z.string().trim().min(1)).default([]),
  confidence_score: z.number().min(0).max(1),
});
export type WorldEventInput = z.infer<typeof worldEventSchema>;

// Formata o primeiro erro do Zod numa string única — o suficiente pra um
// banner de erro de formulário (não precisamos de erro por campo agora,
// ver components/form-error.tsx).
export function firstZodError(result: { success: false; error: z.ZodError }): string {
  return result.error.issues[0]?.message ?? 'Dado inválido.';
}
