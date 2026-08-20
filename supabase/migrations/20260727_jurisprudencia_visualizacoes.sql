-- Marple / PrevEIA — Controle de leitura das jurisprudências (/jurisprudencia)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- ESCOPO DESTA MIGRAÇÃO: apenas o rastreio de "lida / não lida".
-- Nada é adicionado ou alterado em public.jurisprudencias — a sincronização
-- diária (cron de importação) é responsável pelas colunas dela, inclusive por
-- um eventual carimbo de importação e pela constraint de unicidade.
--
-- POR QUE UMA TABELA DE JUNÇÃO E NÃO UM `lida` boolean OU UM `visualizada_por uuid[]`:
--   * `lida` boolean seria global: um advogado abrindo a ementa marcaria a
--     jurisprudência como lida para todo o escritório.
--   * `visualizada_por uuid[]` exigiria conceder UPDATE em public.jurisprudencias
--     (base compartilhada por todos os escritórios, sem lawyer_id/office_id) e
--     sofreria corrida de escrita: dois advogados lendo ao mesmo tempo fazem
--     read-modify-write e um sobrescreve o append do outro.
--   * A tabela abaixo isola a leitura por advogado, é append-only e a chave
--     primária composta elimina qualquer corrida (ON CONFLICT DO NOTHING).

create table if not exists public.jurisprudencia_visualizacoes (
  jurisprudencia_id uuid not null
    references public.jurisprudencias(id) on delete cascade,
  lawyer_id uuid not null
    references public.lawyers(id) on delete cascade,
  visualizada_em timestamptz not null default now(),
  primary key (jurisprudencia_id, lawyer_id)
);

-- Consulta principal da tela: "quais jurisprudências ESTE advogado já leu".
create index if not exists jurisprudencia_visualizacoes_lawyer_idx
  on public.jurisprudencia_visualizacoes (lawyer_id, visualizada_em desc);

-- RLS: a leitura é um dado pessoal do advogado. Ele enxerga e grava apenas as
-- próprias visualizações; ninguém do escritório lê o histórico dos colegas.
-- Sem UPDATE: a linha é imutável, o primeiro acesso define visualizada_em.
alter table public.jurisprudencia_visualizacoes enable row level security;

grant select, insert, delete on public.jurisprudencia_visualizacoes to authenticated;

drop policy if exists "jurisprudencia_visualizacoes_select" on public.jurisprudencia_visualizacoes;
create policy "jurisprudencia_visualizacoes_select" on public.jurisprudencia_visualizacoes
  for select to authenticated
  using (lawyer_id = auth.uid());

drop policy if exists "jurisprudencia_visualizacoes_insert" on public.jurisprudencia_visualizacoes;
create policy "jurisprudencia_visualizacoes_insert" on public.jurisprudencia_visualizacoes
  for insert to authenticated
  with check (lawyer_id = auth.uid());

drop policy if exists "jurisprudencia_visualizacoes_delete" on public.jurisprudencia_visualizacoes;
create policy "jurisprudencia_visualizacoes_delete" on public.jurisprudencia_visualizacoes
  for delete to authenticated
  using (lawyer_id = auth.uid());
