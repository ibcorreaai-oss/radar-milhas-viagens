import type { Metadata } from 'next';
import { Gift } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromotionCard } from '@/components/promotion-card';
import { EmptyState } from '@/components/empty-state';
import type { Promotion } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Promoções de milhas e pontos',
  description:
    'Transferências bonificadas, compra de pontos e cupons ativos — curados manualmente, atualizados continuamente.',
};

export default async function PromocoesPage() {
  // Vitrine pública de verdade (RLS libera leitura anônima desde a
  // migration 0005 — ETAPA 11/SEO) — getUserContext só é usado aqui para
  // eventual personalização futura, não bloqueia a renderização.
  const ctx = await getUserContext();
  void ctx;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6">
        <EmptyState
          title="Promoções ainda não disponíveis"
          description="O catálogo de promoções está sendo configurado. Volte em breve."
          icon={Gift}
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .order('status')
    .order('score', { ascending: false });

  const promotions = (data ?? []) as Promotion[];

  const ativas = promotions.filter((p) => p.status === 'ativa');
  const futuras = promotions.filter((p) => p.status === 'futura');
  const expiradas = promotions.filter((p) => p.status === 'expirada');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promoções</h1>
        <p className="mt-1 text-muted-foreground">
          Transferências bonificadas, compras de pontos e ofertas cadastradas pelo clube.
        </p>
      </div>

      <Tabs defaultValue="ativas">
        <TabsList>
          <TabsTrigger value="ativas">Ativas</TabsTrigger>
          <TabsTrigger value="futuras">Em breve</TabsTrigger>
          <TabsTrigger value="expiradas">Expiradas</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas">
          {ativas.length === 0 ? (
            <EmptyState
              title="Nenhuma promoção ativa no momento"
              description="Volte em breve — o clube cadastra transferências bonificadas e promoções assim que surgem."
              icon={Gift}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ativas.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="futuras">
          {futuras.length === 0 ? (
            <EmptyState
              title="Nenhuma promoção futura cadastrada"
              description="Assim que uma promoção com data de início futura for cadastrada, ela aparece aqui."
              icon={Gift}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {futuras.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expiradas">
          {expiradas.length === 0 ? (
            <EmptyState
              title="Nenhuma promoção expirada"
              description="Promoções encerradas aparecem aqui para consulta histórica."
              icon={Gift}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {expiradas.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
