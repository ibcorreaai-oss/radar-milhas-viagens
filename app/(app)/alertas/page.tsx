import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/plans';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { formatBRL, formatPoints, formatDateTime } from '@/lib/utils';
import type { Alert } from '@/lib/types';
import { AlertForm } from './alert-form';
import { toggleAlert, deleteAlert } from './actions';

const ALERT_TYPE_LABEL: Record<Alert['type'], string> = {
  voo: 'Voo',
  hotel: 'Hotel',
  transferencia: 'Transferência',
};

export default async function AlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const ctx = await getUserContext();

  if (!ctx) {
    return (
      <div className="space-y-6 p-6">
        <EmptyState
          title="Não foi possível carregar seus alertas"
          description="Sua sessão pode ter expirado. Tente entrar novamente."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: alertsData }, { data: programsData }] = await Promise.all([
    supabase.from('alerts').select('*').eq('user_id', ctx.userId).order('created_at', { ascending: false }),
    supabase.from('loyalty_programs').select('name').eq('active', true).order('name'),
  ]);

  const alerts = (alertsData ?? []) as Alert[];
  const programNames = ((programsData ?? []) as { name: string }[]).map((p) => p.name);
  const maxAlerts = PLANS[ctx.plan].maxAlerts;

  const limitReached = params.limite === '1';
  const success = params.sucesso === '1';
  const isFirstAlert = params.primeiro === '1';
  const erro = typeof params.erro === 'string' ? params.erro : undefined;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
        <p className="mt-1 text-muted-foreground">
          Configure alertas de voo, hotel ou transferência bonificada — a gente avisa quando valer
          a pena.
        </p>
      </div>

      {limitReached && (
        <Card className="border-warning">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p>
              Você atingiu o limite de alertas do seu plano ({maxAlerts}). Exclua um alerta
              existente ou faça upgrade para criar mais.
            </p>
            <Link href="/assinatura">
              <Button size="sm">Ver planos</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-success">
          <CardContent className="p-4 text-sm">
            {isFirstAlert
              ? '🎉 Primeiro alerta criado! A partir de agora, o Radar vigia esse preço por você.'
              : 'Alerta criado com sucesso.'}
          </CardContent>
        </Card>
      )}

      {erro && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm">
            {erro === 'nome_obrigatorio'
              ? 'Dê um nome para o alerta antes de salvar (e confira se os outros campos estão dentro do esperado).'
              : erro === 'programa_invalido'
                ? 'O programa de fidelidade selecionado não é válido. Escolha um da lista.'
                : 'Não foi possível salvar o alerta. Tente novamente.'}
          </CardContent>
        </Card>
      )}

      <AlertForm plan={ctx.plan} currentCount={alerts.length} maxAlerts={maxAlerts} programNames={programNames} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Seus alertas ({alerts.length}/{maxAlerts})
        </h2>

        {alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Você ainda não tem alertas"
            description="Crie seu primeiro alerta acima e a gente avisa quando encontrar uma boa oportunidade."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {alerts.map((alert) => {
              const route = [alert.origin, alert.destination].filter(Boolean).join(' → ');
              const location = route || alert.city || null;

              return (
                <Card key={alert.id}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        {location && <p className="text-sm text-muted-foreground">{location}</p>}
                      </div>
                      <Badge variant={alert.active ? 'success' : 'secondary'}>
                        {alert.active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{ALERT_TYPE_LABEL[alert.type]}</Badge>
                      {alert.max_cash_price != null && (
                        <Badge variant="outline">Até {formatBRL(alert.max_cash_price)}</Badge>
                      )}
                      {alert.max_points_price != null && (
                        <Badge variant="outline">
                          {alert.type === 'transferencia'
                            ? `Bônus ≥ ${alert.max_points_price}%`
                            : `Até ${formatPoints(alert.max_points_price)} pts`}
                        </Badge>
                      )}
                      {alert.channel_email && <Badge variant="secondary">E-mail</Badge>}
                      {alert.channel_whatsapp && <Badge variant="secondary">WhatsApp</Badge>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Último disparo:{' '}
                      {alert.last_triggered_at ? formatDateTime(alert.last_triggered_at) : 'nunca'}
                    </p>

                    <div className="flex gap-2 pt-1">
                      <form action={toggleAlert.bind(null, alert.id, !alert.active)}>
                        <Button type="submit" variant="outline" size="sm">
                          {alert.active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </form>
                      <form action={deleteAlert.bind(null, alert.id)}>
                        <ConfirmSubmitButton
                          variant="destructive"
                          size="sm"
                          confirmMessage={`Excluir o alerta "${alert.name}"? Você para de ser avisado sobre essa oportunidade.`}
                        >
                          Excluir
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
