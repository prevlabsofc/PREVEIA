-- Assinatura do advogado (imagem usada acima do traço na petição PDF/DOCX).
-- O bucket passa a ser privado: cada usuário só lê/grava/remove arquivos na
-- própria pasta (<auth.uid()>/...). A leitura é feita pelo cliente autenticado
-- (storage.download) ou server-side com a sessão do usuário.
-- lawyers.signature_url passa a guardar o path no bucket (ex.: '<uid>/assinatura.png').

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signatures', 'signatures', false, 3145728, array['image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists signatures_select on storage.objects;
create policy signatures_select on storage.objects
  for select to authenticated using (
    bucket_id = 'signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists signatures_insert on storage.objects;
create policy signatures_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists signatures_update on storage.objects;
create policy signatures_update on storage.objects
  for update to authenticated using (
    bucket_id = 'signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists signatures_delete on storage.objects;
create policy signatures_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'signatures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- URLs públicas antigas → path no bucket.
update public.lawyers
set signature_url = regexp_replace(
  split_part(signature_url, '?', 1),
  '^.*/storage/v1/object/(public|sign|authenticated)/signatures/',
  ''
)
where signature_url ~ '/storage/v1/object/(public|sign|authenticated)/signatures/';

comment on column public.lawyers.signature_url is
  'Path da imagem PNG da assinatura no bucket privado "signatures" (ex.: <uid>/assinatura.png).';
