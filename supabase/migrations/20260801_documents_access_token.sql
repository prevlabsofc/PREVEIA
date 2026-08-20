-- Link público de recuperação do documento (estilo "copia e cola").
-- O token em claro só é exibido uma vez ao gerar; no banco fica o hash.
-- Mantém também access_token UUID auxiliar conforme especificação.

alter table public.documents
  add column if not exists access_token uuid default gen_random_uuid();

alter table public.documents
  add column if not exists access_token_hash text;

alter table public.documents
  add column if not exists access_token_created_at timestamptz;

create index if not exists idx_documents_access_token
  on public.documents (access_token)
  where access_token is not null;

create unique index if not exists documents_access_token_hash_uidx
  on public.documents (access_token_hash)
  where access_token_hash is not null;

comment on column public.documents.access_token is
  'UUID auxiliar do documento (default gen_random_uuid).';

comment on column public.documents.access_token_hash is
  'SHA-256 hex do token público /documento/[token]. O token em claro não é persistido.';

comment on column public.documents.access_token_created_at is
  'Quando o link de acesso público foi gerado/regenerado.';
