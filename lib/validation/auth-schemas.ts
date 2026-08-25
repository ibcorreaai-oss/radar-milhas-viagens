import { z } from 'zod';

// ETAPA 14 (ver AUTH_AND_ADMIN.md) — validação dos formulários de
// autenticação/admin novos. Mesmo princípio de lib/validation/admin-schemas.ts:
// rejeitar antes de chamar o Supabase, com mensagem específica.

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Informe seu e-mail.')
  .email('E-mail inválido.')
  .max(254);

// Código de 6 dígitos que o Supabase Auth envia por e-mail (OTP nativo).
// Remove QUALQUER espaço/traço interno antes de validar — clientes de
// e-mail às vezes quebram "123456" em "123 456" ao exibir, e um usuário
// que copia exatamente o que vê não deveria esbarrar em "código inválido"
// por causa só de formatação (achado em revisão adversarial).
export const otpCodeSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]+/g, ''))
  .pipe(z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos.'));

export const nameSchema = z.string().trim().min(1, 'Informe seu nome.').max(120);

// `.max(72)` contaria caracteres JS, não bytes — o limite real é do bcrypt
// do GoTrue, que trunca em 72 BYTES UTF-8. Uma senha com acento (é, ã, ç
// = 2 bytes cada) podia passar no `.max(72)` contando caracteres e ainda
// assim estourar o limite de bytes que o Supabase realmente aplica
// (achado revisando antes do fim da etapa). `.refine()` mede bytes de
// verdade via TextEncoder.
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .refine((v) => new TextEncoder().encode(v).length <= 72, {
    message: 'A senha pode ter no máximo 72 bytes (acentos contam como 2).',
  });

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});

export const featureFlagToggleSchema = z.object({
  key: z.string().trim().min(1),
  enabled: z.boolean(),
});

export const favoriteToggleSchema = z.object({
  itemType: z.enum(['promotion', 'loyalty_program']),
  itemId: z.string().trim().uuid('Item inválido.'),
});

export function firstZodError(result: { success: false; error: z.ZodError }): string {
  return result.error.issues[0]?.message ?? 'Dado inválido.';
}
