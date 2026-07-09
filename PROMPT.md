# Radar Milhas & Viagens — Spec organizada (v2, pós-avaliação)

> Este documento é a versão avaliada, reorganizada e priorizada do prompt original do Igor.
> O prompt original (30 seções, "emissor de milhas" implícito) foi reestruturado em torno de
> um pivô estratégico e de uma ordem de construção que entrega valor vendável mais rápido.

## 0. Avaliação do prompt original

**Pontos fortes:** escopo de domínio muito bem pensado (score de oportunidade, dinheiro vs
pontos, motor de alertas), schema de banco quase completo, arquitetura de providers já pensada
para não travar sem API paga.

**Riscos identificados e corrigidos nesta versão:**

1. **Posicionamento errado.** "Radar + calculadora + alerta" ainda soa como ferramenta de nicho
   para quem já entende milhas. **Pivô: vender como CLUBE PREMIUM DE ALERTAS DE VIAGEM COM IA.**
   Mais simples de explicar, mais fácil de precificar, zero risco regulatório de emissão/agência
   de viagem, e o gancho de assinatura recorrente é muito mais forte do que "radar para
   especialista em milhas". A camada de milhas/pontos vira um diferencial dentro do clube, não
   a promessa central da home.
2. **30 seções = escopo de 6 meses.** Reordenado por "o que entrega um produto testável e
   vendável primeiro" (ver §2 Ordem de construção). Funcionalidades de cauda longa (CRM de
   consultor, OCR de extrato, importação automática de saldo, app mobile) viraram **Roadmap
   futuro**, não MVP.
3. **RLS é o ponto de maior risco de segurança do projeto** (classe de bug já vista em outros
   apps do Igor: self-promote a admin via update direto em `profiles`). Esta versão fixa a regra:
   nenhuma coluna de role/plano é editável pelo próprio usuário via client; toda mudança de
   role/plano passa por Stripe webhook ou por admin com `service_role`.
4. **APIs pagas (Amadeus, Duffel, Booking, Skyscanner) não estão aprovadas ainda.** MVP roda
   100% com `MockFlightProvider` / `MockHotelProvider` / promoções cadastradas manualmente pelo
   admin. A interface `FlightProvider`/`HotelProvider` já fica pronta para plugar a API real sem
   tocar em UI ou banco.
5. **WhatsApp e cron ficam abstratos no MVP.** Sem WABA/Evolution configurado ainda, o app não
   pode travar — módulo `lib/whatsapp` loga em vez de falhar quando não há credencial.

## 1. O produto

**Nome provisório:** Radar Milhas & Viagens (slug: `radar-milhas`).

**Pitch de venda (o que vai na home, não o pitch técnico):**
> Assinatura que vigia preços de passagem e hotel por você — em dinheiro ou em pontos — e avisa
> no WhatsApp/e-mail só quando vale a pena. Você não precisa virar especialista em milhas.

**Pergunta central que o produto responde:**
> "Nesta viagem, vale mais a pena pagar em dinheiro, usar pontos, transferir pontos, comprar
> pontos ou esperar promoção?"

**Público-alvo:** viajantes brasileiros que acumulam Livelo, Esfera, Smiles, LATAM Pass, Azul
Fidelidade, TudoAzul, ALL Accor, Hilton Honors, Marriott Bonvoy etc.; famílias com datas
flexíveis; viajantes frequentes; afiliados de cartão/milhas; consultores de emissão (plano
Consultor/Agência).

**O que o MVP NÃO faz:** não emite passagem, não é agência de viagem, não garante preço ou
disponibilidade. Isso é regra de produto E de compliance — todo resultado de busca/alerta traz o
aviso de "confirme no site oficial antes de comprar".

## 2. Ordem de construção (o que entra no MVP, nesta ordem)

1. Estrutura Next.js + Supabase + auth
2. Banco (schema + RLS) + tipos
3. Dashboard
4. Calculadora de pontos (não depende de nenhuma API — maior razão custo/benefício)
5. Busca de voos (mock)
6. Busca de hotéis (mock)
7. Motor de score (`OpportunityEngine`)
8. Alertas
9. Promoções + Programas (conteúdo cadastrado por admin)
10. Consultor IA
11. Admin
12. Stripe (planos)
13. E-mail (Resend)
14. WhatsApp (abstrato)
15. Integrações reais (Amadeus/Duffel/Booking) — **fora do MVP, só a interface fica pronta**

