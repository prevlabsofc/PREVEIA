-- Marple / PrevEIA — Espaço individual do advogado dentro do escritório
-- Rodar manualmente no SQL Editor do Supabase.

-- 1) Pasta pessoal da petição. Texto livre, definido pelo próprio advogado.
--    Permite que cada membro organize suas petições sem afetar os colegas.
alter table public.documents
  add column if not exists pasta text;

create index if not exists documents_lawyer_pasta_idx
  on public.documents (lawyer_id, pasta);

-- 2) Modelos/estilos pessoais do advogado.
--    office_id é gravado sem FK porque o escritório é referenciado apenas por
--    lawyers.office_id no restante do schema.
create table if not exists public.modelos_pessoais (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  office_id uuid,
  titulo text not null,
  categoria text,
  conteudo text not null default '',
  compartilhado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists modelos_pessoais_lawyer_idx
  on public.modelos_pessoais (lawyer_id, updated_at desc);

create index if not exists modelos_pessoais_office_compartilhado_idx
  on public.modelos_pessoais (office_id, compartilhado);

-- 3) RLS: o modelo é privado do advogado; quando marcado como compartilhado,
--    fica visível (somente leitura) para os demais membros do mesmo escritório.
alter table public.modelos_pessoais enable row level security;

drop policy if exists modelos_pessoais_select on public.modelos_pessoais;
create policy modelos_pessoais_select on public.modelos_pessoais
  for select using (
    lawyer_id = auth.uid()
    or (
      compartilhado
      and office_id is not null
      and office_id = (select l.office_id from public.lawyers l where l.id = auth.uid())
    )
  );

drop policy if exists modelos_pessoais_insert on public.modelos_pessoais;
create policy modelos_pessoais_insert on public.modelos_pessoais
  for insert with check (lawyer_id = auth.uid());

drop policy if exists modelos_pessoais_update on public.modelos_pessoais;
create policy modelos_pessoais_update on public.modelos_pessoais
  for update using (lawyer_id = auth.uid()) with check (lawyer_id = auth.uid());

drop policy if exists modelos_pessoais_delete on public.modelos_pessoais;
create policy modelos_pessoais_delete on public.modelos_pessoais
  for delete using (lawyer_id = auth.uid());
