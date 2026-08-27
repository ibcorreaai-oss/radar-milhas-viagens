import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Moon, Anchor, Heart } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isOptimizableImageHost } from '@/lib/image-hosts';
import { formatBRL } from '@/lib/utils';
import { evaluateCruise } from '@/lib/scoring/cruise-score';
import { PriceIntelligenceCard } from '@/components/price-intelligence-card';
import { saveCruiseToBucketList } from '../actions';
import {
  CRUISE_CATEGORY_LABEL,
  CRUISE_REGION_TAG_LABEL,
  CABIN_CATEGORY_LABEL,
  VERIFICATION_STATUS_LABEL,
  type Cruise,
  type Destination,
  type Source,
  type VerificationStatus,
  type CruiseRegionTag,
} from '@/lib/types';

const VERIFICATION_BADGE_VARIANT: Record<VerificationStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  verified: 'success',
  unverified: 'secondary',
  estimated: 'default',
  stale: 'destructive',
  mock: 'outline',
};

type CruiseDetailRow = Cruise & {
  destinations: Pick<Destination, 'city' | 'country'> | null;
  sources: Pick<Source, 'name' | 'authority_level' | 'url'> | null;
};

async function loadCruise(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cruises')
    .select('*, destinations:embarkation_destination_id(city, country), sources(name, authority_level, url)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();
  return data as CruiseDetailRow | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cruise = await loadCruise(slug);
  if (!cruise) return { title: 'Cruzeiro não encontrado' };
  return {
    title: cruise.name,
    description: cruise.route_description ?? `${cruise.name} — ${CRUISE_CATEGORY_LABEL[cruise.category]}, Cruise Score ${cruise.cruise_score}/100.`,
    openGraph: { title: `${cruise.name} — Radar Milhas & Viagens`, url: `/cruzeiros/${cruise.slug}` },
    alternates: { canonical: `/cruzeiros/${cruise.slug}` },
  };
}

export default async function CruzeiroDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flags = await getFeatureFlags();
  if (!flags.cruiseRadar) notFound();

  const cruise = await loadCruise(slug);
  if (!cruise) notFound();

  const ctx = await getUserContext();

  const explanation = evaluateCruise({
    category: cruise.category,
    regionTags: cruise.region_tags,
    nights: cruise.nights,
    portsCount: cruise.ports_count,
    verificationStatus: cruise.verification_status,
    confidenceScore: cruise.confidence_score,
    sourceAuthorityLevel: cruise.sources?.authority_level ?? 0,
    hasDescription: Boolean(cruise.route_description),
    hasCoverImage: Boolean(cruise.cover_image_url),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/cruzeiros" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Cruzeiros
      </Link>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
        {cruise.cover_image_url && isOptimizableImageHost(cruise.cover_image_url) ? (
          <Image src={cruise.cover_image_url} alt={cruise.name} fill sizes="100vw" className="object-cover" />
        ) : cruise.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cruise.cover_image_url} alt={cruise.name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{CRUISE_CATEGORY_LABEL[cruise.category]}</Badge>
        <Badge variant={VERIFICATION_BADGE_VARIANT[cruise.verification_status]}>{VERIFICATION_STATUS_LABEL[cruise.verification_status]}</Badge>
        {cruise.is_mock && <Badge variant="outline">Dado de exemplo</Badge>}
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{cruise.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground">
          {(cruise.cruise_line || cruise.ship_name) && (
            <span>
              {cruise.cruise_line}
              {cruise.cruise_line && cruise.ship_name ? ' · ' : ''}
              {cruise.ship_name}
            </span>
          )}
          {cruise.destinations && (
            <span className="flex items-center gap-1">
              <Anchor className="h-4 w-4" />
              Embarque: {cruise.destinations.city}, {cruise.destinations.country}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Moon className="h-4 w-4" />
            {cruise.nights} noites · {cruise.ports_count} portos
          </span>
        </div>
      </div>

      {cruise.route_description && <p className="text-muted-foreground">{cruise.route_description}</p>}

      {cruise.region_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cruise.region_tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {CRUISE_REGION_TAG_LABEL[tag as CruiseRegionTag]}
            </Badge>
          ))}
        </div>
      )}

      {ctx && (
        <form action={saveCruiseToBucketList.bind(null, cruise.id)}>
          <Button type="submit" variant="outline" size="sm">
            <Heart className="h-3.5 w-3.5" />
            Salvar na Bucket List
          </Button>
        </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cruise Score: {explanation.score}/100</span>
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
        {cruise.price_from_cash != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Preço</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">
                A partir de {cruise.price_currency === 'BRL' ? formatBRL(cruise.price_from_cash) : `${cruise.price_currency} ${cruise.price_from_cash}`}
              </p>
              {cruise.cabin_category && <p className="text-sm text-muted-foreground">Cabine {CABIN_CATEGORY_LABEL[cruise.cabin_category]}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      <PriceIntelligenceCard entityType="cruise" entityId={cruise.id} />

      {cruise.sources && (
        <p className="text-xs text-muted-foreground">
          Fonte: {cruise.sources.url ? <a href={cruise.sources.url} target="_blank" rel="noopener noreferrer" className="underline">{cruise.sources.name}</a> : cruise.sources.name}
        </p>
      )}
    </div>
  );
}
