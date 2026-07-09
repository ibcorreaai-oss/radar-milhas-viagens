// Valida um destino de redirect vindo de input do usuário (query string,
// formData) contra open redirect. `startsWith('/')` sozinho NÃO basta:
// "//evil.com" e "/\evil.com" também começam com "/" mas o browser os
// resolve como URL absoluta pra outro host (protocol-relative). Só aceita
// paths internos de verdade — um único "/" seguido de algo que não seja
// outra barra ou barra invertida.
export function safeRedirectPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}
