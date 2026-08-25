-- ETAPA 15.2 — Central de Treinamentos / Mini LMS (ver TRAINING.md).
--
-- Curadoria: o prompt genérico assume conceitos que não existem aqui
-- ("papel específico autorizado" pra gerenciar conteúdo = admin/super_admin
-- via requireAdmin(), já que este produto não é multi-tenant — ver
-- PLATFORM_ADMIN.md). Reaproveita o bucket 'event-media' (0009) pra
-- thumbnail de aula em vez de criar bucket novo — mesma decisão já tomada
-- ali de não ter upload de vídeo/documento neste produto: o provider
-- 'supabase' de vídeo espera que o admin já tenha subido o arquivo por fora
-- (dashboard do Supabase) e cole o path/URL, e "materiais complementares"
-- são links (jsonb), não upload de PDF.

create table public.training_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  order_index int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index training_modules_order_idx on public.training_modules(order_index);

create table public.training_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules(id) on delete cascade,
  title text not null,
  slug text not null unique,
  description text,
  -- content_type existe desde já (mesmo só 'video' sendo usado agora) pra
  -- 'text'/'quiz' não exigirem migration de coluna nova depois — ver
  -- TRAINING.md "Arquitetura futura".
  content_type text not null default 'video' check (content_type in ('video', 'text', 'quiz')),
  video_provider text not null default 'youtube'
    check (video_provider in ('youtube', 'vimeo', 'bunny', 'cloudflare', 'supabase', 'url')),
  -- Semântica de video_ref depende do provider — ver lib/video-providers.ts.
  video_ref text,
  duration_seconds int not null default 0 check (duration_seconds >= 0),
  order_index int not null default 0,
  is_required boolean not null default true,
  keywords text[] not null default '{}',
  -- Materiais complementares: [{ "title": "...", "url": "..." }] — sem
  -- tabela própria porque não há necessidade de consultar/filtrar por
  -- material individualmente, só listar dentro da aula.
  resources jsonb not null default '[]',
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_lessons_video_ref_required
    check (content_type <> 'video' or video_ref is not null)
);
create index training_lessons_module_order_idx on public.training_lessons(module_id, order_index);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.training_lessons(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  progress_seconds int not null default 0 check (progress_seconds >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index lesson_progress_user_last_accessed_idx on public.lesson_progress(user_id, last_accessed_at desc);
create index lesson_progress_lesson_idx on public.lesson_progress(lesson_id);

alter table public.training_modules enable row level security;
alter table public.training_lessons enable row level security;
alter table public.lesson_progress enable row level security;

-- training_modules: leitura pública (autenticado) só de publicado; admin lê
-- tudo (inclui rascunho/arquivado, pra gerenciar). Escrita só admin.
create policy "training_modules: read published or admin" on public.training_modules
  for select using (status = 'published' or public.is_admin());

create policy "training_modules: admin write" on public.training_modules
  for all using (public.is_admin()) with check (public.is_admin());

-- training_lessons: só aparece pro usuário comum se a aula E o módulo dela
-- estiverem publicados (uma aula publicada dentro de um módulo em rascunho
-- não deve vazar) — admin sempre vê tudo.
create policy "training_lessons: read published or admin" on public.training_lessons
  for select using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.training_modules m
        where m.id = training_lessons.module_id and m.status = 'published'
      )
    )
  );

create policy "training_lessons: admin write" on public.training_lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- lesson_progress: cada usuário só mexe no próprio registro (nunca aceita
-- user_id vindo do client — toda Server Action usa ctx.userId). Admin lê
-- tudo (só leitura) pra métricas de conclusão/abandono, nunca escreve
-- progresso de outra pessoa — ver PLATFORM_ADMIN.md sobre não haver
-- backdoor mesmo pra super_admin.
create policy "lesson_progress: owner all" on public.lesson_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lesson_progress: admin read" on public.lesson_progress
  for select using (public.is_admin());

create trigger training_modules_set_updated_at
  before update on public.training_modules
  for each row execute function public.touch_updated_at();

create trigger training_lessons_set_updated_at
  before update on public.training_lessons
  for each row execute function public.touch_updated_at();
