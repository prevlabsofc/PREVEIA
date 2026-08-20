-- Marple / PrevEIA — Notificações clicáveis e com progresso
-- Rodar manualmente no SQL Editor do Supabase.

-- 1) Vínculo com o documento gerado. Permite abrir a petição direto
--    pela notificação. ON DELETE CASCADE: se o documento some, a
--    notificação que aponta para ele deixa de fazer sentido.
alter table public.notifications
  add column if not exists document_id uuid references public.documents(id) on delete cascade;

-- 2) Estado da tarefa. A UI mostra barra de progresso para
--    pending/running/processing/in_progress e trata done/error como final.
alter table public.notifications
  add column if not exists status text;

-- 3) Percentual 0–100. Quando nulo em uma tarefa em andamento,
--    a UI exibe barra indeterminada.
alter table public.notifications
  add column if not exists progress int;

alter table public.notifications
  drop constraint if exists notifications_progress_range;

alter table public.notifications
  add constraint notifications_progress_range
  check (progress is null or (progress >= 0 and progress <= 100));

-- 4) Destino genérico para notificações que não apontam para um documento.
alter table public.notifications
  add column if not exists link text;

create index if not exists notifications_document_idx
  on public.notifications (document_id);

create index if not exists notifications_lawyer_created_idx
  on public.notifications (lawyer_id, created_at desc);
