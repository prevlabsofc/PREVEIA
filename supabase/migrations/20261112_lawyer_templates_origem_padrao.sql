-- Marple — Modelos de documento editáveis
-- Amplia lawyer_templates para guardar cópias dos padrões do sistema
-- (os padrões em si ficam versionados em código — nunca são sobrescritos).

alter table public.lawyer_templates
  add column if not exists origem_padrao_id text;

alter table public.lawyer_templates
  add column if not exists versao_padrao integer;

comment on column public.lawyer_templates.origem_padrao_id is
  'ID do modelo padrão em lib/modelos/padrao.ts (ex.: peticao-previdenciaria). Null = modelo criado do zero.';

comment on column public.lawyer_templates.versao_padrao is
  'Versão do padrão na época em que a cópia foi criada/atualizada.';

create index if not exists lawyer_templates_lawyer_tipo_idx
  on public.lawyer_templates (lawyer_id, tipo);

create index if not exists lawyer_templates_origem_padrao_idx
  on public.lawyer_templates (lawyer_id, origem_padrao_id)
  where origem_padrao_id is not null;
