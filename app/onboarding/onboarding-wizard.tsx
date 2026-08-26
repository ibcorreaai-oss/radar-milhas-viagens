'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MascotAvatar } from '@/components/onboarding/mascot-avatar';
import { AvatarMessage } from '@/components/onboarding/avatar-message';
import type { CabinClass, LoyaltyProgram, Profile, UserLoyaltyProgram } from '@/lib/types';
import { completeOnboarding, type OnboardingState } from './actions';

const CABIN_CLASS_LABEL: Record<CabinClass, string> = {
  economica: 'Econômica',
  executiva: 'Executiva',
  primeira: 'Primeira classe',
  qualquer: 'Qualquer',
};

const PROGRAM_TYPE_LABEL: Record<LoyaltyProgram['type'], string> = {
  banco: 'Banco/Cartão',
  companhia_aerea: 'Companhia aérea',
  hotel: 'Hotel',
  coalizao: 'Coalizão',
};

// ETAPA 18 (ver ENGAGEMENT_UX.md) — roteiro da "Rada", mascote do
// onboarding. Curto de propósito: o objetivo é reduzir dúvida e aumentar
// ativação, não segurar o usuário numa apresentação longa. Cada tela é
// pulável (ver handleSkipIntro/handleContinue) — o texto aqui é só o que
// aparece com efeito de "digitando"; a leitura em voz alta usa o mesmo
// texto via AvatarMessage.
const AVATAR_MESSAGES = [
  'Oi! Eu sou a Rada 📡, a guia do Radar Milhas & Viagens. Vou te mostrar em menos de um minuto como funciona por aqui — ou clique em "Pular tudo" se preferir descobrir sozinho.',
  'A gente compara o preço da sua viagem em dinheiro E em pontos/milhas, e só te avisa quando realmente vale a pena usar pontos — sem planilha, sem conta manual.',
  'Configure alertas de voos, hotéis e transferência bonificada, favorite o que te interessar e tire dúvidas com o Consultor IA sempre que quiser.',
  'Você tem 5 dias grátis pra testar tudo. As próximas telas são só pra deixar seus alertas mais precisos — pode pular qualquer uma, dá pra completar depois no seu Perfil.',
];

const FORM_STEP_KEYS = ['origem', 'programas', 'preferencias', 'notificacoes'] as const;
type FormStepKey = (typeof FORM_STEP_KEYS)[number];

const FORM_STEP_TITLES: Record<FormStepKey, string> = {
  origem: 'De onde você viaja',
  programas: 'Seus programas de pontos',
  preferencias: 'Preferências de viagem',
  notificacoes: 'Como você quer ser avisado',
};

const TOTAL_STEPS = AVATAR_MESSAGES.length + FORM_STEP_KEYS.length;

const initialState: OnboardingState = {};

function SubmitButton({ label, skipValidation }: { label: string; skipValidation?: boolean }) {
  const { pending } = useFormStatus();
  return (
    // "Pular tudo" precisa de formNoValidate: sem isso, o campo `phone`
    // (required só quando WhatsApp está ligado) bloqueia o clique com a
    // validação nativa do navegador antes da Server Action rodar — mesmo
    // bug já achado e corrigido na ETAPA 15.1 pro botão "Reenviar código"
    // (ver app/(auth)/login/login-form.tsx), reproduzido ao vivo aqui.
    // `name="intent" value="skip"` avisa a Server Action pra também
    // ignorar a exigência de telefone (bypassar só a validação do
    // navegador não bastaria — a Server Action tem a mesma checagem).
    <Button
      type="submit"
      size="lg"
      name={skipValidation ? 'intent' : undefined}
      value={skipValidation ? 'skip' : undefined}
      formNoValidate={skipValidation}
      disabled={pending}
    >
      {pending ? 'Salvando...' : label}
    </Button>
  );
}

