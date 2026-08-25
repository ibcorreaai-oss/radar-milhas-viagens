'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/form-error';
import { TRAINING_STATUS_LABEL } from '@/lib/types';
import type { TrainingModule, TrainingContentStatus } from '@/lib/types';

const STATUS_OPTIONS: TrainingContentStatus[] = ['draft', 'published', 'archived'];

export function ModuleForm({
  module,
  action,
  error,
}: {
  module?: TrainingModule;
  action: (formData: FormData) => void;
  error?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{module ? 'Editar módulo' : 'Novo módulo'}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormError message={error} />
        <form action={action} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" name="title" required maxLength={200} defaultValue={module?.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (opcional — gerado do título se vazio)</Label>
              <Input id="slug" name="slug" maxLength={200} defaultValue={module?.slug} placeholder="introducao" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={module?.description ?? ''} />
          </div>

          <div className="space-y-1.5 sm:w-64">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={module?.status ?? 'draft'}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {TRAINING_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="submit">{module ? 'Salvar alterações' : 'Criar módulo'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
