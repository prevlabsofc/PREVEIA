-- Marple / PrevEIA — Agentes principais e tipos de documento
-- Rodar manualmente no SQL Editor do Supabase.
--
-- ATENÇÃO: migração ainda NÃO aplicada. É puramente ADITIVA e não altera o
-- comportamento atual da geração. Hoje os 31 agentes existem apenas como a
-- constante GRUPOS em app/(dashboard)/agentes/page.tsx; a API recebe
-- `agentType` = a `key` do agente e grava esse mesmo texto em
-- documents.agent_type. Aqui esse catálogo passa a existir também no banco,
-- com as MESMAS chaves em agent_document_types.slug, acrescido do nível
-- "agente principal". Nenhuma chave é renomeada, nada é apagado e nenhuma
-- coluna existente muda de tipo ou de obrigatoriedade — por isso
-- /api/gerar-documento e lib/agents.getSystemPrompt continuam funcionando
-- exatamente como hoje, para todos os 31 tipos.

-- 1) Agente principal (a "família"). É o nó central que recebe os dados do
--    caso e decide qual documento gerar. lawyer_id nulo = catálogo global
--    mantido pela Marple; preenchido = família criada pelo próprio advogado
--    para organizar os agentes personalizados dele.
create table if not exists public.agent_families (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid references public.lawyers(id) on delete cascade,
  slug text not null,
  nome text not null,
  descricao text,
  area text,
  cor text,
  icone text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slug único dentro do escopo: um namespace para o catálogo global e outro
-- por advogado, para que uma família particular nunca colida com a global.
create unique index if not exists agent_families_slug_global_idx
  on public.agent_families (slug) where lawyer_id is null;

create unique index if not exists agent_families_slug_lawyer_idx
  on public.agent_families (lawyer_id, slug) where lawyer_id is not null;

create index if not exists agent_families_ordem_idx
  on public.agent_families (ativo, ordem);

-- 2) Tipo de documento (o "filho"). É o que hoje aparece solto na listagem.
--    O slug é o CONTRATO com a camada de geração: é o valor enviado em
--    agentType, a chave de lib/agents.getSystemPrompt, a chave usada em
--    lib/modelos-peticao.agentes[] e o texto gravado em documents.agent_type.
--    Por isso é único globalmente (e não apenas dentro da família).
create table if not exists public.agent_document_types (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.agent_families(id) on delete cascade,
  slug text not null unique,
  nome text not null,
  descricao text,
  tags text[] not null default '{}',
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_document_types_family_idx
  on public.agent_document_types (family_id, ordem);

-- 3) RLS. O catálogo é somente leitura para o app: as escritas do seed abaixo
--    e de eventuais telas de admin passam pela service role, que ignora RLS.
--    O advogado enxerga o catálogo global e as próprias famílias.
alter table public.agent_families enable row level security;

drop policy if exists agent_families_select on public.agent_families;
create policy agent_families_select on public.agent_families
  for select using (lawyer_id is null or lawyer_id = auth.uid());

drop policy if exists agent_families_insert on public.agent_families;
create policy agent_families_insert on public.agent_families
  for insert with check (lawyer_id = auth.uid());

drop policy if exists agent_families_update on public.agent_families;
create policy agent_families_update on public.agent_families
  for update using (lawyer_id = auth.uid()) with check (lawyer_id = auth.uid());

drop policy if exists agent_families_delete on public.agent_families;
create policy agent_families_delete on public.agent_families
  for delete using (lawyer_id = auth.uid());

alter table public.agent_document_types enable row level security;

drop policy if exists agent_document_types_select on public.agent_document_types;
create policy agent_document_types_select on public.agent_document_types
  for select using (
    exists (
      select 1 from public.agent_families f
      where f.id = family_id
        and (f.lawyer_id is null or f.lawyer_id = auth.uid())
    )
  );

-- 4) Vínculo opcional do agente personalizado (PDF enviado pelo advogado) com
--    uma família. Nulo = agente avulso, que é o estado de todas as linhas
--    existentes hoje. ON DELETE SET NULL para que apagar uma família nunca
--    destrua o modelo que o advogado subiu.
alter table public.custom_agents
  add column if not exists family_id uuid references public.agent_families(id) on delete set null;

create index if not exists custom_agents_family_idx
  on public.custom_agents (family_id);

-- 5) Família do documento já gerado. Coluna nova e anulável, usada apenas para
--    agrupar histórico/relatórios por agente principal. documents.agent_type
--    permanece intocado e continua sendo a fonte da verdade da geração.
alter table public.documents
  add column if not exists agent_family text;

create index if not exists documents_lawyer_agent_family_idx
  on public.documents (lawyer_id, agent_family);

