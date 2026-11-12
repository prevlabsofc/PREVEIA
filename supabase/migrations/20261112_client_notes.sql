-- Marple / PrevEIA — Anotações de cliente (histórico imutável na ficha)
-- Tabela `client_notes` substitui o uso de `clients.notes` na UI.
-- A coluna `clients.notes` permanece no banco (legado), sem escrita nova pela UI.

-- Função de escritório (pode já existir em bases que aplicaram chat_escritorio).
create or replace function public.current_office_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select office_id from public.lawyers where id = auth.uid()
$$;

grant execute on function public.current_office_id() to authenticated;

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id),
  texto text not null,
  created_at timestamptz not null default now()
);

comment on table public.client_notes is
  'Anotações/observações do cliente. Histórico append-only: sem UPDATE; DELETE só autor ou admin do escritório.';

create index if not exists client_notes_client_id_idx
  on public.client_notes (client_id, created_at desc);

alter table public.client_notes enable row level security;

grant select, insert, delete on public.client_notes to authenticated;

-- SELECT: dono do cliente ou membro do mesmo escritório.
drop policy if exists client_notes_select on public.client_notes;
create policy client_notes_select on public.client_notes
  for select to authenticated
  using (
    exists (
      select 1
        from public.clients c
        join public.lawyers dono on dono.id = c.lawyer_id
        join public.lawyers eu on eu.id = auth.uid()
       where c.id = client_notes.client_id
         and (
           c.lawyer_id = auth.uid()
           or (
             dono.office_id is not null
             and eu.office_id is not null
             and dono.office_id = eu.office_id
           )
         )
    )
  );

-- INSERT: autor = auth.uid(); cliente do próprio advogado ou do escritório.
drop policy if exists client_notes_insert on public.client_notes;
create policy client_notes_insert on public.client_notes
  for insert to authenticated
  with check (
    lawyer_id = auth.uid()
    and exists (
      select 1
        from public.clients c
        join public.lawyers dono on dono.id = c.lawyer_id
        join public.lawyers eu on eu.id = auth.uid()
       where c.id = client_notes.client_id
         and (
           c.lawyer_id = auth.uid()
           or (
             dono.office_id is not null
             and eu.office_id is not null
             and dono.office_id = eu.office_id
           )
         )
    )
  );

-- DELETE: autor da anotação ou owner (admin) do escritório do cliente.
drop policy if exists client_notes_delete on public.client_notes;
create policy client_notes_delete on public.client_notes
  for delete to authenticated
  using (
    lawyer_id = auth.uid()
    or exists (
      select 1
        from public.clients c
        join public.lawyers dono on dono.id = c.lawyer_id
        join public.lawyers eu on eu.id = auth.uid()
       where c.id = client_notes.client_id
         and eu.office_role = 'owner'
         and dono.office_id is not null
         and eu.office_id is not null
         and dono.office_id = eu.office_id
    )
  );

-- Sem policy de UPDATE: histórico é registro (não editável).

-- Migra conteúdo legado de clients.notes → uma linha em client_notes.
-- lawyer_id = dono do cliente (clients.lawyer_id); created_at = created_at do cliente.
insert into public.client_notes (client_id, lawyer_id, texto, created_at)
select
  c.id,
  c.lawyer_id,
  btrim(c.notes),
  coalesce(c.created_at, now())
from public.clients c
where c.notes is not null
  and length(btrim(c.notes)) > 0
  and not exists (
    select 1
      from public.client_notes n
     where n.client_id = c.id
       and n.texto = btrim(c.notes)
       and n.created_at = coalesce(c.created_at, n.created_at)
  );
