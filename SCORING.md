# SCORING.md — Motores de score do Radar Milhas & Viagens

Dois motores, deliberadamente separados (ver `ARCHITECTURE.md` #3):

## 1. OpportunityEngine (`lib/scoring/opportunity-engine.ts`) — pré-existente, intocado

Responde: **"vale a pena financeiramente, dinheiro vs pontos?"**

```
valor_milheiro = ((preco_dinheiro - taxas) / pontos_usados) * 1000
custo_real     = taxas + custo_de_aquisicao_dos_pontos
economia       = preco_dinheiro - custo_real
```

Score 0-100 pondera: valor do milheiro vs referência do programa, economia %,
flexibilidade de datas, escalas, urgência, raridade, bônus de transferência.
Classificação: 90-100 imperdível · 75-89 excelente · 60-74 bom · 40-59 normal · <40 não
recomendado. Recomendação sempre textual (nunca "mais barato" puro).

## 2. Experience Score (`lib/scoring/event-score.ts`) — novo, Fase 2

Responde: **"quão especial é a experiência, independente de preço?"**

Input: relevância (clássico/final/evento histórico...), once-in-a-lifetime, hidden gem,
status de confirmação, confiança da fonte (0-1), autoridade da fonte (1-10), dias até o
evento.

Score 0-100 começa em 50 e soma/subtrai por fator — 100% determinístico, sem chamada de
IA (segue a hierarquia de custo do PROMPT 3.0 §62: regras antes de modelo).

Toda chamada devolve a forma "explainable" do §79:

```ts
{
  score: number,
  label: string,          // "Experiência excepcional" | "Ótima oportunidade" | ...
  reasons: string[],      // positives + negatives concatenados
  positives: string[],
  negatives: string[],
  urgency: 'LOW' | 'MEDIUM' | 'HIGH',
  confidence: number,     // 0-1, ecoa o confidence_score do evento
}
```

### Book Now State (`deriveBookNowState`)

Derivado do score + urgência + status — nunca input manual do admin (garante que a UI
de "Por que agora?" nunca diverge do score mostrado):

```
status cancelado/adiado/finalizado  → monitorar
urgency HIGH + score >= 85          → comprar_agora
urgency HIGH + score >= 70          → comprar
score >= 80                         → boa_janela
score < 50                          → esperar
caso contrário                      → monitorar
```

## Por que não existe ainda um "Trip Opportunity Score" consolidado

O PROMPT 3.0 (§25-§26) pede um score único cruzando voo + milhas + evento + hotel +
sazonalidade. Isso exigiria dado real e simultâneo de voo/hotel/evento para uma mesma
viagem — hoje o World Radar tem dado curado manualmente (`is_mock`) e o
OpportunityEngine roda sobre buscas mock. Combiná-los agora seria inventar um número
sem lastro (proibido pelo §92). Fica para a Fase 5 do `IMPLEMENTATION_PLAN.md`, quando
houver volume real dos dois lados.
