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
import { STAY_CATEGORY_LABEL, EXPERIENCE_TAG_LABEL, VERIFICATION_STATUS_LABEL } from '@/lib/types';
import type { Stay, Destination, Source, StayCategory, ExperienceTag, VerificationStatus } from '@/lib/types';

const CATEGORY_OPTIONS = Object.keys(STAY_CATEGORY_LABEL) as StayCategory[];
const TAG_OPTIONS = Object.keys(EXPERIENCE_TAG_LABEL) as ExperienceTag[];
const VERIFICATION_OPTIONS = Object.keys(VERIFICATION_STATUS_LABEL) as VerificationStatus[];

export function StayForm({
  stay,
  destinations,
  sources,
  action,
  error,
}: {
  stay?: Stay;
  destinations: Destination[];
  sources: Source[];
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [tags, setTags] = useState<ExperienceTag[]>(stay?.experience_tags ?? []);
  const [featured, setFeatured] = useState(stay?.featured ?? false);
  const [active, setActive] = useState(stay?.active ?? true);
  const [isMock, setIsMock] = useState(stay?.is_mock ?? false);

  function toggleTag(tag: ExperienceTag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{stay ? 'Editar hospedagem' : 'Nova hospedagem'}</CardTitle>
        {stay && (
          <p className="text-sm text-muted-foreground">
            Stay Score é recalculado automaticamente ao salvar — ver <code className="text-xs">lib/scoring/stay-score.ts</code>.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required maxLength={200} defaultValue={stay?.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (opcional — gerado do nome se vazio)</Label>
              <Input id="slug" name="slug" maxLength={200} defaultValue={stay?.slug} placeholder="amangiri-utah" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="destination_id">Destino</Label>
              <Select id="destination_id" name="destination_id" defaultValue={stay?.destination_id ?? ''}>
                <option value="">Selecione</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.city}, {d.country}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select id="category" name="category" defaultValue={stay?.category ?? 'hotel'}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {STAY_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={stay?.description ?? ''} />
          </div>

          <div className="space-y-1.5">
            <Label>Tags de experiência</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {TAG_OPTIONS.map((tag) => (
                <label key={tag} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {EXPERIENCE_TAG_LABEL[tag]}
                </label>
              ))}
            </div>
            {tags.map((t) => (
              <input key={t} type="hidden" name="experience_tags" value={t} />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="price_from_cash">Preço a partir de (opcional)</Label>
              <Input
                id="price_from_cash"
                name="price_from_cash"
                type="number"
                min={0}
                step="0.01"
                defaultValue={stay?.price_from_cash ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_currency">Moeda</Label>
              <Input id="price_currency" name="price_currency" maxLength={6} defaultValue={stay?.price_currency ?? 'BRL'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price_unit">Unidade</Label>
              <Select id="price_unit" name="price_unit" defaultValue={stay?.price_unit ?? 'diaria'}>
                <option value="diaria">Diária</option>
                <option value="pacote">Pacote</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="best_season">Melhor época (texto livre — ex.: &quot;dez-fev, temporada seca&quot;)</Label>
            <Input id="best_season" name="best_season" maxLength={200} defaultValue={stay?.best_season ?? ''} />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source_id">Fonte</Label>
              <Select id="source_id" name="source_id" defaultValue={stay?.source_id ?? ''}>
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
              <Select id="verification_status" name="verification_status" defaultValue={stay?.verification_status ?? 'mock'}>
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
              <Input id="source_url" name="source_url" type="url" defaultValue={stay?.source_url ?? ''} placeholder="https://..." />
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
                defaultValue={stay?.confidence_score ?? 0.5}
              />
            </div>
          </div>

          <ImageUploadField
            id="cover_image_url"
            name="cover_image_url"
            label="Imagem de capa"
            defaultValue={stay?.cover_image_url}
            hint="Envie um arquivo ou cole uma URL — otimizada automaticamente se vier de host conhecido."
          />

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
              <Label htmlFor="featured" className="cursor-pointer font-normal">
                Destacar em /estadias
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="active" className="cursor-pointer font-normal">
                Ativa (visível publicamente)
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
            <Button type="submit">{stay ? 'Salvar alterações' : 'Criar hospedagem'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
