'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScoreBadge } from '@/components/score-badge';
import { RecommendationBox } from '@/components/recommendation-box';
import { cn, formatBRL, formatPoints } from '@/lib/utils';
import {
  calcCustoReal,
  calcEconomia,
  calcValorMilheiro,
  evaluateOpportunity,
} from '@/lib/scoring/opportunity-engine';

// Programa de fidelidade do usuário, já achatado a partir do join feito no
// Server Component (user_loyalty_programs + loyalty_programs).
export interface UserProgramOption {
  id: string;
  programId: string;
  name: string;
  pointsBalance: number;
  estimatedCostPer1000: number | null;
  averageMileValue: number | null;
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function PointsCalculator({ userPrograms }: { userPrograms: UserProgramOption[] }) {
  return (
    <Tabs defaultValue="passagem">
      <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-4">
        <TabsTrigger value="passagem" className="whitespace-normal text-center text-xs sm:text-sm">
          Passagem: dinheiro vs pontos
        </TabsTrigger>
        <TabsTrigger value="hospedagem" className="whitespace-normal text-center text-xs sm:text-sm">
          Hospedagem: dinheiro vs pontos
        </TabsTrigger>
        <TabsTrigger value="comprar-pontos" className="whitespace-normal text-center text-xs sm:text-sm">
          Vale a pena comprar pontos?
        </TabsTrigger>
        <TabsTrigger value="transferir-bonus" className="whitespace-normal text-center text-xs sm:text-sm">
          Vale a pena transferir com bônus?
        </TabsTrigger>
      </TabsList>

      <TabsContent value="passagem">
        <TabPassagem userPrograms={userPrograms} />
      </TabsContent>
      <TabsContent value="hospedagem">
        <TabHospedagem userPrograms={userPrograms} />
      </TabsContent>
      <TabsContent value="comprar-pontos">
        <TabComprarPontos />
      </TabsContent>
      <TabsContent value="transferir-bonus">
        <TabTransferirBonus userPrograms={userPrograms} />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------
// Painel de resultado compartilhado entre "Passagem" e "Hospedagem"
// ---------------------------------------------------------------------
function ResultPanel({
  valorMilheiro,
  custoReal,
  economia,
  economiaPorPessoa,
  numPeople,
  score,
  recommendationText,
}: {
  valorMilheiro: number | null;
  custoReal: number;
  economia: number;
  economiaPorPessoa: number;
  numPeople: number;
  score: number;
  recommendationText: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Resultado</p>
        <ScoreBadge score={score} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricBox label="Valor do milheiro obtido" value={valorMilheiro != null ? formatBRL(valorMilheiro) : '—'} />
        <MetricBox label="Custo real da emissão" value={formatBRL(custoReal)} />
        <MetricBox label="Economia total" value={formatBRL(economia)} highlight={economia >= 0 ? 'good' : 'bad'} />
        {numPeople > 1 && (
          <MetricBox
            label={`Economia por pessoa (${numPeople})`}
            value={formatBRL(economiaPorPessoa)}
            highlight={economiaPorPessoa >= 0 ? 'good' : 'bad'}
          />
        )}
      </div>
      <RecommendationBox text={recommendationText} />
    </div>
  );
}

function MetricBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'good' | 'bad';
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-lg font-semibold',
          highlight === 'good' && 'text-success',
          highlight === 'bad' && 'text-destructive'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProgramSelect({
  userPrograms,
  value,
  onChange,
}: {
  userPrograms: UserProgramOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (userPrograms.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label htmlFor="program-select">Programa (opcional — prefila seu custo por 1.000 pontos)</Label>
      <Select id="program-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Digitar manualmente</option>
        {userPrograms.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · saldo {formatPoints(p.pointsBalance)} pts
          </option>
        ))}
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------
// TAB A — Passagem: dinheiro vs pontos
// ---------------------------------------------------------------------
function TabPassagem({ userPrograms }: { userPrograms: UserProgramOption[] }) {
  const [cashPrice, setCashPrice] = useState('');
  const [pointsNeeded, setPointsNeeded] = useState('');
  const [taxes, setTaxes] = useState('');
  const [costPer1000, setCostPer1000] = useState('');
  const [numPeople, setNumPeople] = useState('1');
  const [programId, setProgramId] = useState('');

  const selectedProgram = userPrograms.find((p) => p.id === programId) ?? null;

  function handleProgramChange(id: string) {
    setProgramId(id);
    const program = userPrograms.find((p) => p.id === id);
    if (program?.estimatedCostPer1000 != null) {
      setCostPer1000(String(program.estimatedCostPer1000));
    }
  }

  const cash = toNumber(cashPrice);
  const points = toNumber(pointsNeeded);
  const tax = toNumber(taxes);
  const people = Math.max(1, toNumber(numPeople) || 1);
  const cost1000 = costPer1000 !== '' ? toNumber(costPer1000) : null;

  const result = useMemo(() => {
    const custoAquisicao = cost1000 != null ? (points / 1000) * cost1000 : 0;
    const valorMilheiro = calcValorMilheiro(cash, tax, points);
    const custoReal = calcCustoReal(tax, custoAquisicao);
    const economia = calcEconomia(cash, custoReal);
    const economiaPorPessoa = economia / people;

    const evaluation = evaluateOpportunity({
      cashPrice: cash > 0 ? cash : null,
      pointsPrice: points > 0 ? points : null,
      taxes: tax,
      userCostPer1000: cost1000,
      averageMileValue: selectedProgram?.averageMileValue ?? null,
    });

    return { valorMilheiro, custoReal, economia, economiaPorPessoa, evaluation };
  }, [cash, tax, points, cost1000, people, selectedProgram]);

  const showResults = cash > 0 && points > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Passagem: dinheiro vs pontos</CardTitle>
        <CardDescription>
          Informe o preço da passagem em dinheiro e quantos pontos ela custaria emitida com milhas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pass-cash">Preço em dinheiro (R$)</Label>
            <Input id="pass-cash" type="number" min="0" step="0.01" inputMode="decimal" placeholder="1500.00" value={cashPrice} onChange={(e) => setCashPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass-points">Pontos necessários</Label>
            <Input id="pass-points" type="number" min="0" step="1" inputMode="numeric" placeholder="50000" value={pointsNeeded} onChange={(e) => setPointsNeeded(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass-taxes">Taxas de emissão (R$)</Label>
            <Input id="pass-taxes" type="number" min="0" step="0.01" inputMode="decimal" placeholder="120.00" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass-people">Número de pessoas</Label>
            <Input id="pass-people" type="number" min="1" step="1" inputMode="numeric" value={numPeople} onChange={(e) => setNumPeople(e.target.value)} />
          </div>
        </div>

        <ProgramSelect userPrograms={userPrograms} value={programId} onChange={handleProgramChange} />

        <div className="space-y-1.5">
          <Label htmlFor="pass-cost1000">Custo que você pagou por 1.000 pontos (R$, opcional)</Label>
          <Input
            id="pass-cost1000"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Deixe em branco se os pontos vieram de bônus/cartão"
            value={costPer1000}
            onChange={(e) => setCostPer1000(e.target.value)}
          />
        </div>

        <Separator />

        {showResults ? (
          <ResultPanel
            valorMilheiro={result.valorMilheiro}
            custoReal={result.custoReal}
            economia={result.economia}
            economiaPorPessoa={result.economiaPorPessoa}
            numPeople={people}
            score={result.evaluation.score}
            recommendationText={result.evaluation.recommendationText}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Preencha o preço em dinheiro e os pontos necessários para ver o resultado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// TAB B — Hospedagem: dinheiro vs pontos
// ---------------------------------------------------------------------
function TabHospedagem({ userPrograms }: { userPrograms: UserProgramOption[] }) {
  const [cashPrice, setCashPrice] = useState('');
  const [pointsPerNight, setPointsPerNight] = useState('');
  const [nights, setNights] = useState('1');
  const [taxes, setTaxes] = useState('');
  const [costPer1000, setCostPer1000] = useState('');
  const [programId, setProgramId] = useState('');

  const selectedProgram = userPrograms.find((p) => p.id === programId) ?? null;

  function handleProgramChange(id: string) {
    setProgramId(id);
    const program = userPrograms.find((p) => p.id === id);
    if (program?.estimatedCostPer1000 != null) {
      setCostPer1000(String(program.estimatedCostPer1000));
    }
  }

  const cash = toNumber(cashPrice);
  const perNight = toNumber(pointsPerNight);
  const numNights = Math.max(1, toNumber(nights) || 1);
  const points = perNight * numNights;
  const tax = toNumber(taxes);
  const cost1000 = costPer1000 !== '' ? toNumber(costPer1000) : null;

  const result = useMemo(() => {
    const custoAquisicao = cost1000 != null ? (points / 1000) * cost1000 : 0;
    const valorMilheiro = calcValorMilheiro(cash, tax, points);
    const custoReal = calcCustoReal(tax, custoAquisicao);
    const economia = calcEconomia(cash, custoReal);

    const evaluation = evaluateOpportunity({
      cashPrice: cash > 0 ? cash : null,
      pointsPrice: points > 0 ? points : null,
      taxes: tax,
      userCostPer1000: cost1000,
      averageMileValue: selectedProgram?.averageMileValue ?? null,
    });

    return { valorMilheiro, custoReal, economia, evaluation };
  }, [cash, tax, points, cost1000, selectedProgram]);

  const showResults = cash > 0 && points > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hospedagem: dinheiro vs pontos</CardTitle>
        <CardDescription>
          Informe a diária em dinheiro e quantos pontos por noite o hotel/programa cobra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hotel-cash">Preço da diária em dinheiro (R$)</Label>
            <Input id="hotel-cash" type="number" min="0" step="0.01" inputMode="decimal" placeholder="450.00" value={cashPrice} onChange={(e) => setCashPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-points">Pontos por noite</Label>
            <Input id="hotel-points" type="number" min="0" step="1" inputMode="numeric" placeholder="20000" value={pointsPerNight} onChange={(e) => setPointsPerNight(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-nights">Número de noites</Label>
            <Input id="hotel-nights" type="number" min="1" step="1" inputMode="numeric" value={nights} onChange={(e) => setNights(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotel-taxes">Taxas (R$)</Label>
            <Input id="hotel-taxes" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
          </div>
        </div>

        <ProgramSelect userPrograms={userPrograms} value={programId} onChange={handleProgramChange} />

        <div className="space-y-1.5">
          <Label htmlFor="hotel-cost1000">Custo que você pagou por 1.000 pontos (R$, opcional)</Label>
          <Input
            id="hotel-cost1000"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Deixe em branco se os pontos vieram de bônus/cartão"
            value={costPer1000}
            onChange={(e) => setCostPer1000(e.target.value)}
          />
        </div>

        {points > 0 && (
          <p className="text-xs text-muted-foreground">
            Total para a estadia: {formatPoints(points)} pontos ({formatPoints(perNight)}/noite × {numNights} noites)
          </p>
        )}

        <Separator />

        {showResults ? (
          <ResultPanel
            valorMilheiro={result.valorMilheiro}
            custoReal={result.custoReal}
            economia={result.economia}
            economiaPorPessoa={result.economia}
            numPeople={1}
            score={result.evaluation.score}
            recommendationText={result.evaluation.recommendationText}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Preencha a diária em dinheiro e os pontos por noite para ver o resultado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// TAB C — Vale a pena comprar pontos?
// ---------------------------------------------------------------------
function TabComprarPontos() {
  const [cashPrice, setCashPrice] = useState('');
  const [pointsNeeded, setPointsNeeded] = useState('');
  const [purchasePricePer1000, setPurchasePricePer1000] = useState('');
  const [taxes, setTaxes] = useState('');

  const cash = toNumber(cashPrice);
  const points = toNumber(pointsNeeded);
  const pricePer1000 = toNumber(purchasePricePer1000);
  const tax = toNumber(taxes);

  const result = useMemo(() => {
    const custoAquisicao = (points / 1000) * pricePer1000;
    const custoComprando = calcCustoReal(tax, custoAquisicao);
    const diferenca = cash - custoComprando;
    const valorMilheiro = calcValorMilheiro(cash, tax, points);

    const evaluation = evaluateOpportunity({
      cashPrice: cash > 0 ? cash : null,
      pointsPrice: points > 0 ? points : null,
      taxes: tax,
      userCostPer1000: pricePer1000 > 0 ? pricePer1000 : null,
    });

    return { custoComprando, diferenca, valorMilheiro, evaluation };
  }, [cash, tax, points, pricePer1000]);

  const showResults = cash > 0 && points > 0 && pricePer1000 > 0;

  const verdict = showResults
    ? result.diferenca > 0.005
      ? `Comprar pontos sai ${formatBRL(result.diferenca)} mais barato do que pagar direto em dinheiro.`
      : result.diferenca < -0.005
        ? `Pagar direto em dinheiro sai ${formatBRL(Math.abs(result.diferenca))} mais barato do que comprar pontos.`
        : 'Comprar pontos e pagar direto em dinheiro dão praticamente no mesmo valor.'
    : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vale a pena comprar pontos?</CardTitle>
        <CardDescription>
          Compare comprar os pontos que faltam (a um preço ofertado) com pagar a passagem/hotel direto em dinheiro.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="buy-cash">Preço em dinheiro (R$)</Label>
            <Input id="buy-cash" type="number" min="0" step="0.01" inputMode="decimal" placeholder="1500.00" value={cashPrice} onChange={(e) => setCashPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buy-points">Pontos necessários</Label>
            <Input id="buy-points" type="number" min="0" step="1" inputMode="numeric" placeholder="50000" value={pointsNeeded} onChange={(e) => setPointsNeeded(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buy-price1000">Preço de compra ofertado (R$ por 1.000 pontos)</Label>
            <Input id="buy-price1000" type="number" min="0" step="0.01" inputMode="decimal" placeholder="18.00" value={purchasePricePer1000} onChange={(e) => setPurchasePricePer1000(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buy-taxes">Taxas de emissão (R$)</Label>
            <Input id="buy-taxes" type="number" min="0" step="0.01" inputMode="decimal" placeholder="120.00" value={taxes} onChange={(e) => setTaxes(e.target.value)} />
          </div>
        </div>

        <Separator />

        {showResults ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Resultado</p>
              <ScoreBadge score={result.evaluation.score} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Custo comprando pontos" value={formatBRL(result.custoComprando)} />
              <MetricBox label="Pagando direto em dinheiro" value={formatBRL(cash)} />
            </div>
            {result.valorMilheiro != null && (
              <p className="text-xs text-muted-foreground">
                Valor do milheiro obtido: <span className="font-medium text-foreground">{formatBRL(result.valorMilheiro)}</span>
              </p>
            )}
            <RecommendationBox text={verdict} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Preencha preço em dinheiro, pontos necessários e o preço ofertado por 1.000 pontos para ver o resultado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------
// TAB D — Vale a pena transferir com bônus?
// ---------------------------------------------------------------------
const DESTINATION_PROGRAMS: { name: string; defaultValue: number }[] = [
  { name: 'Smiles', defaultValue: 19 },
  { name: 'LATAM Pass', defaultValue: 21 },
  { name: 'TAP Miles&Go', defaultValue: 17 },
  { name: 'Flying Blue', defaultValue: 24 },
  { name: 'Iberia Plus', defaultValue: 20 },
];

function resolveDestinationValue(name: string, userPrograms: UserProgramOption[]): number {
  const match = userPrograms.find((p) => p.name.toLowerCase().includes(name.toLowerCase()));
  if (match?.averageMileValue) return match.averageMileValue;
  const fallback = DESTINATION_PROGRAMS.find((d) => d.name === name);
  return fallback?.defaultValue ?? 20;
}

function TabTransferirBonus({ userPrograms }: { userPrograms: UserProgramOption[] }) {
  const [pointsOrigin, setPointsOrigin] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState('');
  const [destinationName, setDestinationName] = useState(DESTINATION_PROGRAMS[0].name);
  const [mileValue, setMileValue] = useState(() => String(resolveDestinationValue(DESTINATION_PROGRAMS[0].name, userPrograms)));

  function handleDestinationChange(name: string) {
    setDestinationName(name);
    setMileValue(String(resolveDestinationValue(name, userPrograms)));
  }

  const points = toNumber(pointsOrigin);
  const bonus = toNumber(bonusPercentage);
  const mileVal = toNumber(mileValue);

  const result = useMemo(() => {
    const pointsAfterBonus = points * (1 + bonus / 100);
    const valueWithBonus = (pointsAfterBonus / 1000) * mileVal;
    const valueWithoutBonus = (points / 1000) * mileVal;
    const gain = valueWithBonus - valueWithoutBonus;
    return { pointsAfterBonus, valueWithBonus, valueWithoutBonus, gain };
  }, [points, bonus, mileVal]);

  const showResults = points > 0 && mileVal > 0;

  const verdict = !showResults
    ? ''
    : bonus >= 80
      ? `Bônus de ${bonus}% está acima do usual (referência ~80%). Recomendação: transfira agora — o ganho estimado é de ${formatBRL(result.gain)} a mais do que sem bônus.`
      : bonus >= 50
        ? `Bônus de ${bonus}% é bom. Transferindo agora, o ganho estimado é de ${formatBRL(result.gain)} a mais do que sem bônus.`
        : bonus > 0
          ? `Bônus de ${bonus}% é modesto. O ganho estimado é de ${formatBRL(result.gain)} — avalie se vale esperar uma promoção de 70% ou mais antes de transferir.`
          : 'Sem bônus informado, transferir agora não traz vantagem em relação a transferir depois.';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vale a pena transferir com bônus?</CardTitle>
        <CardDescription>
          Simule quanto os pontos do banco de origem valeriam no programa de destino, com e sem o bônus de transferência.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="transfer-points">Pontos no banco de origem</Label>
            <Input id="transfer-points" type="number" min="0" step="1" inputMode="numeric" placeholder="30000" value={pointsOrigin} onChange={(e) => setPointsOrigin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-bonus">Bônus da transferência (%)</Label>
            <Input id="transfer-bonus" type="number" min="0" step="1" inputMode="numeric" placeholder="80" value={bonusPercentage} onChange={(e) => setBonusPercentage(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-destination">Programa de destino</Label>
            <Select id="transfer-destination" value={destinationName} onChange={(e) => handleDestinationChange(e.target.value)}>
              {DESTINATION_PROGRAMS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-mile-value">Valor médio do milheiro no destino (R$)</Label>
            <Input id="transfer-mile-value" type="number" min="0" step="0.01" inputMode="decimal" value={mileValue} onChange={(e) => setMileValue(e.target.value)} />
          </div>
        </div>

        <Separator />

        {showResults ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Resultado</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricBox label="Pontos após bônus" value={formatPoints(Math.round(result.pointsAfterBonus))} />
              <MetricBox label="Valor estimado com bônus" value={formatBRL(result.valueWithBonus)} />
              <MetricBox label="Valor estimado sem bônus" value={formatBRL(result.valueWithoutBonus)} />
              <MetricBox label="Ganho com o bônus" value={formatBRL(result.gain)} highlight={result.gain >= 0 ? 'good' : 'bad'} />
            </div>
            <RecommendationBox text={verdict} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Preencha os pontos de origem e o valor médio do milheiro no destino para ver o resultado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
