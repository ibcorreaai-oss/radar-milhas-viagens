// ETAPA 20 (achado ao vivo checando o site já publicado): sitemap.xml,
// robots.txt, JSON-LD, llms.txt e o link de afiliados estavam todos
// apontando pra "http://localhost:3000" em PRODUÇÃO, porque cada um lia
// `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` direto —
// esse fallback assumia "sem a env var, só pode ser dev local", premissa
// que ficou falsa assim que o site foi publicado sem essa variável
// configurada na Vercel (não existe ferramenta MCP pra setar env var lá —
// só o Igor consegue colar isso no dashboard).
//
// Em vez de esperar essa configuração manual, este helper se autocorrige:
// a Vercel já expõe `VERCEL_PROJECT_PRODUCTION_URL` (o domínio de produção
// do projeto) e `VERCEL_URL` (a URL do deployment atual) automaticamente,
// sem precisar de nada configurado pelo Igor. Prioridade:
// 1. NEXT_PUBLIC_APP_URL — se o Igor configurar (ex.: depois de comprar
//    domínio próprio), sempre vence.
// 2. VERCEL_PROJECT_PRODUCTION_URL — domínio de produção da Vercel,
//    estável entre deploys.
// 3. VERCEL_URL — URL do deployment específico (preview).
// 4. http://localhost:3000 — só resta isso em dev local de verdade.
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
