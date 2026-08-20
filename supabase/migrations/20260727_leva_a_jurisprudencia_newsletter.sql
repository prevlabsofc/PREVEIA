-- Marple / PrevEIA — Leva A: colunas de sync, uso, origem, segmentos e tracking.
-- Rodar no SQL Editor do Supabase (ou via migrate). Idempotente.

-- ═══════════════════════════════════════════════════════════════════════════
-- A1 / A6 / A8 — jurisprudencias: origem, URL original, carimbo de importação
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.jurisprudencias
  add column if not exists origem text not null default 'manual';

alter table public.jurisprudencias
  add column if not exists url_original text;

alter table public.jurisprudencias
  add column if not exists importado_em timestamptz;

alter table public.jurisprudencias
  add column if not exists chave_externa text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'jurisprudencias_origem_check'
  ) then
    alter table public.jurisprudencias
      add constraint jurisprudencias_origem_check
      check (origem in ('manual', 'automatico'));
  end if;
end $$;

create unique index if not exists jurisprudencias_chave_externa_uidx
  on public.jurisprudencias (chave_externa)
  where chave_externa is not null;

create index if not exists jurisprudencias_importado_em_idx
  on public.jurisprudencias (importado_em desc nulls last);

create index if not exists jurisprudencias_origem_idx
  on public.jurisprudencias (origem);

-- Cadastros manuais/CSV anteriores à coluna ficam como 'manual'.
update public.jurisprudencias
set origem = 'manual'
where origem is null or origem = '';

-- ═══════════════════════════════════════════════════════════════════════════
-- A4 — busca fuzzy (pg_trgm + unaccent) + RPC de sugestão
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_trgm;
create extension if not exists unaccent;

create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$ select public.unaccent($1) $$;

create index if not exists jurisprudencias_assunto_trgm_idx
  on public.jurisprudencias
  using gin (public.immutable_unaccent(lower(assunto)) gin_trgm_ops);

create index if not exists jurisprudencias_ementa_trgm_idx
  on public.jurisprudencias
  using gin (public.immutable_unaccent(lower(coalesce(ementa, ''))) gin_trgm_ops);

-- Busca fuzzy + "Você quis dizer" (vocab de assuntos).
create or replace function public.buscar_jurisprudencias_fuzzy(
  p_termo text,
  p_tribunal text default null,
  p_limite int default 50
)
returns table (
  id uuid,
  tribunal text,
  tipo text,
  numero text,
  assunto text,
  ementa text,
  relevancia int,
  data_julgamento date,
  created_at timestamptz,
  origem text,
  url_original text,
  importado_em timestamptz,
  score real,
  sugestao text
)
language plpgsql
stable
security invoker
as $$
declare
  v_termo text := trim(coalesce(p_termo, ''));
  v_norm text;
  v_sugestao text;
begin
  if length(v_termo) < 2 then
    return;
  end if;

  v_norm := public.immutable_unaccent(lower(v_termo));

  select t.assunto into v_sugestao
  from (
    select distinct j.assunto,
      similarity(public.immutable_unaccent(lower(j.assunto)), v_norm) as sim
    from public.jurisprudencias j
    where similarity(public.immutable_unaccent(lower(j.assunto)), v_norm) > 0.25
    order by sim desc
    limit 1
  ) t
  where public.immutable_unaccent(lower(t.assunto)) <> v_norm;

  return query
  select
    j.id, j.tribunal, j.tipo, j.numero, j.assunto, j.ementa,
    j.relevancia, j.data_julgamento, j.created_at,
    j.origem, j.url_original, j.importado_em,
    greatest(
      similarity(public.immutable_unaccent(lower(j.assunto)), v_norm),
      word_similarity(v_norm, public.immutable_unaccent(lower(coalesce(j.ementa, '')))),
      word_similarity(v_norm, public.immutable_unaccent(lower(coalesce(j.numero, ''))))
    )::real as score,
    v_sugestao
  from public.jurisprudencias j
  where
    (p_tribunal is null or p_tribunal = '' or p_tribunal = 'Todos' or j.tribunal = p_tribunal)
    and (
      public.immutable_unaccent(lower(j.assunto)) % v_norm
      or public.immutable_unaccent(lower(coalesce(j.ementa, ''))) % v_norm
      or public.immutable_unaccent(lower(coalesce(j.numero, ''))) % v_norm
      or word_similarity(v_norm, public.immutable_unaccent(lower(j.assunto))) > 0.35
      or word_similarity(v_norm, public.immutable_unaccent(lower(coalesce(j.ementa, '')))) > 0.35
    )
  order by score desc, j.relevancia desc nulls last
  limit greatest(1, least(coalesce(p_limite, 50), 200));
end;
$$;

