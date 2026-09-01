import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPoints(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Sem timeZone explícito, toLocaleString usa o timezone do PROCESSO — UTC na
// Vercel — então um horário de voo real (já convertido pra UTC corretamente
// por parseGoogleFlightsTime) aparecia 3h adiantado pro usuário em Brasília.
// Achado em /code-review (revisão 01/09) sobre o diff do SerpApi ida-e-volta;
// mesma classe de bug que startOfDayBrazil/todayIsoBrazil já corrigiram pra
// comparações de data, só que nunca tinha sido aplicada aqui.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

// mm:ss (ou h:mm:ss acima de 1h) — usado pelas aulas do Mini LMS, que
// guardam duração/posição em segundos (não minutos, como o resto do app).
export function formatDurationSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Converte string de formulário em número, ou null se vazia/inválida —
// nunca deixa NaN vazar para um insert/update no Supabase.
export function parseNumberOrNull(raw: FormDataEntryValue | null | undefined): number | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Slug simples (ascii, minúsculo, hífens) usado por world_events e outras
// entidades que precisam de identificador legível na URL.
export function slugify(text: string): string {
  const withoutDiacritics = text
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f; // remove combining diacritical marks
    })
    .join('');

  return withoutDiacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Ano-mês-dia que o relógio mostra agora em America/Sao_Paulo, junto com o
// offset UTC relatado pelo próprio Intl (funciona também se o Brasil voltar
// a ter horário de verão, já que não fixa "-03:00" à mão). Base compartilhada
// de startOfDayBrazil/todayIsoBrazil — um lugar só resolve "que dia é hoje em
// Brasília", pra não divergir entre os dois usos.
function brazilDateParts(now: Date): { year: string; month: string; day: string; isoOffset: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // timeZoneName vem como "GMT-3" (ou "GMT-2" num eventual horário de
  // verão) — normaliza pro formato de offset ISO "-03:00".
  const gmtOffset = get('timeZoneName').replace('GMT', '') || '-3';
  const sign = gmtOffset.startsWith('-') ? '-' : '+';
  const hours = String(Math.abs(Number(gmtOffset))).padStart(2, '0');

  return { year: get('year'), month: get('month'), day: get('day'), isoOffset: `${sign}${hours}:00` };
}

// Início do dia civil em America/Sao_Paulo, como instante UTC — usado pra
// gates de "buscas hoje" (voos/actions.ts, hoteis/actions.ts). `new
// Date().setHours(0,0,0,0)` sozinho usa o timezone do processo Node, que na
// Vercel é UTC: o gate viraria à meia-noite UTC = 21h em Brasília (achado em
// revisão — nunca documentado/testado antes), resetando a cota diária 3h
// mais cedo do que o usuário espera.
export function startOfDayBrazil(now: Date = new Date()): Date {
  const { year, month, day, isoOffset } = brazilDateParts(now);
  return new Date(`${year}-${month}-${day}T00:00:00${isoOffset}`);
}

// "Hoje" (YYYY-MM-DD) em America/Sao_Paulo — usado pra comparar contra
// colunas DATE (ex.: world_events.start_date em getDestinationOpportunities).
// `new Date().toISOString().slice(0, 10)` sozinho dá o dia em UTC: entre 21h
// e 23h59 em Brasília isso já é o dia seguinte, e um evento que começa hoje
// sumiria da lista de oportunidades nessa janela (mesma classe de bug do
// startOfDayBrazil acima, achado em revisão).
export function todayIsoBrazil(now: Date = new Date()): string {
  const { year, month, day } = brazilDateParts(now);
  return `${year}-${month}-${day}`;
}

// "Ano-mês" (YYYY-MM) em America/Sao_Paulo — usado pra bucket mensal de cota
// (lib/providers/serpapi-flight-provider.ts). Mesma classe de bug de
// startOfDayBrazil/todayIsoBrazil: bucketar por mês UTC vira o mês ~3h antes
// da meia-noite real em Brasília (achado em code-review, revisão 01/09).
export function currentYearMonthBrazil(now: Date = new Date()): string {
  const { year, month } = brazilDateParts(now);
  return `${year}-${month}`;
}

// Converte lista separada por vírgula (input de formulário) em array de
// strings limpo, sem entradas vazias.
export function parseTagsList(raw: FormDataEntryValue | null | undefined): string[] {
  if (raw == null) return [];
  return String(raw)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
