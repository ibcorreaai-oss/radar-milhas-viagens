import type { VideoProviderKey } from '@/lib/types';

// Camada única de abstração de provedor de vídeo do Mini LMS (ver
// TRAINING.md) — nenhum outro arquivo do app deve saber como montar uma URL
// de embed. `video_ref` guarda semânticas diferentes por provider:
//   - youtube:    ID do vídeo (ex.: "dQw4w9WgXcQ")
//   - vimeo:      ID do vídeo (ex.: "76979871")
//   - bunny:      "libraryId/videoId" (Bunny Stream)
//   - cloudflare: UID do vídeo (Cloudflare Stream) — precisa do "customer
//                 code" da conta, vindo de NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE
//   - supabase:   URL pública do Storage (admin sobe o arquivo por fora e
//                 cola o link — este produto não tem upload de vídeo, ver 0009)
//   - url:        URL direta de um arquivo de vídeo (mp4/webm) ou embed
export interface VideoSource {
  provider: VideoProviderKey;
  ref: string;
}

export type ResolvedVideo =
  | { kind: 'iframe'; src: string }
  | { kind: 'native'; src: string }
  | { kind: 'invalid'; reason: string };

export function resolveVideoSource(source: VideoSource): ResolvedVideo {
  const ref = source.ref.trim();
  if (!ref) return { kind: 'invalid', reason: 'Vídeo não configurado.' };

  switch (source.provider) {
    case 'youtube':
      return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ref)}` };

    case 'vimeo':
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${encodeURIComponent(ref)}` };

    case 'bunny': {
      const [libraryId, videoId] = ref.split('/');
      if (!libraryId || !videoId) {
        return { kind: 'invalid', reason: 'Referência da Bunny Stream inválida (esperado "libraryId/videoId").' };
      }
      return {
        kind: 'iframe',
        src: `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}`,
      };
    }

    case 'cloudflare': {
      const customerCode = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE;
      if (!customerCode) {
        return { kind: 'invalid', reason: 'Cloudflare Stream não configurado (falta NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE).' };
      }
      return { kind: 'iframe', src: `https://customer-${customerCode}.cloudflarestream.com/${encodeURIComponent(ref)}/iframe` };
    }

    case 'supabase':
    case 'url':
      return { kind: 'native', src: ref };

    default:
      return { kind: 'invalid', reason: 'Provedor de vídeo desconhecido.' };
  }
}

export const VIDEO_PROVIDER_LABEL: Record<VideoProviderKey, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  bunny: 'Bunny Stream',
  cloudflare: 'Cloudflare Stream',
  supabase: 'Supabase Storage (URL pública)',
  url: 'URL direta (mp4/webm)',
};

export const VIDEO_PROVIDER_REF_HINT: Record<VideoProviderKey, string> = {
  youtube: 'ID do vídeo, ex.: dQw4w9WgXcQ (da URL youtube.com/watch?v=ESSE_ID)',
  vimeo: 'ID do vídeo, ex.: 76979871',
  bunny: 'libraryId/videoId, ex.: 12345/abcd-ef01',
  cloudflare: 'UID do vídeo no Cloudflare Stream',
  supabase: 'URL pública do arquivo no Supabase Storage',
  url: 'URL direta do arquivo de vídeo (mp4/webm) ou de um embed',
};
