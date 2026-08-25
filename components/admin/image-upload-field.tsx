'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { ImageOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/toast-provider';

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const BUCKET = 'event-media';
const PUBLIC_PATH_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// Extrai o path dentro do bucket a partir da URL pública, só se a URL for
// mesmo do nosso bucket — nunca tenta apagar um arquivo de host externo
// (Unsplash/Wikimedia/etc.) que o admin tenha colado manualmente.
function extractOwnBucketPath(url: string): string | null {
  const idx = url.indexOf(PUBLIC_PATH_MARKER);
  if (idx === -1) return null;
  return url.slice(idx + PUBLIC_PATH_MARKER.length);
}

// ETAPA 14 (ver AUTH_AND_ADMIN.md §5) — upload direto do browser pro bucket
// `event-media` (RLS admin-only, ver migration 0009). Upload direto (não
// via Server Action) porque o limite de tamanho de body de Server Action já
// está em 10mb (next.config.mjs) por outro motivo e um arquivo binário
// nesse caminho ainda precisaria ser convertido de/para base64 — o SDK do
// Supabase já faz upload de File nativamente do client. O campo de URL
// continua editável manualmente: colar um link (Unsplash/Wikimedia/etc.)
// ainda funciona, o upload só preenche o mesmo campo.
export function ImageUploadField({
  id,
  name,
  label,
  defaultValue,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string | null;
  hint?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      show({ variant: 'error', title: 'Formato não aceito', description: 'Use JPG, PNG, WEBP ou GIF.' });
      event.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      show({ variant: 'error', title: 'Arquivo muito grande', description: `Máximo ${MAX_SIZE_MB}MB.` });
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const previousPath = extractOwnBucketPath(url);
      setUrl(data.publicUrl);
      show({ variant: 'success', title: 'Imagem enviada com sucesso.' });

      // Best-effort: apaga o arquivo antigo do próprio bucket ao substituir
      // por um novo, pra não acumular imagem órfã indefinidamente (achado
      // em revisão adversarial). Nunca bloqueia nem falha o upload novo.
      if (previousPath) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousPath]);
        if (removeError) {
          console.error(`[image-upload-field] falha ao remover arquivo antigo: ${removeError.message}`);
        }
      }
    } catch (err) {
      show({
        variant: 'error',
        title: 'Falha no upload',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://... (ou envie um arquivo abaixo)"
      />
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={uploading}
          className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/90"
        />
        {uploading && <span className="text-xs text-muted-foreground">Enviando...</span>}
      </div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview de URL arbitrária, mesmo padrão de components/world-event-card.tsx
        <img src={url} alt="Prévia da imagem" className="mt-1 h-28 w-48 rounded-md border object-cover" />
      ) : (
        <div className="mt-1 flex h-28 w-48 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <ImageOff className="h-6 w-6" />
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
