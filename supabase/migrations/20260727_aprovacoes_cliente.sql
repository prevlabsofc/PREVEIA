-- Marple / PrevEIA — Aceite formal do cliente (revisão pública antes do protocolo)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- O token bruto NUNCA é gravado: só o SHA-256 (hex) em `token_hash`.
-- Acesso público ao conteúdo acontece exclusivamente via route handler com
-- service role, lookup por hash — anon/authenticated não leem por token.

create table if not exists public.aprovacoes_cliente (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aceito', 'recusado', 'expirado', 'revogado')),
  -- Snapshot imutável do que foi mostrado ao cliente no momento do envio.
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_ip text,
  accepted_ua text,
  declined_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.lawyers(id) on delete set null
);

comment on table public.aprovacoes_cliente is
  'Links públicos de revisão/aceite do caso. Token só existe hasheado; leitura pública via API server-side.';

comment on column public.aprovacoes_cliente.token_hash is
  'SHA-256 hex do token aleatório (32+ bytes). O plaintext nunca é persistido.';

comment on column public.aprovacoes_cliente.snapshot is
  'Campos curados exibidos ao cliente no envio — base auditável do aceite.';

-- Um hash = um link. Impede colisão e lookup ambiguo.
create unique index if not exists aprovacoes_cliente_token_hash_uidx
  on public.aprovacoes_cliente (token_hash);

create index if not exists aprovacoes_cliente_client_id_idx
  on public.aprovacoes_cliente (client_id, created_at desc);

create index if not exists aprovacoes_cliente_status_idx
  on public.aprovacoes_cliente (status)
  where status = 'pendente';

alter table public.aprovacoes_cliente enable row level security;

-- Sem policy para anon: a página pública NÃO consulta esta tabela direto.
-- Escritório autenticado: só vê/cria/atualiza aprovações dos próprios clientes
-- (lawyer_id do client = auth.uid()).

drop policy if exists aprovacoes_cliente_select on public.aprovacoes_cliente;
create policy aprovacoes_cliente_select on public.aprovacoes_cliente
  for select to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = aprovacoes_cliente.client_id
        and c.lawyer_id = auth.uid()
    )
  );

drop policy if exists aprovacoes_cliente_insert on public.aprovacoes_cliente;
create policy aprovacoes_cliente_insert on public.aprovacoes_cliente
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.id = aprovacoes_cliente.client_id
        and c.lawyer_id = auth.uid()
    )
  );

drop policy if exists aprovacoes_cliente_update on public.aprovacoes_cliente;
create policy aprovacoes_cliente_update on public.aprovacoes_cliente
  for update to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = aprovacoes_cliente.client_id
        and c.lawyer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = aprovacoes_cliente.client_id
        and c.lawyer_id = auth.uid()
    )
  );

-- Sem DELETE para authenticated: histórico de aceite é auditável.
-- Revogação = status 'revogado' via UPDATE.
