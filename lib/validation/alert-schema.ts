import { z } from 'zod';

// Validação do formulário de criação de alerta — espelha os CHECK
// constraints implícitos de negócio (preço/pontos não-negativos, tipo/
// classe dentro do enum) antes de gravar. Ver DATA_QUALITY.md.
export const alertSchema = z.object({
  type: z.enum(['voo', 'hotel', 'transferencia']),
  name: z.string().trim().min(1).max(120),
  origin: z.string().trim().max(80).nullable(),
  destination: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(120).nullable(),
  start_date: z.string().trim().nullable(),
  end_date: z.string().trim().nullable(),
  flexible_dates: z.boolean(),
  max_cash_price: z.number().nonnegative().nullable(),
  max_points_price: z.number().nonnegative().nullable(),
  loyalty_program: z.string().trim().max(120).nullable(),
  cabin_class: z.enum(['economica', 'executiva', 'primeira', 'qualquer']).nullable(),
  passengers: z.number().int().min(1).max(20),
  channel_email: z.boolean(),
  channel_whatsapp: z.boolean(),
});
export type AlertInput = z.infer<typeof alertSchema>;
