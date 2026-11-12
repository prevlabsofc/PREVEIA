-- Contexto interno do advogado na ficha — NÃO alimenta a petição gerada pela IA.
alter table public.clients
  add column if not exists observacoes_relevantes text;

comment on column public.clients.observacoes_relevantes is
  'Informações relevantes sobre o caso ou a cliente (telefones extras, ponto de referência, situação familiar, etc.). Apenas consulta interna; não entra na petição gerada pela IA.';

comment on column public.clients.notes is
  'Descrição curta do caso atual (Sobre o caso). Contexto interno para o advogado; não alimenta automaticamente a petição gerada pela IA.';
