-- Marple / PrevEIA — Chat interno do escritório (/chat)
-- Rodar manualmente no SQL Editor do Supabase.

-- 1) Tabela das mensagens do chat interno.
create table if not exists public.chat_escritorio (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  lawyer_name text,
  mensagem text not null,
  created_at timestamptz not null default now()
);

-- Garante as colunas usadas pelo app caso a tabela já exista de uma versão anterior.
alter table public.chat_escritorio add column if not exists lawyer_name text;
alter table public.chat_escritorio add column if not exists created_at timestamptz not null default now();

-- 2) Listagem por escritório em ordem cronológica.
create index if not exists chat_escritorio_office_created_idx
  on public.chat_escritorio (office_id, created_at);

-- 3) Escritório do advogado autenticado. SECURITY DEFINER para que as políticas
--    abaixo não dependam do RLS da tabela lawyers.
create or replace function public.current_office_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select office_id from public.lawyers where id = auth.uid()
$$;

grant execute on function public.current_office_id() to authenticated;

-- 4) RLS: cada advogado lê e escreve apenas no chat do próprio escritório.
alter table public.chat_escritorio enable row level security;

grant select, insert, delete on public.chat_escritorio to authenticated;

drop policy if exists "chat_escritorio_select" on public.chat_escritorio;
create policy "chat_escritorio_select" on public.chat_escritorio
  for select to authenticated
  using (office_id = public.current_office_id());

drop policy if exists "chat_escritorio_insert" on public.chat_escritorio;
create policy "chat_escritorio_insert" on public.chat_escritorio
  for insert to authenticated
  with check (lawyer_id = auth.uid() and office_id = public.current_office_id());

drop policy if exists "chat_escritorio_delete" on public.chat_escritorio;
create policy "chat_escritorio_delete" on public.chat_escritorio
  for delete to authenticated
  using (lawyer_id = auth.uid());

-- 5) Realtime: sem a tabela na publicação o INSERT não gera evento e a mensagem
--    só apareceria para os outros advogados depois de recarregar a página.
alter table public.chat_escritorio replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_escritorio'
  ) then
    alter publication supabase_realtime add table public.chat_escritorio;
  end if;
end
$$;
