-- Marple — Tipo de documento obrigatório em agentes próprios
-- Identifica o que o agente gera (petição SM rural, contrato, honorários etc.)
-- e associa o agente ao botão correto na ficha do cliente.

alter table public.custom_agents
  add column if not exists document_type text;

alter table public.custom_agents
  add column if not exists document_type_label text;

comment on column public.custom_agents.document_type is
  'ID do tipo em lib/agentes/tipos-documento-agente.ts (ex.: peticao_sm_rural).';

comment on column public.custom_agents.document_type_label is
  'Texto livre quando document_type é peticao_outros ou outros.';

create index if not exists custom_agents_lawyer_doc_type_idx
  on public.custom_agents (lawyer_id, document_type);
