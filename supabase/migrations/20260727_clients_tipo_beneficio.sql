-- Marple / PrevEIA — Tipo de benefício do cliente (checklist INSS)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- Nome canônico: clients.tipo_beneficio
-- Alimenta a checklist dinâmica em /clientes/[id] (lib/checklist-inss.ts)
-- e o resumo "Documentos recebidos: X/Y" após upload de anexos.
--
-- Somente coluna nova — não altera RPCs de cargos (clientes_visiveis) para
-- não conflitar com migrações paralelas de stage/CRM. O campo é operacional
-- (não sensível): a ficha do cliente lê via select direto / API conforme RBAC.

alter table public.clients
  add column if not exists tipo_beneficio text;

comment on column public.clients.tipo_beneficio is
  'Tipo de benefício/caso INSS (chave de lib/checklist-inss CHECKLIST_INSS).';

create index if not exists clients_lawyer_tipo_beneficio_idx
  on public.clients (lawyer_id, tipo_beneficio)
  where tipo_beneficio is not null;