grant execute on function public.buscar_jurisprudencias_fuzzy(text, text, int) to authenticated;
grant execute on function public.buscar_jurisprudencias_fuzzy(text, text, int) to anon;
grant execute on function public.immutable_unaccent(text) to authenticated;
grant execute on function public.immutable_unaccent(text) to anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- A7 — jurisprudencia_uso (vínculo a clientes / casos do escritório)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.jurisprudencia_uso (
  id uuid primary key default gen_random_uuid(),
  jurisprudencia_id uuid not null
    references public.jurisprudencias(id) on delete cascade,
  lawyer_id uuid not null
    references public.lawyers(id) on delete cascade,
  office_id uuid,
  client_id uuid references public.clients(id) on delete set null,
  processo_id uuid,
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists jurisprudencia_uso_juris_idx
  on public.jurisprudencia_uso (jurisprudencia_id, created_at desc);

create index if not exists jurisprudencia_uso_lawyer_idx
  on public.jurisprudencia_uso (lawyer_id, created_at desc);

create index if not exists jurisprudencia_uso_office_idx
  on public.jurisprudencia_uso (office_id, created_at desc)
  where office_id is not null;

alter table public.jurisprudencia_uso enable row level security;

grant select, insert, update, delete on public.jurisprudencia_uso to authenticated;

drop policy if exists "jurisprudencia_uso_select" on public.jurisprudencia_uso;
create policy "jurisprudencia_uso_select" on public.jurisprudencia_uso
  for select to authenticated
  using (
    lawyer_id = auth.uid()
    or (
      office_id is not null
      and office_id = public.current_office_id()
    )
  );

drop policy if exists "jurisprudencia_uso_insert" on public.jurisprudencia_uso;
create policy "jurisprudencia_uso_insert" on public.jurisprudencia_uso
  for insert to authenticated
  with check (
    lawyer_id = auth.uid()
    and (
      office_id is null
      or office_id = public.current_office_id()
    )
  );

drop policy if exists "jurisprudencia_uso_update" on public.jurisprudencia_uso;
create policy "jurisprudencia_uso_update" on public.jurisprudencia_uso
  for update to authenticated
  using (lawyer_id = auth.uid())
  with check (lawyer_id = auth.uid());

drop policy if exists "jurisprudencia_uso_delete" on public.jurisprudencia_uso;
create policy "jurisprudencia_uso_delete" on public.jurisprudencia_uso
  for delete to authenticated
  using (lawyer_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- A11 — destino de publicação no blog
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.artigos
  add column if not exists destino_publicacao text not null default 'portal_cliente';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'artigos_destino_check'
  ) then
    alter table public.artigos
      add constraint artigos_destino_check
      check (destino_publicacao in ('portal_cliente', 'site_escritorio', 'linkedin'));
  end if;
end $$;

alter table public.lawyers
  add column if not exists site_url text;

alter table public.lawyers
  add column if not exists linkedin_url text;

-- ═══════════════════════════════════════════════════════════════════════════
-- A12 — segmentos Clientes vs Leads
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.newsletter_subscribers
  add column if not exists segmento text not null default 'lead';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'newsletter_subscribers_segmento_check'
  ) then
    alter table public.newsletter_subscribers
      add constraint newsletter_subscribers_segmento_check
      check (segmento in ('cliente', 'lead'));
  end if;
end $$;

create index if not exists newsletter_subscribers_segmento_idx
  on public.newsletter_subscribers (lawyer_id, segmento, ativo);

alter table public.newsletter_envios
  add column if not exists segmento text;

-- ═══════════════════════════════════════════════════════════════════════════
-- A15 — tracking open/click (destinatários + eventos)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.newsletter_envios_destinatarios (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null
    references public.newsletter_envios(id) on delete cascade,
  subscriber_id uuid
    references public.newsletter_subscribers(id) on delete set null,
  lawyer_id uuid not null
    references public.lawyers(id) on delete cascade,
  office_id uuid,
  email text not null,
  resend_email_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_destinatarios_resend_uidx
  on public.newsletter_envios_destinatarios (resend_email_id)
  where resend_email_id is not null;

create index if not exists newsletter_destinatarios_envio_idx
  on public.newsletter_envios_destinatarios (envio_id);

alter table public.newsletter_envios_destinatarios enable row level security;

grant select on public.newsletter_envios_destinatarios to authenticated;

drop policy if exists "newsletter_destinatarios_select" on public.newsletter_envios_destinatarios;
create policy "newsletter_destinatarios_select" on public.newsletter_envios_destinatarios
  for select to authenticated
  using (
    lawyer_id = auth.uid()
    or (office_id is not null and office_id = public.current_office_id())
  );

create table if not exists public.newsletter_eventos (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid
    references public.newsletter_envios(id) on delete cascade,
  destinatario_id uuid
    references public.newsletter_envios_destinatarios(id) on delete cascade,
  subscriber_id uuid
    references public.newsletter_subscribers(id) on delete set null,
  lawyer_id uuid,
  office_id uuid,
  tipo text not null check (tipo in ('open', 'click')),
  url text,
  resend_event_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_eventos_resend_uidx
  on public.newsletter_eventos (resend_event_id)
  where resend_event_id is not null;

create index if not exists newsletter_eventos_subscriber_idx
  on public.newsletter_eventos (subscriber_id, created_at desc);

create index if not exists newsletter_eventos_envio_idx
  on public.newsletter_eventos (envio_id, tipo);

alter table public.newsletter_eventos enable row level security;

grant select on public.newsletter_eventos to authenticated;

drop policy if exists "newsletter_eventos_select" on public.newsletter_eventos;
create policy "newsletter_eventos_select" on public.newsletter_eventos
  for select to authenticated
  using (
    lawyer_id = auth.uid()
    or (office_id is not null and office_id = public.current_office_id())
  );

-- Service role (webhook) grava via bypass RLS; authenticated só lê.