## 3. Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Componentes estilo shadcn/ui (escritos à mão, sem depender do CLI de registry)
- Supabase: Auth, Postgres, RLS, Storage (futuro), Edge Functions (futuro)
- Stripe (assinaturas)
- Resend (e-mail transacional)
- WhatsApp via Evolution API/Z-API (módulo abstrato, sem credencial no MVP)
- Cron via Vercel Cron (rotas `/api/cron/*` protegidas por header secreto)
- Deploy: Vercel

## 4. Fontes externas (arquitetura pronta, integração real fora do MVP)

`lib/providers/*`: `FlightProvider`, `HotelProvider`, `PointsProvider`, `PromotionProvider`.
Implementações no MVP: `MockFlightProvider`, `MockHotelProvider`, `ManualPromotionProvider`.
Stubs preparados (não implementados): `AmadeusProvider`, `BookingProvider`, `DuffelProvider`.
Se a env var da API não existir, o provider real nem é instanciado — cai automaticamente no
mock, o app nunca quebra por falta de credencial.

## 5. Planos (Stripe)

| Plano | Preço | Buscas | Alertas | Canais | Extras |
|---|---|---|---|---|---|
| Free | R$0 | 3/dia | 1 | — | calculadora simples, promoções públicas |
| Premium | R$29,90/mês | ilimitadas | 10 | e-mail | comparação $ vs pontos, ranking, histórico |
| Pro | R$79,90/mês | ilimitadas | 50 | e-mail + WhatsApp | IA consultora, datas flexíveis, hotéis com pontos |
| Consultor/Agência | R$199/mês | ilimitadas | 50 por cliente | e-mail + WhatsApp | multi-cliente, relatórios, exportação |

## 6. Banco de dados (Supabase/Postgres)

Tabelas (todas com RLS — ver `supabase/migrations/0001_schema.sql`):
`profiles`, `loyalty_programs`, `user_loyalty_programs`, `flight_searches`, `flight_results`,
`hotel_searches`, `hotel_results`, `alerts`, `opportunities`, `promotions`, `subscriptions`,
`notification_logs`.

**Regra de segurança não-negociável:** `profiles.role` e `profiles.plan` nunca são atualizáveis
pelo próprio usuário via RLS policy — só por `service_role` (webhook Stripe / admin action).

## 7. Telas do MVP

`/`, `/login`, `/cadastro`, `/onboarding`, `/dashboard`, `/voos`, `/hoteis`, `/calculadora`,
`/alertas`, `/promocoes`, `/programas`, `/consultor-ia`, `/perfil`, `/assinatura`, `/admin`,
`/admin/promocoes`, `/admin/programas`, `/admin/oportunidades`, `/termos`, `/privacidade`,
`/politica-afiliados`, `/aviso-precos`.

## 8. Motor de score (`OpportunityEngine`)

```
valor_milheiro = ((preco_dinheiro - taxas_emissao) / pontos_usados) * 1000
custo_real     = taxas + custo_de_aquisicao_dos_pontos
economia       = preco_dinheiro - custo_real
```

Score 0–100 pondera: economia %, valor do milheiro vs média do programa, flexibilidade de
datas, taxas, escalas, urgência da promoção.
Classificação: 90–100 imperdível · 75–89 excelente · 60–74 bom · 40–59 normal · <40 não
recomendado. Recomendação é sempre textual e específica (nunca só "mais barato") — ver exemplos
no prompt original §18.

## 9. Roadmap futuro (fora do MVP, não construir agora)

App mobile, extensão Chrome, bot Telegram, emissão assistida, leitura de promoções via Gmail,
importação automática de saldo, OCR de extrato, calendário de baixa temporada, mapa de destinos
baratos, ranking de cartões, marketplace de consultores, white-label para agências, comunidade.

## 10. Pendências manuais (ver README.md para o passo a passo completo)

Criar projeto Supabase real, configurar `.env`, Stripe, Resend, Evolution API/Z-API, solicitar
acesso Amadeus/Skyscanner/Booking, configurar domínio + webhooks, deploy Vercel, testar RLS,
testar assinatura, testar alertas ponta a ponta.
