import Link from 'next/link';
import Image from 'next/image';
import { MapPin, FlaskConical, ImageOff, Moon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isOptimizableImageHost } from '@/lib/image-hosts';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { CRUISE_CATEGORY_LABEL, VERIFICATION_STATUS_LABEL, type Cruise, type VerificationStatus } from '@/lib/types';

const VERIFICATION_BADGE_VARIANT: Record<VerificationStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  verified: 'success',
  unverified: 'secondary',
  estimated: 'default',
  stale: 'destructive',
  mock: 'outline',
};

export interface CruiseCardData extends Cruise {
  embarkation_label?: string | null;
}

export function CruiseCard({ cruise }: { cruise: CruiseCardData }) {
  return (
    <Link href={`/cruzeiros/${cruise.slug}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/9] w-full bg-muted">
          {cruise.cover_image_url && isOptimizableImageHost(cruise.cover_image_url) ? (
            <Image src={cruise.cover_image_url} alt={cruise.name} fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
          ) : cruise.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cruise.cover_image_url} alt={cruise.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{CRUISE_CATEGORY_LABEL[cruise.category]}</Badge>
            <Badge variant={VERIFICATION_BADGE_VARIANT[cruise.verification_status]}>{VERIFICATION_STATUS_LABEL[cruise.verification_status]}</Badge>
            {cruise.is_mock && (
              <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
                <FlaskConical className="h-3 w-3" />
                Dado de exemplo
              </Badge>
            )}
          </div>
          <CardTitle className="text-base">{cruise.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Moon className="h-3.5 w-3.5" />
              {cruise.nights} noites
            </span>
            {cruise.embarkation_label && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {cruise.embarkation_label}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {cruise.route_description && <p className="line-clamp-2 text-sm text-muted-foreground">{cruise.route_description}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              title={`Cruise Score ${cruise.cruise_score}/100`}
            >
              {cruise.cruise_score}/100 · Cruise Score
            </div>
            {cruise.price_from_cash != null && (
              <span className="text-sm font-medium">
                A partir de {cruise.price_currency === 'BRL' ? formatBRL(cruise.price_from_cash) : `${cruise.price_currency} ${cruise.price_from_cash}`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
