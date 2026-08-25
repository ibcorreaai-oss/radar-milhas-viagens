import Image from 'next/image';
import { MapPin, CalendarRange, FlaskConical, ImageOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isOptimizableImageHost } from '@/lib/image-hosts';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  EVENT_STATUS_LABEL,
  EVENT_RADAR_LABEL,
  type WorldEvent,
  type EventStatus,
  type BookNowState,
  type EventRadar,
} from '@/lib/types';

const STATUS_BADGE_VARIANT: Record<EventStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmado: 'success',
  previsto: 'default',
  estimado: 'secondary',
  em_monitoramento: 'secondary',
  cancelado: 'destructive',
  adiado: 'destructive',
  finalizado: 'outline',
};

const BOOK_NOW_LABEL: Record<BookNowState, string> = {
  monitorar: 'Monitorar',
  esperar: 'Esperar',
  boa_janela: 'Boa janela',
  comprar: 'Comprar',
  comprar_agora: 'Comprar agora',
  alto_risco_esgotar: 'Alto risco de esgotar',
};

const BOOK_NOW_BADGE_VARIANT: Record<BookNowState, 'secondary' | 'outline' | 'accent' | 'default' | 'success' | 'destructive'> = {
  monitorar: 'secondary',
  esperar: 'outline',
  boa_janela: 'accent',
  comprar: 'default',
  comprar_agora: 'success',
  alto_risco_esgotar: 'destructive',
};

export interface WorldEventCardData extends WorldEvent {
  category_label?: string | null;
  category_radar?: EventRadar | null;
  destination_label?: string | null;
}

export function WorldEventCard({
  event,
  footer,
}: {
  event: WorldEventCardData;
  footer?: React.ReactNode;
}) {
  const period =
    event.start_date && event.end_date && event.start_date !== event.end_date
      ? `${formatDate(event.start_date)} – ${formatDate(event.end_date)}`
      : event.start_date
        ? formatDate(event.start_date)
        : 'Data a confirmar';

  return (
    <Card className="overflow-hidden">
      {/* Aspect-ratio fixo pra reservar o espaço antes da imagem carregar —
          evita layout shift (CLS) quando a capa vem de uma URL externa. */}
      <div className="relative aspect-[16/9] w-full bg-muted">
        {event.cover_image_url && isOptimizableImageHost(event.cover_image_url) ? (
          <Image
            src={event.cover_image_url}
            alt={event.title}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : event.cover_image_url ? (
          // Host fora da allowlist do otimizador (ver lib/image-hosts.ts) —
          // <img> puro sempre funciona, só perde a otimização automática.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image_url} alt={event.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
      </div>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{event.category_label ?? (event.category_radar ? EVENT_RADAR_LABEL[event.category_radar] : 'Evento')}</Badge>
          <Badge variant={STATUS_BADGE_VARIANT[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
          {event.once_in_a_lifetime && <Badge variant="accent">Once in a Lifetime</Badge>}
          {event.hidden_gem && <Badge variant="secondary">Hidden Gem</Badge>}
          {event.is_mock && (
            <Badge variant="outline" className="gap-1 border-dashed text-muted-foreground">
              <FlaskConical className="h-3 w-3" />
              Dado de exemplo
            </Badge>
          )}
        </div>
        <CardTitle className="text-base">{event.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarRange className="h-3.5 w-3.5" />
            {period}
          </span>
          {event.destination_label && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.destination_label}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            title={`Experience Score ${event.experience_score}/100`}
          >
            {event.experience_score}/100 · Experience Score
          </div>
          <Badge variant={BOOK_NOW_BADGE_VARIANT[event.book_now_state]}>{BOOK_NOW_LABEL[event.book_now_state]}</Badge>
        </div>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {footer}
      </CardContent>
    </Card>
  );
}
