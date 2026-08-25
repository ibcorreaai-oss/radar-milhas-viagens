import { z } from 'zod';

// Validação do formulário público /contato — espelha os CHECK constraints
// de supabase/migrations/0006_contact_messages.sql. Ver DATA_QUALITY.md.
export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  email: z.string().trim().min(5, 'Informe um e-mail válido.').max(200).email('Informe um e-mail válido.'),
  subject: z.string().trim().min(1, 'Informe o assunto.').max(150, 'Assunto muito longo.'),
  message: z.string().trim().min(1, 'Escreva sua mensagem.').max(4000, 'Mensagem muito longa (máx. 4000 caracteres).'),
});
export type ContactInput = z.infer<typeof contactSchema>;