-- 6) Seed do catálogo global: 10 agentes principais.
insert into public.agent_families (lawyer_id, slug, nome, descricao, area, cor, icone, ordem) values
  (null, 'salario-maternidade',    'Agente Salário-Maternidade',                'Concessão de salário-maternidade conforme a qualidade de segurada da autora.',        'Previdenciário', '#D4AF37', 'Users',          1),
  (null, 'aposentadoria-rural',    'Agente Aposentadoria Rural',                'Aposentadoria por idade do segurado especial, com início de prova material.',         'Rural',          '#22C55E', 'BookOpen',       2),
  (null, 'aposentadoria-urbana',   'Agente Aposentadoria Urbana',               'Aposentadoria do segurado urbano por tempo, idade ou atividade especial.',            'Urbano',         '#3B82F6', 'Scale',          3),
  (null, 'incapacidade',           'Agente de Incapacidade',                    'Incapacidade laborativa temporária ou permanente, com perícia médica.',               'Previdenciário', '#EF4444', 'Stethoscope',    4),
  (null, 'bpc-loas',               'Agente BPC/LOAS',                           'Benefício assistencial de prestação continuada por deficiência ou idade.',            'Previdenciário', '#F97316', 'Accessibility',  5),
  (null, 'pensao-por-morte',       'Agente Pensão por Morte',                   'Pensão ao dependente do instituidor falecido, rural ou urbano.',                      'Previdenciário', '#64748B', 'HeartHandshake', 6),
  (null, 'revisoes',               'Agente de Revisões',                        'Revisão da renda mensal inicial e das diferenças devidas ao segurado.',               'Recursos',       '#A855F7', 'Calculator',     7),
  (null, 'recursos-judiciais',     'Agente de Recursos Judiciais',              'Impugnação de decisão judicial desfavorável no TRF, na TNU ou no STJ.',               'Recursos',       '#8B5CF6', 'Gavel',          8),
  (null, 'administrativo-inss',    'Agente de Postulação Administrativa INSS',  'Requerimentos e recursos na via administrativa, antes ou em lugar da judicial.',      'Documentos',     '#6B21A8', 'Building2',      9),
  (null, 'documentos-escritorio',  'Agente de Documentos do Escritório',        'Contratos, procurações e declarações da relação entre escritório e cliente.',         'Documentos',     '#94A3B8', 'Briefcase',     10)
on conflict (slug) where lawyer_id is null do nothing;

