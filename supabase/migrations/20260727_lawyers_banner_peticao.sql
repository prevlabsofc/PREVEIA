-- Banner/timbre das petições + garantia de campos usados no export.
-- Colunas já existentes (logo_url, cidade, estado, cor_peticao, estilo_peticao)
-- usam IF NOT EXISTS para não duplicar.

alter table public.lawyers
  add column if not exists banner_url text;

alter table public.lawyers
  add column if not exists logo_url text;

alter table public.lawyers
  add column if not exists signature_url text;

alter table public.lawyers
  add column if not exists cidade text;

alter table public.lawyers
  add column if not exists estado text;

alter table public.lawyers
  add column if not exists cor_peticao text;

comment on column public.lawyers.banner_url is
  'URL pública do banner/timbre do escritório (Supabase Storage), usado no topo das petições PDF/DOCX.';
