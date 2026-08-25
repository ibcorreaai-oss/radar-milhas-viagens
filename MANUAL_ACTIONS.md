# MANUAL_ACTIONS.md — Radar Milhas & Viagens 3.0 (Fase 0-2)

Nada abaixo bloqueia o código — a evolução desta sessão está completa e compila/builda
limpa sem essas ações. São passos que só o Igor pode fazer (infraestrutura, decisão de
produto ou dinheiro).

## 1. Rodar as migrations novas no Supabase real

**ATUALIZADO ETAPA 12 (25/08):** o projeto Supabase real (`radar-milhas-viagens`) foi criado
nesta sessão e as migrations `0001` a `0007` já foram aplicadas direto nele — nada abaixo
precisa mais ser feito manualmente para o schema. Só falta:
- [ ] Rodar `supabase/seed.sql` e `supabase/seed_world_radar.sql` (ver README.md item 1) —
      popula `feature_flags`, `event_categories`, `destinations`, `sources` e ~8 eventos de
      exemplo marcados `is_mock=true`
- [ ] Copiar `SUPABASE_SERVICE_ROLE_KEY` do dashboard pro `.env.local` (ver README.md item 1)

## 2. Decidir sobre o World Radar antes de abrir para usuários reais

- [ ] Revisar os eventos de exemplo em `/admin/eventos` — eles têm `is_mock=true` e
      não foram confirmados por fonte oficial nesta sessão (datas de 2026 são
      plausíveis mas não verificadas). Confirmar ou desmarcar `is_mock` evento por
      evento antes de expor a usuários pagantes.
- [ ] Decidir se `worldRadar`/`bucketList` ficam ligados em produção (hoje o seed já
      liga as duas) ou se você prefere popular com dados reais antes — desligar é só
      um toggle em `feature_flags` (tabela) ou editar `/admin` no futuro (hoje via SQL
      direto, não há UI de toggle ainda).

## 3. Decisão sobre agentes de descoberta automática (fica para você)

Não implementei nenhum agente de scraping/API externa para popular eventos
automaticamente (§46 do PROMPT 3.0) — isso teria custo de API novo e/ou risco de ToS de
scraping não autorizado, e você tem regra de não aprovar gasto novo de API/LLM sem
combinar antes. Quando você decidir qual fonte usar (ex.: uma API de eventos paga, RSS
de organizadores oficiais, ou continuar 100% manual via `/admin/eventos`), eu implemento
o `WorldDiscoveryAgent` de verdade — o schema (`sources`, `world_events.source_id`,
`confidence_score`, `last_checked_at`) já está pronto para isso.

## 4. Nada novo em Stripe/Resend/WhatsApp/Amadeus/Duffel/Booking/domínio/deploy

Essas pendências continuam exatamente como estavam no `README.md` original — esta
sessão não mexeu em nenhuma integração de pagamento/e-mail/WhatsApp/voo/hotel.

## 5. Teste manual sugerido depois de rodar as migrations

- [ ] Visitar `/descobrir` sem login → deve mostrar página vazia/sem dados (RLS exige
      `authenticated`) — comportamento esperado, igual a `/promocoes`.
- [ ] Logar → `/descobrir` deve mostrar os ~8 eventos de exemplo com badge "Dado de
      exemplo"
- [ ] Salvar um evento na Bucket List → conferir em `/bucket-list`
- [ ] Como admin, criar/editar/excluir um evento em `/admin/eventos` e conferir que o
      score muda ao trocar status/relevância/data

## 6. ETAPA 12 (25/08) — decisões e pendências novas

- **Tauri → PWA por decisão do Igor.** Pedido original era "usar Tauri" pra instalar em
  celular/tablet/desktop; expliquei que Tauri exige toolchain nativo (Rust) e build/deploy
  separado do modelo web atual, e o Igor escolheu PWA em vez disso (Recomendado). Implementado:
  `app/manifest.ts` + ícones em `public/icons/` + `public/apple-touch-icon.png` + metadata em
  `app/layout.tsx`. "Adicionar à tela inicial" funciona no Chrome/Edge/Safari sem loja de app.
  Se realmente quiser apps nativos nas lojas (App Store/Play Store) depois, Tauri fica registrado
  aqui como decisão futura — é um projeto separado.
- **"Pasta Pages" era mal-entendido.** O pedido de "criar uma pasta Pages e organizar o código
  lá" descrevia exatamente o que o App Router (`app/`) já faz — cada rota já é uma pasta com
  `page.tsx`. Confirmado com o Igor que não é pra migrar pro Pages Router antigo (isso seria
  retrabalho destrutivo, perderia Server Components). Nenhuma mudança feita.
- **LGPD: não criei página separada.** `/privacidade` já cobre LGPD de forma substantiva desde
  a ETAPA 11 (cita a Lei 13.709/2018 explicitamente, direitos do titular, exclusão de dados,
  canal de contato). Uma `/lgpd` separada seria conteúdo duplicado. Em vez disso, o link do
  rodapé foi renomeado de "Política de privacidade" pra "Privacidade e LGPD", deixando claro
  que o assunto está coberto ali.
- **Fotos com IA — aprovado e gerado.** 3 imagens via Higgsfield (`marketing_studio_image`,
  6 créditos no total, aprovado pelo Igor antes do gasto): `public/images/hero-airport.png`
  (banner do hero), `public/images/destination-fortaleza.png` (card de exemplo dinheiro vs
  pontos) e `public/images/consultor-ia.png` (card "Consultor IA" na grade de funcionalidades).
- **Idioma da home (EN/FR/ES) — escopo limitado à home, por decisão de risco.** Traduzido:
  hero, "Como funciona", pergunta central, funcionalidades, textos ao redor dos planos (não o
  texto dos planos em si, que vem de `lib/plans.ts` e é reaproveitado em checkout/dashboard),
  confiança, CTA final, aviso legal. **Não traduzido**: SiteHeader/SiteFooter (compartilhados
  com as outras 30+ telas — traduzir só ali criaria inconsistência ao navegar), o buscador
  embutido (`HeroSearchBox`) e o card de exemplo (`CashVsPointsTeaser`). Full i18n de rotas
  (next-intl ou similar, cobrindo o site logado inteiro) é um projeto à parte — sinalizar se
  o Igor quiser isso de verdade no futuro. Troca de idioma é só client-side (Context +
  localStorage, `components/language-provider.tsx`); a renderização inicial que o Google vê
  continua sempre em pt-BR, então não há impacto de SEO/GEO.
- **Banco de dados real criado nesta sessão** — ver seção 1 acima e `README.md`. Achado
  importante: o projeto Supabase do Radar nunca tinha sido criado de fato (nem aparecia na
  org Cortex Tech, nem havia projeto Vercel correspondente) — só o repositório GitHub era
  real. Etapas anteriores (1-11) descreveram testes via Playwright contra um servidor local,
  mas o histórico de sessões anteriores não deixa claro contra qual banco isso rodava. A partir
  de agora, `radar-milhas-viagens` (ref `gvncsfkypxcgfmifjqzh`) é o banco real e único.
- **Nenhum projeto Vercel existe ainda** — ver `README.md` item 7. Avisar se quiser que eu
  faça o primeiro deploy numa próxima etapa (depende de decidir domínio e confirmar as
  variáveis de ambiente de produção primeiro).