-- 7) Seed dos 31 tipos de documento. Os slugs são exatamente as `key` de
--    GRUPOS em app/(dashboard)/agentes/page.tsx — nenhuma foi renomeada.
insert into public.agent_document_types (family_id, slug, nome, descricao, tags, ordem)
select f.id, t.slug, t.nome, t.descricao, t.tags, t.ordem
from (values
  ('salario-maternidade',   'salario-maternidade-rural',        'Salário-Maternidade Segurada Especial Rural',          'Agricultora / Pescadora / Extrativista — JEF', array['Petição Inicial','Réplica']::text[],    1),
  ('salario-maternidade',   'salario-maternidade-ci',           'Salário-Maternidade Contribuinte Individual',          'Autônoma / MEI / Diarista — JEF',              array['Petição Inicial','Recurso'],           2),
  ('salario-maternidade',   'salario-maternidade-facultativa',  'Salário-Maternidade Segurada Facultativa',             'Dona de casa contribuinte — JEF',              array['Petição Inicial'],                     3),
  ('salario-maternidade',   'salario-maternidade-clt',          'Salário-Maternidade CLT',                              'Empregada com carteira — Recurso INSS',        array['Recurso'],                             4),

  ('aposentadoria-rural',   'apos-idade-rural-mulher',          'Aposentadoria por Idade Rural — Mulher (55 anos)',     'Segurada Especial — JEF',                      array['Petição Inicial','Réplica'],           1),
  ('aposentadoria-rural',   'apos-idade-rural-homem',           'Aposentadoria por Idade Rural — Homem (60 anos)',      'Segurado Especial — JEF',                      array['Petição Inicial','Réplica'],           2),
  ('aposentadoria-rural',   'apos-rural-pescador',              'Aposentadoria Rural — Pescador Artesanal',             'Pescador artesanal — JEF',                     array['Petição Inicial'],                     3),
  ('aposentadoria-rural',   'apos-rural-garimpeiro',            'Aposentadoria Rural — Garimpeiro/Extrativista',        'Garimpeiro / Extrativista — JEF',              array['Petição Inicial'],                     4),

  ('aposentadoria-urbana',  'apos-tempo-contribuicao',          'Aposentadoria por Tempo de Contribuição',              'CLT / CI / Facultativo — JEF',                 array['Petição Inicial','Réplica'],           1),
  ('aposentadoria-urbana',  'apos-idade-urbana',                'Aposentadoria por Idade Urbana (65H/62M)',             'CLT / CI / Facultativo — JEF',                 array['Petição Inicial'],                     2),
  ('aposentadoria-urbana',  'apos-especial-insalubridade',      'Aposentadoria Especial — Insalubridade',               'Trabalhador insalubre — JEF',                  array['Petição Inicial','Laudo'],             3),

  ('incapacidade',          'auxilio-incapacidade',             'Auxílio por Incapacidade Temporária (Auxílio-Doença)', 'Qualquer segurado — JEF',                      array['Petição Inicial','Recurso'],           1),
  ('incapacidade',          'apos-invalidez',                   'Aposentadoria por Invalidez Permanente',               'Qualquer segurado — JEF',                      array['Petição Inicial'],                     2),

  ('bpc-loas',              'bpc-deficiencia',                  'BPC/LOAS — Pessoa com Deficiência',                    'Deficiente de baixa renda — JEF',              array['Petição Inicial','Estudo Social'],     1),
  ('bpc-loas',              'bpc-idoso',                        'BPC/LOAS — Idoso (65+ anos)',                          'Idoso de baixa renda — JEF',                   array['Petição Inicial'],                     2),

  ('pensao-por-morte',      'pensao-morte-rural',               'Pensão por Morte — Dependente Rural',                  'Cônjuge / Filho / Dependente rural — JEF',     array['Petição Inicial','Réplica'],           1),
  ('pensao-por-morte',      'pensao-morte-urbano',              'Pensão por Morte — Dependente Urbano',                 'Cônjuge / Filho / Dependente urbano — JEF',    array['Petição Inicial'],                     2),

  ('revisoes',              'revisao-beneficio',                'Revisão do Benefício — Teto Previdenciário',           'Benefício calculado abaixo do correto',        array['Cálculo','Petição'],                   1),

  ('recursos-judiciais',    'recurso-trf',                      'Recurso ao TRF (Apelação)',                            'Sentença desfavorável — Recurso judicial',     array['Recurso'],                             1),
  ('recursos-judiciais',    'recurso-tnu',                      'Pedido de Uniformização TNU',                          'Divergência entre JEFs — PU',                  array['PU'],                                  2),
  ('recursos-judiciais',    'recurso-stj',                      'Recurso ao STJ (REsp)',                                'Questão de direito federal',                   array['Recurso Especial'],                    3),

  ('administrativo-inss',   'requerimento-inss',                'Requerimento Administrativo INSS',                     'Dar entrada no benefício — Carta/ofício',      array['Requerimento'],                        1),
  ('administrativo-inss',   'pedido-reconsideracao',            'Pedido de Reconsideração INSS',                        'Segunda chance administrativa',                array['Pedido'],                              2),
  ('administrativo-inss',   'recurso-administrativo',           'Recurso Administrativo INSS',                          'Contestar indeferimento',                      array['Recurso'],                             3),
  ('administrativo-inss',   'recurso-crps',                     'Recurso ao CRPS/Junta de Recursos',                    'Indeferimento INSS — Petição administrativa',  array['Recurso'],                             4),

  ('documentos-escritorio', 'contrato-honorarios-exito',        'Contrato de Honorários — Percentual (Êxito)',          'Honorários só se ganhar',                      array['Contrato'],                            1),
  ('documentos-escritorio', 'contrato-honorarios-fixo',         'Contrato de Honorários — Valor Fixo',                  'Valor fixo mensal ou por ato',                 array['Contrato'],                            2),
  ('documentos-escritorio', 'procuracao-inss',                  'Procuração INSS',                                      'Representar cliente no INSS',                  array['Procuração'],                          3),
  ('documentos-escritorio', 'carta-preposicao',                 'Carta de Preposição',                                  'Autorizar preposto no INSS',                   array['Carta'],                               4),
  ('documentos-escritorio', 'declaracao-hipossuficiencia',      'Declaração de Hipossuficiência',                       'Gratuidade da justiça',                        array['Declaração'],                          5),
  ('documentos-escritorio', 'relatorio-audiencia',              'Relatório de Audiência',                               'Documentar o ocorrido na audiência',           array['Relatório'],                           6)
) as t(family_slug, slug, nome, descricao, tags, ordem)
join public.agent_families f on f.slug = t.family_slug and f.lawyer_id is null
on conflict (slug) do nothing;

-- 8) Backfill de documents.agent_family. Só preenche a coluna recém-criada
--    quando o agent_type gravado casa com um slug conhecido; documentos
--    antigos com agent_type 'manual', UUID de agente personalizado ou slug
--    desconhecido simplesmente ficam com agent_family nulo.
update public.documents d
set agent_family = f.slug
from public.agent_document_types t
join public.agent_families f on f.id = t.family_id
where d.agent_type = t.slug
  and d.agent_family is null;

-- 9) Conferência (opcional): deve retornar 10 famílias e 31 tipos.
-- select count(*) from public.agent_families where lawyer_id is null;
-- select count(*) from public.agent_document_types;
-- select f.slug, count(t.id) from public.agent_families f
--   left join public.agent_document_types t on t.family_id = f.id
--   where f.lawyer_id is null group by f.slug order by f.slug;

-- 10) Rollback. Descomentar e rodar para desfazer por completo. Como tudo
--     acima é aditivo, o rollback devolve o banco ao estado anterior sem
--     perder nenhum dado de documento ou de agente personalizado.
-- alter table public.documents drop column if exists agent_family;
-- alter table public.custom_agents drop column if exists family_id;
-- drop table if exists public.agent_document_types;
-- drop table if exists public.agent_families;
