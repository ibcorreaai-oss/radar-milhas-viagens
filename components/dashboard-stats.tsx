import type { LucideIcon } from 'lucide-react';
import { Wallet, Bell, Sparkles, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// Linha de estatísticas rápidas do dashboard — puramente apresentacional,
// recebe os números já calculados pela page (que faz as queries).
export function DashboardStats({
  estimatedPointsValue,
  activeAlertsCount,
  featuredOpportunitiesCount,
  activePromotionsCount,
}: {
  estimatedPointsValue: number;
  activeAlertsCount: number;
  featuredOpportunitiesCount: number;
  activePromotionsCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        icon={Wallet}
        label="Valor estimado dos seus pontos"
        value={formatBRL(estimatedPointsValue)}
        hint="Soma dos programas cadastrados"
      />
      <StatCard
        icon={Bell}
        label="Alertas ativos"
        value={String(activeAlertsCount)}
        hint={activeAlertsCount === 0 ? 'Nenhum alerta criado ainda' : 'Vigiando preços por você'}
      />
      <StatCard
        icon={Sparkles}
        label="Oportunidades em destaque"
        value={String(featuredOpportunitiesCount)}
        hint="Melhor score do momento"
      />
      <StatCard
        icon={Tag}
        label="Promoções ativas agora"
        value={String(activePromotionsCount)}
        hint="Transferência, compra de pontos e mais"
      />
    </div>
  );
}
