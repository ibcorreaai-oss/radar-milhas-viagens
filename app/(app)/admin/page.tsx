import Link from 'next/link';
import { Users, Bell, Tag, Sparkles, Compass, ArrowRight } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { AdminTable } from '@/components/admin-table';
import { cn, formatDateTime } from '@/lib/utils';
import type { NotificationLog } from '@/lib/types';

const CHANNEL_LABEL: Record<NotificationLog['channel'], string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  push: 'Push',
};

const STATUS_BADGE: Record<NotificationLog['status'], 'success' | 'destructive' | 'secondary'> = {
  sent: 'success',
  failed: 'destructive',
  skipped: 'secondary',
};

const STATUS_LABEL: Record<NotificationLog['status'], string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  skipped: 'Ignorado',
};

export default async function AdminPage() {
  // Defesa em profundidade — o middleware já bloqueia /admin/* para
  // quem não é admin, isto cobre o caso de a página ser renderizada
  // via alguma rota interna que não passe pelo middleware.
  await requireAdmin();

  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: activeAlertsCount },
    { count: activePromotionsCount },
    { count: opportunitiesCount },
    { count: worldEventsCount },
    { data: recentLogsData },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('promotions').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }),
    supabase.from('world_events').select('id', { count: 'exact', head: true }),
    supabase.from('notification_logs').select('*').order('sent_at', { ascending: false }).limit(10),
  ]);

  const recentLogs = (recentLogsData ?? []) as NotificationLog[];

  const stats = [
    { label: 'Usuários cadastrados', value: usersCount ?? 0, icon: Users },
    { label: 'Alertas ativos', value: activeAlertsCount ?? 0, icon: Bell },
    { label: 'Promoções ativas', value: activePromotionsCount ?? 0, icon: Tag },
    { label: 'Oportunidades cadastradas', value: opportunitiesCount ?? 0, icon: Sparkles },
    { label: 'Eventos no World Radar', value: worldEventsCount ?? 0, icon: Compass },
  ];

  const quickLinks = [
    { href: '/admin/usuarios', label: 'Usuários' },
    { href: '/admin/metricas', label: 'Métricas de negócio' },
    { href: '/admin/promocoes', label: 'Gerenciar promoções' },
    { href: '/admin/programas', label: 'Gerenciar programas' },
    { href: '/admin/oportunidades', label: 'Gerenciar oportunidades' },
    { href: '/admin/eventos', label: 'Gerenciar eventos (World Radar)' },
    { href: '/admin/estadias', label: 'Gerenciar estadias (Stay Experience)' },
    { href: '/admin/cruzeiros', label: 'Gerenciar cruzeiros (Cruise Radar)' },
    { href: '/admin/treinamentos', label: 'Central de Treinamentos' },
    { href: '/admin/funcionalidades', label: 'Funcionalidades (feature flags)' },
    { href: '/admin/auditoria', label: 'Auditoria' },
  ];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-muted-foreground">Painel operacional do Radar Milhas & Viagens.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className={cn(buttonVariants({ variant: 'outline' }))}>
            {link.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas notificações enviadas</CardTitle>
          <CardDescription>10 registros mais recentes de e-mail/WhatsApp/Telegram/push.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTable
            rows={recentLogs}
            emptyTitle="Nenhuma notificação registrada ainda"
            emptyDescription="Os disparos de alerta aparecem aqui assim que o motor de notificação rodar."
            columns={[
              { header: 'Canal', cell: (log) => CHANNEL_LABEL[log.channel] },
              {
                header: 'Status',
                cell: (log) => <Badge variant={STATUS_BADGE[log.status]}>{STATUS_LABEL[log.status]}</Badge>,
              },
              { header: 'Enviado em', cell: (log) => formatDateTime(log.sent_at) },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
