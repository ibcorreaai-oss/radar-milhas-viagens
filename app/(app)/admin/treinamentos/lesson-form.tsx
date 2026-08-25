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
import { formatLessonResources } from '@/lib/validation/admin-schemas';
import { VIDEO_PROVIDER_LABEL, VIDEO_PROVIDER_REF_HINT } from '@/lib/video-providers';
import { TRAINING_STATUS_LABEL } from '@/lib/types';
import type { TrainingLesson, TrainingModule, TrainingContentStatus, TrainingContentType, VideoProviderKey } from '@/lib/types';

const STATUS_OPTIONS: TrainingContentStatus[] = ['draft', 'published', 'archived'];
const CONTENT_TYPE_OPTIONS: { value: TrainingContentType; label: string; disabled?: boolean }[] = [
  { value: 'video', label: 'Vídeo' },
  { value: 'text', label: 'Texto (em breve)', disabled: true },
  { value: 'quiz', label: 'Quiz (em breve)', disabled: true },
];
const VIDEO_PROVIDER_OPTIONS: VideoProviderKey[] = ['youtube', 'vimeo', 'bunny', 'cloudflare', 'supabase', 'url'];

export function LessonForm({
  lesson,
  modules,
  defaultModuleId,
  action,
  error,
}: {
  lesson?: TrainingLesson;
  modules: TrainingModule[];
  defaultModuleId?: string;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const [contentType, setContentType] = useState<TrainingContentType>(lesson?.content_type ?? 'video');
  const [videoProvider, setVideoProvider] = useState<VideoProviderKey>(lesson?.video_provider ?? 'youtube');
  const [isRequired, setIsRequired] = useState(lesson?.is_required ?? true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lesson ? 'Editar aula' : 'Nova aula'}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="module_id">Módulo</Label>
              <Select id="module_id" name="module_id" required defaultValue={lesson?.module_id ?? defaultModuleId ?? ''}>
                <option value="">Selecione</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required maxLength={200} defaultValue={lesson?.title} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (opcional — gerado do título se vazio)</Label>
              <Input id="slug" name="slug" maxLength={200} defaultValue={lesson?.slug} placeholder="como-criar-um-alerta" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={lesson?.status ?? 'draft'}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {TRAINING_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={lesson?.description ?? ''} />
          </div>

          <Separator />

          <div className="space-y-1.5 sm:w-64">
            <Label htmlFor="content_type">Tipo de conteúdo</Label>
            <Select
              id="content_type"
              name="content_type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value as TrainingContentType)}
            >
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          {contentType === 'video' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="video_provider">Provedor de vídeo</Label>
                <Select
                  id="video_provider"
                  name="video_provider"
                  value={videoProvider}
                  onChange={(e) => setVideoProvider(e.target.value as VideoProviderKey)}
                >
                  {VIDEO_PROVIDER_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {VIDEO_PROVIDER_LABEL[p]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="video_ref">Referência do vídeo</Label>
                <Input id="video_ref" name="video_ref" defaultValue={lesson?.video_ref ?? ''} placeholder={VIDEO_PROVIDER_REF_HINT[videoProvider]} />
                <p className="text-xs text-muted-foreground">{VIDEO_PROVIDER_REF_HINT[videoProvider]}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="duration_seconds">Duração (segundos)</Label>
              <Input id="duration_seconds" name="duration_seconds" type="number" min={0} defaultValue={lesson?.duration_seconds ?? 0} />
            </div>
            <ImageUploadField
              id="thumbnail_url"
              name="thumbnail_url"
              label="Thumbnail"
              defaultValue={lesson?.thumbnail_url}
              hint="Envie um arquivo (JPG/PNG/WEBP/GIF, até 5MB) ou cole uma URL."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keywords">Palavras-chave (separadas por vírgula, usadas na busca)</Label>
            <Input id="keywords" name="keywords" defaultValue={lesson?.keywords.join(', ') ?? ''} placeholder="alertas, notificação, whatsapp" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resources">Materiais complementares (um por linha: Título | URL)</Label>
            <Textarea
              id="resources"
              name="resources"
              rows={3}
              defaultValue={lesson ? formatLessonResources(lesson.resources) : ''}
              placeholder={'Planilha de exemplo | https://...\nGuia em PDF | https://...'}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="is_required" checked={isRequired} onCheckedChange={setIsRequired} />
            <Label htmlFor="is_required" className="cursor-pointer font-normal">
              Aula obrigatória
            </Label>
          </div>
          <input type="hidden" name="is_required" value={isRequired ? 'true' : 'false'} />

          <div className="flex gap-3">
            <Button type="submit">{lesson ? 'Salvar alterações' : 'Criar aula'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
