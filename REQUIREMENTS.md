# REQUIREMENTS.md — Radar Milhas & Viagens

> Documento de requisitos. Escrito em 25/08/2026 (ETAPA 11 do Igor), a partir do estado real
> do produto (não aspiracional — cada requisito abaixo já está implementado; o que falta
> aparece marcado como pendente).
>
> **Regra que este documento fixa:** requisitos **funcionais** (o que o produto faz) podem
> aparecer refletidos em telas, copy e navegação. Requisitos **não funcionais** (performance,
> segurança, escalabilidade, observabilidade) **nunca** viram texto de interface — eles vivem
> só neste documento e nos docs técnicos linkados (`SYSTEM_ARCHITECTURE.md`,
> `PERFORMANCE.md`, `DATA_QUALITY.md`, `OBSERVABILITY.md`, `DISASTER_RECOVERY.md`). Um
> usuário final nunca deveria ler "cache por requisição" ou "RLS" em nenhuma tela do app.

## 1. Requisitos funcionais

Agrupados por módulo. Cada linha é algo que o usuário consegue fazer hoje, de verdade.

### 1.1 Conta e acesso
- Cadastrar conta com e-mail/senha ou Google OAuth
- Confirmar e-mail (quando ativado no projeto Supabase) via link
- Fazer login / logout
- Recuperar senha esquecida por e-mail
- Completar onboarding progressivo (origem, estilo de viagem, programas de pontos) — pulável
- Editar perfil (dados pessoais, preferências de busca, canais de notificação)
- Gerenciar assinatura (assinar, trocar de plano, cancelar) via Stripe Billing Portal

### 1.2 Busca e comparação (Optimize)
- Buscar hospedagem por cidade/datas/hóspedes, com autocomplete de destino, calendário e
  seletor de hóspedes
- Buscar voos por origem/destino/datas, com os mesmos componentes de busca
- Marcar datas flexíveis na busca
- Ver resultado com preço em dinheiro **e** em pontos lado a lado, taxas, cancelamento,
  score de oportunidade (0-100) e recomendação em texto simples
- Comparar dinheiro vs pontos com valor do milheiro calculado automaticamente

### 1.3 Carteira de pontos
- Consultar catálogo de programas de fidelidade (nome, tipo, valor médio do milheiro,
  parceiros de transferência)
- Cadastrar saldo próprio por programa, com custo estimado de aquisição por 1.000 pontos
- Remover um programa da carteira

### 1.4 Alertas (núcleo do produto)
- Criar alerta de voo, hotel ou transferência bonificada, com critérios (preço máximo,
  pontos máximos, programa, datas, classe)
- Ativar/desativar/excluir um alerta
- Receber notificação por e-mail (todos os planos pagos) ou WhatsApp (Pro/Consultor) quando
  um alerta bate o critério — checagem automática recorrente (frequência varia por plano)

### 1.5 Descoberta (Discover / World Radar)
- Explorar eventos do mundo (festivais, esportes, fenômenos naturais, etc.) com filtro por
  categoria e mês
- Ver Experience Score explicável por evento (por que esse score, quando reservar)
- Salvar evento (ou item livre) numa Bucket List pessoal

### 1.6 Conteúdo curado
- Ver promoções ativas (transferência bonificada, compra de pontos, cupons)
- Ver oportunidades em destaque na vitrine pública/dashboard

### 1.7 Ferramentas
- Calculadora de pontos (dinheiro vs pontos, comprar pontos, transferência bonificada)
- Consultor IA — tirar dúvida sobre uso de pontos em linguagem natural (com fallback de
  regras quando não há credencial de IA configurada)

### 1.8 Administração (papel `admin`)
- CRUD de oportunidades, promoções, programas de fidelidade e eventos (World Radar)
- Painel operacional (contadores, últimas notificações enviadas)
- Métricas de negócio: crescimento, conversão, ativação, churn, pontos de abandono,
  oportunidades de upsell/cross-sell, cancelamentos recentes (`/admin/metricas`)

### 1.9 Institucional / legal
- Termos de uso, política de privacidade, política de afiliados, aviso de não garantia de
  preço — todas páginas públicas, indexáveis

### 1.10 Preferência de interface
- Alternar tema claro/escuro/sistema, persistido entre sessões

## 2. Requisitos funcionais pendentes (roadmap, não implementados)

Ver `IMPLEMENTATION_PLAN.md` para a lista completa por fase. Os de maior prioridade:
Stay Experience (hospedagem extraordinária), Cruise Radar, alertas automáticos de Bucket
List, modo "Quero viajar" (busca inversa por orçamento), Concierge IA com dado real,
integração com provider de voo/hotel real (Amadeus/Duffel/Booking — hoje só mock).

## 3. Requisitos não funcionais

**Nunca aparecem em UI/copy — referência técnica interna apenas.**

| Categoria | Requisito | Documento fonte |
|---|---|---|
| Performance | Cache por requisição, queries sem overfetch, streaming (loading states) | `PERFORMANCE.md` |
| Segurança | RLS em toda tabela sensível, 3 camadas de autorização, segredo nunca no client | `SYSTEM_ARCHITECTURE.md` §5, `DATA_QUALITY.md` |
| Qualidade de dado | Validação Zod antes de gravar, unicidade, integridade referencial | `DATA_QUALITY.md` |
| Observabilidade | Logs estruturados categorizados, alerta crítico automático, healthcheck público | `OBSERVABILITY.md` |
| Recuperação de desastre | Backup (PITR/dump), migrations sempre aditivas, rollback de deploy | `DISASTER_RECOVERY.md` |
| Escalabilidade | Serverless (Vercel), connection pooling (Supabase), sem otimização prematura | `SYSTEM_ARCHITECTURE.md` §12 |
| Disponibilidade | Nunca trava por falta de credencial de integração externa (fallback/mock) | `SYSTEM_ARCHITECTURE.md` §6 |
| Versionamento | Branch por feature/fix, push automático, `.env` nunca commitado | `README.md` §Versionamento |

## 4. Fora de escopo (decisão explícita)

Emissão de passagem, intermediação de reserva, garantia de preço/disponibilidade — o produto
é comparador e vigia de preço, nunca agência de viagem (ver `/aviso-precos`, `/termos`).
