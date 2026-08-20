-- Marple / PrevEIA — IA Consultora: pastas e vínculo com casos
-- Rodar manualmente no SQL Editor do Supabase.

-- 1) Pasta (organização do histórico). Texto livre, definido pelo advogado.
alter table public.ia_conversations
  add column if not exists pasta text;

-- 2) Vínculo opcional da conversa com um cliente/caso.
alter table public.ia_conversations
  add column if not exists client_id uuid references public.clients(id) on delete set null;

-- 3) Índices para a listagem do histórico (filtro por pasta e por caso).
create index if not exists ia_conversations_lawyer_pasta_idx
  on public.ia_conversations (lawyer_id, pasta);

create index if not exists ia_conversations_client_id_idx
  on public.ia_conversations (client_id);
