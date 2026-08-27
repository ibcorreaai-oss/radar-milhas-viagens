# EXISTING_FEATURES.md — Radar Milhas & Viagens

Levantamento funcional após a evolução 3.0 (Fase 0-2). "Funcionando" = testado via
`npm run typecheck` + `npm run build` limpos; comportamento de runtime real (com
Supabase configurado) ainda depende do checklist manual do `README.md`.

## FUNCIONANDO (código completo, testado por build/typecheck)

- Auth (login/cadastro/recuperar senha/callback PKCE)
- Onboarding
- Dashboard (oportunidades, promoções, alertas, expirando em breve)
- Voos/Hotéis (busca mock + score via OpportunityEngine)
- Calculadora de pontos
- Alertas (CRUD, canais e-mail/WhatsApp por plano)
- Promoções / Programas (vitrine pública + admin CRUD)
- Oportunidades (vitrine pública + admin CRUD, agora com `evento` como tipo válido)
- Consultor IA (com fallback de regras sem `ANTHROPIC_API_KEY`)
- Perfil / Assinatura (Stripe Billing Portal)
- Admin (dashboard + promoções + programas + oportunidades)
- Cron: check-alerts, refresh-promotions, expire-opportunities
- **NOVO — Descobrir (World Radar)**: `/descobrir`, filtro por categoria/mês, Experience
  Score explicável, badge de dado de exemplo
- **NOVO — Bucket List**: `/bucket-list`, salvar evento do radar ou item livre, remover
- **NOVO — Admin Eventos**: `/admin/eventos`, CRUD completo com score/Book Now State
  calculados automaticamente
- **NOVO — Feature flags**: tabela `feature_flags`, leitura em `lib/feature-flags.ts`,
  sidebar reage a elas

## PARCIAL

- **IA consultora**: funciona com fallback de regras; não consulta ainda dados reais do
  World Radar (isso é o "Concierge IA" do §42, fase futura — depende de Fase 6-9).
- **World Radar**: schema + UI + admin completos; **dado é 100% curado manualmente**
  (seed de exemplo `is_mock=true`). Não há agente de descoberta automática (decisão
  documentada em `AUDIT_REPORT.md` §8).

## INCOMPLETO / NÃO ENCONTRADO (pré-existente, fora desta sessão)

- `AmadeusProvider`, `DuffelProvider`, `BookingProvider` — stubs, não implementados
  (README já documentava isso antes desta sessão).
- ~~ESLint — não configurado no projeto~~ — **RESOLVIDO 27/08**: `eslint.config.mjs` (flat
  config) criado, `npm run lint` limpo. Este item fica como registro histórico do estado em
  23/08; ver `MANUAL_ACTIONS.md` §14 DONE pro detalhe da correção.

## NÃO CONSTRUÍDO NESTA SESSÃO (roadmap explícito no IMPLEMENTATION_PLAN.md)

Stay Experience/Smart Stay Split, Cruise Radar, World Opportunity Engine consolidado,
Inspire-me, alertas de Bucket List via cron, AI Trip Builder, Concierge IA com dados
reais, Price Intelligence 2.0, Award Availability, World Calendar, Weather/Crowd
Intelligence, Visa & Entry Intelligence, agentes de ingestão automática.
