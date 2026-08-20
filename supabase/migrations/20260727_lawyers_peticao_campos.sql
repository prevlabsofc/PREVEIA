-- Campos de identidade visual e local usados nas petições (PDF/DOCX).
-- Idempotente: não duplica colunas já existentes em bases antigas.

alter table public.lawyers
  add column if not exists logo_url text;

alter table public.lawyers
  add column if not exists signature_url text;

alter table public.lawyers
  add column if not exists cor_peticao text;

alter table public.lawyers
  add column if not exists cidade text;

alter table public.lawyers
  add column if not exists estado text;

-- Backfill a partir de city/state se a base legada tiver esses nomes.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lawyers' and column_name = 'city'
  ) then
    update public.lawyers
       set cidade = coalesce(nullif(trim(cidade), ''), nullif(trim(city), ''))
     where cidade is null or trim(cidade) = '';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lawyers' and column_name = 'state'
  ) then
    update public.lawyers
       set estado = coalesce(nullif(trim(estado), ''), nullif(trim(state), ''), oab_uf)
     where estado is null or trim(estado) = '';
  end if;
end $$;

comment on column public.lawyers.logo_url is
  'URL pública do logo/timbre/banner do escritório (Supabase Storage).';
comment on column public.lawyers.cidade is
  'Cidade do escritório para linha de local/data nas petições.';
comment on column public.lawyers.estado is
  'UF do escritório para linha de local/data nas petições.';
