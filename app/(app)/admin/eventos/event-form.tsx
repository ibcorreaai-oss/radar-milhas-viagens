'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EVENT_STATUS_LABEL } from '@/lib/types';
import type { WorldEvent, EventCategory, Destination, Source, EventSignificance, EventStatus } from '@/lib/types';

const SIGNIFICANCE_OPTIONS: { value: EventSignificance | ''; label: string }[] = [
  { value: '', label: 'Não se aplica' },
  { value: 'comum', label: 'Comum' },
  { value: 'classico', label: 'Clássico' },
  { value: 'derby', label: 'Derby' },
  { value: 'mata_mata', label: 'Mata-mata' },
  { value: 'semifinal', label: 'Semifinal' },
  { value: 'final', label: 'Final' },
  { value: 'evento_historico', label: 'Evento histórico' },
];

const STATUS_OPTIONS: EventStatus[] = [
  'em_monitoramento',
  'previsto',
  'confirmado',
  'estimado',
  'adiado',
  'cancelado',
  'finalizado',
];

export function EventForm({
  event,
  categories,
  destinations,
  sources,
  action,
}: {
  event?: WorldEvent;
  categories: EventCategory[];
  destinations: Destination[];
  sources: Source[];
  action: (formData: FormData) => void;
}) {
  const [onceInLifetime, setOnceInLifetime] = useState(event?.once_in_a_lifetime ?? false);
  const [hiddenGem, setHiddenGem] = useState(event?.hidden_gem ?? false);
  const [featured, setFeatured] = useState(event?.featured ?? false);
  const [isMock, setIsMock] = useState(event?.is_mock ?? false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event ? 'Editar evento' : 'Novo evento'}</CardTitle>
        {event && (
          <p className="text-sm text-muted-foreground">
            Score e Book Now State são recalculados automaticamente ao salvar — ver{' '}
            <code className="text-xs">lib/scoring/event-score.ts</code>.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required maxLength={200} defaultValue={event?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (opcional — gerado do título se vazio)</Label>
              <Input id="slug" name="slug" maxLength={200} defaultValue={event?.slug} placeholder="oktoberfest-2026" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Categoria (radar)</Label>
              <Select id="category_id" name="category_id" defaultValue={event?.category_id ?? ''}>
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination_id">Destino</Label>
              <Select id="destination_id" name="destination_id" defaultValue={event?.destination_id ?? ''}>
                <option value="">Selecione</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.city}, {d.country}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="significance">Relevância (esporte)</Label>
              <Select id="significance" name="significance" defaultValue={event?.significance ?? ''}>
                {SIGNIFICANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={event?.description ?? ''} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Início</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={event?.start_date ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fim</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={event?.end_date ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={event?.status ?? 'em_monitoramento'}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {EVENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source_id">Fonte</Label>
              <Select id="source_id" name="source_id" defaultValue={event?.source_id ?? ''}>
                <option value="">Selecione</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (autoridade {s.authority_level}/10)
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confidence_score">Confiança da informação (0.00–1.00)</Label>
              <Input
                id="confidence_score"
                name="confidence_score"
                type="number"
                min={0}
                max={1}
                step="0.05"
                defaultValue={event?.confidence_score ?? 0.5}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source_url">URL da fonte</Label>
              <Input id="source_url" name="source_url" type="url" defaultValue={event?.source_url ?? ''} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover_image_url">URL da imagem de capa</Label>
              <Input id="cover_image_url" name="cover_image_url" type="url" defaultValue={event?.cover_image_url ?? ''} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">
                Otimizada automaticamente se vier de Unsplash, Wikimedia, Cloudinary ou Pexels — de
                qualquer outro site, a imagem ainda aparece, só sem otimização.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input id="tags" name="tags" defaultValue={event?.tags.join(', ') ?? ''} placeholder="musica, europa, festival" />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Switch id="once_in_a_lifetime" checked={onceInLifetime} onCheckedChange={setOnceInLifetime} />
              <Label htmlFor="once_in_a_lifetime" className="cursor-pointer font-normal">
                Once in a Lifetime
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="hidden_gem" checked={hiddenGem} onCheckedChange={setHiddenGem} />
              <Label htmlFor="hidden_gem" className="cursor-pointer font-normal">
                Hidden Gem
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
              <Label htmlFor="featured" className="cursor-pointer font-normal">
                Destacar na home do Descobrir
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_mock" checked={isMock} onCheckedChange={setIsMock} />
              <Label htmlFor="is_mock" className="cursor-pointer font-normal">
                Dado de exemplo (dev) — mostra badge para o usuário
              </Label>
            </div>
          </div>
          <input type="hidden" name="once_in_a_lifetime" value={onceInLifetime ? 'true' : 'false'} />
          <input type="hidden" name="hidden_gem" value={hiddenGem ? 'true' : 'false'} />
          <input type="hidden" name="featured" value={featured ? 'true' : 'false'} />
          <input type="hidden" name="is_mock" value={isMock ? 'true' : 'false'} />

          <div className="flex gap-3">
            <Button type="submit">{event ? 'Salvar alterações' : 'Criar evento'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
