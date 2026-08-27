import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, ArrowLeft, CheckCircle2, XCircle, Heart } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isOptimizableImageHost } from '@/lib/image-hosts';
import { formatBRL } from '@/lib/utils';
import { evaluateStay } from '@/lib/scoring/stay-score';
import { PriceIntelligenceCard } from '@/components/price-intelligence-card';
import { saveStayToBucketList } from '../actions';
import {
  STAY_CATEGORY_LABEL,
  EXPERIENCE_TAG_LABEL,
  VERIFICATION_STATUS_LABEL,
  type Stay,
  type Destination,
  type Source,
  type VerificationStatus,
  type ExperienceTag,
} from '@/lib/types';

const VERIFICATION_BADGE_VARIANT: Record<VerificationStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  verified: 'success',
  unverified: 'secondary',
  estimated: 'default',
  stale: 'destructive',
  mock: 'outline',
};

type StayDetailRow = Stay & {
  destinations: Pick<Destination, 'city' | 'country'> | null;
  sources: Pick<Source, 'name' | 'authority_level' | 'url'> | null;
};

async function loadStay(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('stays')
    .select('*, destinations(city, country), sources(name, authority_level, url)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  return data as StayDetailRow | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const stay = await loadStay(slug);
  if (!stay) return { title: 'Hospedagem não encontrada' };
  return {
    title: stay.name,
    description: stay.description ?? `${stay.name} — ${STAY_CATEGORY_LABEL[stay.category]}, Stay Score ${stay.stay_score}/100.`,
    openGraph: { title: `${stay.name} — Radar Milhas & Viagens`, url: `/estadias/${stay.slug}` },
    alternates: { canonical: `/estadias/${stay.slug}` },
  };
}

export default async function EstadiaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flags = await getFeatureFlags();
  if (!flags.stayExperience) notFound();

  const stay = await loadStay(slug);
  if (!stay) notFound();

  const ctx = await getUserContext();

  // Recalcula a explicação ao vivo (mesmos inputs salvos) só pra exibir o
  // "por quê" — o stay_score gravado no banco já é este mesmo resultado
  // (calculado uma única vez em app/(app)/admin/estadias/actions.ts), nunca
  // diverge.
  const explanation = evaluateStay({
    category: stay.category,
    experienceTags: stay.experience_tags,
    verificationStatus: stay.verification_status,
    confidenceScore: stay.confidence_score,
    sourceAuthorityLevel: stay.sources?.authority_level ?? 0,
    hasDescription: Boolean(stay.description),
    hasCoverImage: Boolean(stay.cover_image_url),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/estadias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Estadias
      </Link>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
        {stay.cover_image_url && isOptimizableImageHost(stay.cover_image_url) ? (
          <Image src={stay.cover_image_url} alt={stay.name} fill sizes="100vw" className="object-cover" />
        ) : stay.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stay.cover_image_url} alt={stay.name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{STAY_CATEGORY_LABEL[stay.category]}</Badge>
        <Badge variant={VERIFICATION_BADGE_VARIANT[stay.verification_status]}>{VERIFICATION_STATUS_LABEL[stay.verification_status]}</Badge>
        {stay.is_mock && <Badge variant="outline">Dado de exemplo</Badge>}
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{stay.name}</h1>
        {stay.destinations && (
          <p className="mt-1 flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {stay.destinations.city}, {stay.destinations.country}
          </p>
        )}
      </div>

      {stay.description && <p className="text-muted-foreground">{stay.description}</p>}

      {stay.experience_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stay.experience_tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {EXPERIENCE_TAG_LABEL[tag as ExperienceTag]}
            </Badge>
          ))}
        </div>
      )}

      {ctx && (
        <form action={saveStayToBucketList.bind(null, stay.id)}>
          <Button type="submit" variant="outline" size="sm">
            <Heart className="h-3.5 w-3.5" />
            Salvar na Bucket List
          </Button>
        </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Stay Score: {explanation.score}/100</span>
            <span className="text-sm font-normal text-muted-foreground">{explanation.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {explanation.positives.map((reason, i) => (
            <p key={`p-${i}`} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {reason}
            </p>
          ))}
          {explanation.negatives.map((reason, i) => (
            <p key={`n-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {reason}
            </p>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {stay.price_from_cash != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Preço</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">
                A partir de {stay.price_currency === 'BRL' ? formatBRL(stay.price_from_cash) : `${stay.price_currency} ${stay.price_from_cash}`}
              </p>
              <p className="text-sm text-muted-foreground">por {stay.price_unit === 'diaria' ? 'noite' : 'pacote'}</p>
            </CardContent>
          </Card>
        )}
        {stay.best_season && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Melhor época</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{stay.best_season}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <PriceIntelligenceCard entityType="stay" entityId={stay.id} />

      {stay.sources && (
        <p className="text-xs text-muted-foreground">
          Fonte: {stay.sources.url ? <a href={stay.sources.url} target="_blank" rel="noopener noreferrer" className="underline">{stay.sources.name}</a> : stay.sources.name}
        </p>
      )}
    </div>
  );
}
