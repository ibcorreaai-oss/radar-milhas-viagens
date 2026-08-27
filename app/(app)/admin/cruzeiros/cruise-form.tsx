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
import { FormError } from '@/components/form-error';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import { CRUISE_CATEGORY_LABEL, CRUISE_REGION_TAG_LABEL, CABIN_CATEGORY_LABEL, VERIFICATION_STATUS_LABEL } from '@/lib/types';
import type { Cruise, Destination, Source, CruiseCategory, CruiseRegionTag, CabinCategory, VerificationStatus } from '@/lib/types';

const CATEGORY_OPTIONS = Object.keys(CRUISE_CATEGORY_LABEL) as CruiseCategory[];
const REGION_OPTIONS = Object.keys(CRUISE_REGION_TAG_LABEL) as CruiseRegionTag[];
const CABIN_OPTIONS = Object.keys(CABIN_CATEGORY_LABEL) as CabinCategory[];
const VERIFICATION_OPTIONS = Object.keys(VERIFICATION_STATUS_LABEL) as VerificationStatus[];

export function CruiseForm({
  cruise,
  destinations,
  sources,
  action,
  error,
}: {
  cruise?: Cruise;
  destinations: Destination[];
  sources: Source[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [regionTags, setRegionTags] = useState<CruiseRegionTag[]>(cruise?.region_tags ?? []);
  const [featured, setFeatured] = useState(cruise?.featured ?? false);
  const [active, setActive] = useState(cruise?.active ?? true);
  const [isMock, setIsMock] = useState(cruise?.is_mock ?? false);

  function toggleTag(tag: CruiseRegionTag) {
    setRegionTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cruise ? 'Editar cruzeiro' : 'Novo cruzeiro'}</CardTitle>
        {cruise && (
          <p className="text-sm text-muted-foreground">
            Cruise Score é recalculado automaticamente ao salvar — ver <code className="text-xs">lib/scoring/cruise-score.ts</code>.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required maxLength={200} defaultValue={cruise?.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (opcional — gerado do nome se vazio)</Label>
              <Input id="slug" name="slug" maxLength={200} defaultValue={cruise?.slug} placeholder="fiordes-noruegueses-hurtigruten" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="embarkation_destination_id">Porto de embarque</Label>
              <Select id="embarkation_destination_id" name="embarkation_destination_id" defaultValue={cruise?.embarkation_destination_id ?? ''}>
                <option value="">Selecione</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.city}, {d.country}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cruise_line">Companhia</Label>
              <Input id="cruise_line" name="cruise_line" maxLength={120} defaultValue={cruise?.cruise_line ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ship_name">Navio</Label>
              <Input id="ship_name" name="ship_name" maxLength={120} defaultValue={cruise?.ship_name ?? ''} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select id="category" name="category" defaultValue={cruise?.category ?? 'oceanico'}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CRUISE_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nights">Noites</Label>
              <Input id="nights" name="nights" type="number" min={1} defaultValue={cruise?.nights ?? 7} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ports_count">Número de portos</Label>
              <Input id="ports_count" name="ports_count" type="number" min={0} defaultValue={cruise?.ports_count ?? 0} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="route_description">Descrição do roteiro</Label>
            <Textarea id="route_description" name="route_description" rows={3} defaultValue={cruise?.route_description ?? ''} />
          </div>

          <div className="space-y-1.5">
            <Label>Regiões</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {REGION_OPTIONS.map((tag) => (
                <label key={tag} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={regionTags.includes(tag)} onChange={() => toggleTag(tag)} className="h-4 w-4 rounded border-input" />
                  {CRUISE_REGION_TAG_LABEL[tag]}
                </label>
              ))}
            </div>
            {regionTags.map((t) => (
              <input key={t} type="hidden" name="region_tags" value={t} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cabin_category">Categoria de cabine (referência)</Label>
              <Select id="cabin_category" name="cabin_category" defaultValue={cruise?.cabin_category ?? ''}>
                <option value="">Não especificado</option>
                {CABIN_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CABIN_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_from_cash">Preço a partir de (opcional)</Label>
              <Input id="price_from_cash" name="price_from_cash" type="number" min={0} step="0.01" defaultValue={cruise?.price_from_cash ?? ''} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_currency">Moeda</Label>
              <Input id="price_currency" name="price_currency" maxLength={6} defaultValue={cruise?.price_currency ?? 'BRL'} />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source_id">Fonte</Label>
              <Select id="source_id" name="source_id" defaultValue={cruise?.source_id ?? ''}>
                <option value="">Selecione</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (autoridade {s.authority_level}/10)
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="verification_status">Status de verificação</Label>
              <Select id="verification_status" name="verification_status" defaultValue={cruise?.verification_status ?? 'mock'}>
                {VERIFICATION_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {VERIFICATION_STATUS_LABEL[v]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source_url">URL da fonte</Label>
              <Input id="source_url" name="source_url" type="url" defaultValue={cruise?.source_url ?? ''} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confidence_score">Confiança da informação (0.00–1.00)</Label>
              <Input id="confidence_score" name="confidence_score" type="number" min={0} max={1} step="0.05" defaultValue={cruise?.confidence_score ?? 0.5} />
            </div>
          </div>

          <ImageUploadField
            id="cover_image_url"
            name="cover_image_url"
            label="Imagem de capa"
            defaultValue={cruise?.cover_image_url}
            hint="Envie um arquivo ou cole uma URL — otimizada automaticamente se vier de host conhecido."
          />

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
              <Label htmlFor="featured" className="cursor-pointer font-normal">
                Destacar em /cruzeiros
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active" className="cursor-pointer font-normal">
                Ativo (visível publicamente)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_mock" checked={isMock} onCheckedChange={setIsMock} />
              <Label htmlFor="is_mock" className="cursor-pointer font-normal">
                Dado de exemplo (dev) — mostra badge
              </Label>
            </div>
          </div>
          <input type="hidden" name="featured" value={featured ? 'true' : 'false'} />
          <input type="hidden" name="active" value={active ? 'true' : 'false'} />
          <input type="hidden" name="is_mock" value={isMock ? 'true' : 'false'} />

          <div className="flex gap-3">
            <Button type="submit">{cruise ? 'Salvar alterações' : 'Criar cruzeiro'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