export function OnboardingWizard({
  profile,
  programs,
  userPrograms,
}: {
  profile: Profile | null;
  programs: LoyaltyProgram[];
  userPrograms: UserLoyaltyProgram[];
}) {
  const [state, formAction] = useActionState(completeOnboarding, initialState);

  const [step, setStep] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(
    () => new Set(userPrograms.map((up) => up.program_id))
  );
  const [flexibleDates, setFlexibleDates] = useState(profile?.flexible_dates ?? false);
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(profile?.notify_whatsapp ?? false);
  const [cabinClass, setCabinClass] = useState<CabinClass>(profile?.cabin_class_preference ?? 'qualquer');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  const [homeAirportValue, setHomeAirportValue] = useState(profile?.home_airport ?? '');
  const [destinationsValue, setDestinationsValue] = useState(
    profile?.favorite_destinations?.join(', ') ?? ''
  );
  const [monthlyBudgetValue, setMonthlyBudgetValue] = useState(
    profile?.monthly_budget != null ? String(profile.monthly_budget) : ''
  );

  // ETAPA 18 — achado testando ao vivo: cada Card de etapa é renderizado
  // condicionalmente (só a etapa atual existe no DOM). Um <input> com
  // `name` dentro do Card some do DOM assim que o usuário navega pra
  // outra etapa — e um <input> fora do <form> no momento do submit não
  // entra no FormData, mesmo que o estado React ainda tenha o valor certo
  // (visto ao vivo: preencher "aeroporto de origem", ir pra próxima etapa
  // e concluir salvava em branco). Por isso home_airport/
  // favorite_destinations/monthly_budget/saldo de cada programa viram
  // <input type="hidden"> fixos aqui embaixo (mesmo padrão que
  // phone/cabin_class_preference já usavam) — os campos visíveis dentro
  // de cada Card ficam sem `name`, só espelham o valor.
  const [balances, setBalances] = useState<Record<string, string>>(() =>
    Object.fromEntries(userPrograms.map((up) => [up.program_id, String(up.points_balance)]))
  );

  function setBalance(programId: string, value: string) {
    setBalances((prev) => ({ ...prev, [programId]: value }));
  }

  function toggleProgram(id: string) {
    setSelectedPrograms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const isAvatarStep = step < AVATAR_MESSAGES.length;
  const formStepIndex = step - AVATAR_MESSAGES.length;
  const isLastStep = step === TOTAL_STEPS - 1;
  const isFirstFormStep = formStepIndex === 0;

  function goNext() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }
  function skipIntro() {
    setStep(AVATAR_MESSAGES.length);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="flexible_dates" value={flexibleDates ? 'true' : 'false'} />
      <input type="hidden" name="notify_email" value={notifyEmail ? 'true' : 'false'} />
      <input type="hidden" name="notify_whatsapp" value={notifyWhatsapp ? 'true' : 'false'} />
      <input type="hidden" name="cabin_class_preference" value={cabinClass} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="home_airport" value={homeAirportValue} />
      <input type="hidden" name="favorite_destinations" value={destinationsValue} />
      <input type="hidden" name="monthly_budget" value={monthlyBudgetValue} />
      {Array.from(selectedPrograms).map((id) => (
        <input key={id} type="hidden" name="programs" value={id} />
      ))}
      {Array.from(selectedPrograms).map((id) => (
        <input key={`balance_${id}`} type="hidden" name={`balance_${id}`} value={balances[id] ?? ''} />
      ))}

      <div className="flex items-center justify-between gap-3">
        <Progress value={((step + 1) / TOTAL_STEPS) * 100} label="Progresso do onboarding" className="flex-1" />
        {/* "Pular tudo": disponível em QUALQUER etapa (pedido explícito do
            Igor). Submete o que já foi preenchido até aqui — nada é
            obrigatório, então mesmo na primeira tela isso já é um
            onboarding_done=true válido. */}
        <SubmitButton label="Pular tudo" skipValidation />
      </div>

      {isAvatarStep ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-start sm:text-left">
            <MascotAvatar speaking={speaking} />
            <div className="flex-1">
              <AvatarMessage
                text={AVATAR_MESSAGES[step]}
                autoSpeak={autoSpeak}
                onAutoSpeakChange={setAutoSpeak}
                onSpeakingChange={setSpeaking}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {step > 0 && (
                  <Button type="button" variant="ghost" onClick={goBack} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={skipIntro} className="gap-1.5">
                  <SkipForward className="h-4 w-4" /> Pular apresentação
                </Button>
                <Button type="button" onClick={goNext} className="gap-1.5">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FormStepCard
          stepKey={FORM_STEP_KEYS[formStepIndex]}
          profile={profile}
          programs={programs}
          selectedPrograms={selectedPrograms}
          toggleProgram={toggleProgram}
          balances={balances}
          setBalance={setBalance}
          flexibleDates={flexibleDates}
          setFlexibleDates={setFlexibleDates}
          notifyEmail={notifyEmail}
          setNotifyEmail={setNotifyEmail}
          notifyWhatsapp={notifyWhatsapp}
          setNotifyWhatsapp={setNotifyWhatsapp}
          cabinClass={cabinClass}
          setCabinClass={setCabinClass}
          phone={phone}
          setPhone={setPhone}
          homeAirportValue={homeAirportValue}
          setHomeAirportValue={setHomeAirportValue}
          destinationsValue={destinationsValue}
          setDestinationsValue={setDestinationsValue}
          monthlyBudgetValue={monthlyBudgetValue}
          setMonthlyBudgetValue={setMonthlyBudgetValue}
        />
      )}

      {!isAvatarStep && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={isFirstFormStep ? skipIntro : goBack}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex flex-wrap gap-2">
            {isLastStep ? (
              <SubmitButton label="Concluir e ir para o dashboard" />
            ) : (
              <>
                <Button type="button" variant="outline" onClick={goNext} className="gap-1.5">
                  Pular esta etapa
                </Button>
                <Button type="button" onClick={goNext} className="gap-1.5">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

interface FormStepCardProps {
  stepKey: FormStepKey;
  profile: Profile | null;
  programs: LoyaltyProgram[];
  selectedPrograms: Set<string>;
  toggleProgram: (id: string) => void;
  balances: Record<string, string>;
  setBalance: (programId: string, value: string) => void;
  flexibleDates: boolean;
  setFlexibleDates: (v: boolean) => void;
  notifyEmail: boolean;
  setNotifyEmail: (v: boolean) => void;
  notifyWhatsapp: boolean;
  setNotifyWhatsapp: (v: boolean) => void;
  cabinClass: CabinClass;
  setCabinClass: (v: CabinClass) => void;
  phone: string;
  setPhone: (v: string) => void;
  homeAirportValue: string;
  setHomeAirportValue: (v: string) => void;
  destinationsValue: string;
  setDestinationsValue: (v: string) => void;
  monthlyBudgetValue: string;
  setMonthlyBudgetValue: (v: string) => void;
}

// As 4 telas de dados do onboarding — o mesmo conteúdo que já existia num
// form de página única (ETAPA 1), só reorganizado em passos individuais
// pra ficar pulável etapa por etapa (pedido explícito do Igor na ETAPA 18;
// ver ENGAGEMENT_UX.md pelo porquê disso ter ficado de fora até agora).
// Nenhum campo é obrigatório — "pular" e "continuar" navegam igual, a
// diferença é só o rótulo (reduz a sensação de compromisso).
function FormStepCard(props: FormStepCardProps) {
  const { stepKey } = props;

  if (stepKey === 'origem') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{FORM_STEP_TITLES.origem}</CardTitle>
          <CardDescription>Usamos isso para priorizar os alertas de voo. Pode deixar em branco.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="home_airport">Cidade ou aeroporto de origem</Label>
            <Input
              id="home_airport"
              placeholder="Ex: Fortaleza (FOR) ou GRU"
              value={props.homeAirportValue}
              onChange={(e) => props.setHomeAirportValue(e.target.value)}
            />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label htmlFor="favorite_destinations">Destinos favoritos</Label>
            <Input
              id="favorite_destinations"
              placeholder="Ex: Lisboa, Nova York, Buenos Aires"
              value={props.destinationsValue}
              onChange={(e) => props.setDestinationsValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separe os destinos por vírgula.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stepKey === 'programas') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{FORM_STEP_TITLES.programas}</CardTitle>
          <CardDescription>
            Marque os programas que você usa e, se souber, o saldo aproximado. Dá pra ajustar
            depois no seu perfil — ou pular esta etapa inteira.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.programs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum programa cadastrado ainda — você pode adicionar depois no seu perfil.
            </p>
          )}
          {props.programs.map((program) => {
            const checked = props.selectedPrograms.has(program.id);
            return (
              <div
                key={program.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={checked}
                    onCheckedChange={() => props.toggleProgram(program.id)}
                    id={`program-${program.id}`}
                  />
                  <div>
                    <Label htmlFor={`program-${program.id}`} className="cursor-pointer">
                      {program.name}
                    </Label>
                    <div className="mt-1">
                      <Badge variant="outline">{PROGRAM_TYPE_LABEL[program.type]}</Badge>
                    </div>
                  </div>
                </div>
                {checked && (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Saldo aproximado"
                    value={props.balances[program.id] ?? ''}
                    onChange={(e) => props.setBalance(program.id, e.target.value)}
                    className="sm:w-44"
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  if (stepKey === 'preferencias') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{FORM_STEP_TITLES.preferencias}</CardTitle>
          <CardDescription>Ajustam a nota e a recomendação dos alertas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cabin_class_preference_select">Classe preferida</Label>
            <Select
              id="cabin_class_preference_select"
              value={props.cabinClass}
              onChange={(e) => props.setCabinClass(e.target.value as CabinClass)}
            >
              {(Object.keys(CABIN_CLASS_LABEL) as CabinClass[]).map((value) => (
                <option key={value} value={value}>
                  {CABIN_CLASS_LABEL[value]}
                </option>
              ))}
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="flexible_dates_switch">Datas flexíveis</Label>
              <p className="text-xs text-muted-foreground">
                Aceito ver oportunidades em datas próximas às que eu buscar.
              </p>
            </div>
            <Switch
              id="flexible_dates_switch"
              checked={props.flexibleDates}
              onCheckedChange={props.setFlexibleDates}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="monthly_budget">Orçamento mensal para viagens (R$)</Label>
            <Input
              id="monthly_budget"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ex: 800"
              value={props.monthlyBudgetValue}
              onChange={(e) => props.setMonthlyBudgetValue(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{FORM_STEP_TITLES.notificacoes}</CardTitle>
        <CardDescription>Você pode mudar isso a qualquer momento no seu perfil.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notify_email_switch">Alertas por e-mail</Label>
            <p className="text-xs text-muted-foreground">
              Avisamos quando encontrarmos uma oportunidade que bate com o seu perfil.
            </p>
          </div>
          <Switch id="notify_email_switch" checked={props.notifyEmail} onCheckedChange={props.setNotifyEmail} />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notify_whatsapp_switch">Alertas por WhatsApp</Label>
            <p className="text-xs text-muted-foreground">Disponível nos planos Pro e Consultor/Agência.</p>
          </div>
          <Switch
            id="notify_whatsapp_switch"
            checked={props.notifyWhatsapp}
            onCheckedChange={props.setNotifyWhatsapp}
          />
        </div>

        {props.notifyWhatsapp && (
          <div className="space-y-1.5">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+55 11 91234-5678"
              value={props.phone}
              onChange={(e) => props.setPhone(e.target.value)}
              required={props.notifyWhatsapp}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
