// Traduz erros do Postgres/Supabase pra mensagens que fazem sentido pra um
// admin leigo em vez de vazar "duplicate key value violates unique
// constraint \"loyalty_programs_name_key\"" na tela. Usado nas actions de
// criação/edição do admin — ver DATA_QUALITY.md.
//
// Códigos de erro do Postgres (estáveis, documentados): 23505 = unique
// violation, 23503 = foreign key violation, 23514 = check violation.
export function friendlyDbError(error: { code?: string; message: string }, entityLabel: string): string {
  if (error.code === '23505') {
    return `Já existe ${entityLabel} com esse valor — escolha outro.`;
  }
  if (error.code === '23503') {
    return `Essa referência não existe mais (item relacionado foi excluído). Atualize a página e tente de novo.`;
  }
  if (error.code === '23514') {
    return `Algum valor está fora da faixa permitida para ${entityLabel}.`;
  }
  return error.message;
}
