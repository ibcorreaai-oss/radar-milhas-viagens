import Link from 'next/link';
import Image from 'next/image';
import { MapPin, FlaskConical, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isOptimizableImageHost } from '@/lib/image-hosts';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { STAY_CATEGORY_LABEL, VERIFICATION_STATUS_LABEL, type Stay, type VerificationStatus } from '@/lib/types';

const VERIFICATION_BADGE_VARIANT: Record<VerificationStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  verified: 'success',
  unverified: 'secondary',
  estimated: 'default',
  stale: 'destructive',
  mock: 'outline',
};

export interface StayCardData extends Stay {
  destination_label?: string | null;
}

export function StayCard({ stay }: { stay: StayCardData }) {
  return (
    <Link href={`/estadias/${stay.slug}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/9] w-full bg-muted">
          {stay.cover_image_url && isOptimizableImageHost(stay.cover_image_url) ? (
            <Image
              src={stay.cover_image_url}
              alt={stay.name}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : stay.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={stay.cover_image_url} alt={stay.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-8 w-8" />
            </div>
          )}
        </div>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{STAY_CATEGORY_LABEL[stay.category]}</Badge>
            <Badge variant={VERIFICATION_BADGE_VARIANT[stay.verification_status]}>
              {VERIFICATION_STATUS_LABEL[stay.verification_status]}
            </Badge>
            {stay.is_mock && (
              <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
                <FlaskConical className="h-3 w-3" />
                Dado de exemplo
              </Badge>
            )}
          </div>
          <CardTitle className="text-base">{stay.name}</CardTitle>
          {stay.destination_label && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {stay.destination_label}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {stay.description && <p className="line-clamp-2 text-sm text-muted-foreground">{stay.description}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              title={`Stay Score ${stay.stay_score}/100`}
            >
              {stay.stay_score}/100 · Stay Score
            </div>
            {stay.price_from_cash != null && (
              <span className="text-sm font-medium">
                A partir de {stay.price_currency === 'BRL' ? formatBRL(stay.price_from_cash) : `${stay.price_currency} ${stay.price_from_cash.toLocaleString('pt-BR')}`}
                <span className="text-xs font-normal text-muted-foreground">/{stay.price_unit === 'diaria' ? 'noite' : 'pacote'}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
