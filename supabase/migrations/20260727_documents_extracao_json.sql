-- Marple / PrevEIA — Extração estruturada de PDFs longos (sentenças, acórdãos, petições)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- ADITIVO: persiste o JSON retornado por /api/extrair-documento-pdf na linha do documento.

alter table public.documents
  add column if not exists extracao_json jsonb;

comment on column public.documents.extracao_json is
  'JSON estruturado da extração via Claude (partes, numero_processo, teses, decisao, datas, resumo). Nulo quando não há extração.';

create index if not exists documents_lawyer_extracao_idx
  on public.documents (lawyer_id)
  where extracao_json is not null;
