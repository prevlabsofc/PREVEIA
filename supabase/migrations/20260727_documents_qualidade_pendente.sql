-- Marple / PrevEIA — Marcador de qualidade a confirmar em documentos de prova
-- Rodar manualmente no SQL Editor do Supabase.
--
-- ADITIVO: não altera colunas existentes. Usado quando o advogado salva uma
-- imagem de prova apesar do aviso client-side de baixa qualidade
-- (resolução / brilho / contraste / nitidez).

alter table public.documents
  add column if not exists qualidade_pendente boolean not null default false;

comment on column public.documents.qualidade_pendente is
  'true quando o arquivo de prova foi aceito com aviso de baixa qualidade. Exibir badge "qualidade a confirmar".';

-- Metadados de arquivo anexado (provas / scans). Petições geradas pela IA
-- deixam estes campos nulos.
alter table public.documents
  add column if not exists file_url text;

alter table public.documents
  add column if not exists mime_type text;

comment on column public.documents.file_url is
  'URL pública do arquivo anexado (Supabase Storage), quando o documento é uma prova/scan.';

comment on column public.documents.mime_type is
  'MIME type do arquivo anexado (ex.: image/jpeg). Nulo para petições geradas.';

create index if not exists documents_lawyer_qualidade_pendente_idx
  on public.documents (lawyer_id, qualidade_pendente)
  where qualidade_pendente = true;

-- Bucket público para scans/provas (mesmo padrão de logos/signatures).
insert into storage.buckets (id, name, public)
values ('provas', 'provas', true)
on conflict (id) do nothing;

drop policy if exists provas_select on storage.objects;
create policy provas_select on storage.objects
  for select using (bucket_id = 'provas');

drop policy if exists provas_insert on storage.objects;
create policy provas_insert on storage.objects
  for insert with check (
    bucket_id = 'provas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists provas_update on storage.objects;
create policy provas_update on storage.objects
  for update using (
    bucket_id = 'provas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists provas_delete on storage.objects;
create policy provas_delete on storage.objects
  for delete using (
    bucket_id = 'provas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
