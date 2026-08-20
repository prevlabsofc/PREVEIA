-- Marple / PrevEIA — Etapa do cliente no funil de atendimento (Kanban + métricas CRM)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- ATENÇÃO / NOME CANÔNICO: a coluna do funil chama-se `stage`.
-- Ela NÃO se confunde com `clients.status`, que já existia e continua sendo o
-- ciclo de vida do cadastro ('active' | 'archived'), usado pelos filtros
-- "Ativos"/"Arquivados" da carteira. Qualquer visão de CRM/métricas deve
-- consumir `stage` e os valores definidos em `lib/client-stages.ts`.
--
-- Valores (funil operacional — 5 etapas + terminal Protocolado):
--   atendimento_triagem | organizacao_qualificacao | redacao_peticao
--   conferencia_revisao_final | concluido | protocolado
--
-- Se a base já tiver o vocabulário provisório (novo_lead, …), rode também
-- `20260727_clients_stage_funil_vocabulario.sql` (remap + CHECK definitivo).

alter table public.clients
  add column if not exists stage text;

-- Default para inserts novos (linhas existentes nulas entram em Triagem abaixo).
alter table public.clients
  alter column stage set default 'atendimento_triagem';

update public.clients
  set stage = 'atendimento_triagem'
  where stage is null;

-- Só aplica o CHECK se não houver IDs provisórios ainda no banco.
-- Caso contrário o remap em *_vocabulario.sql fecha o constraint.
alter table public.clients
  drop constraint if exists clients_stage_check;

do $$
begin
  if not exists (
    select 1 from public.clients
    where stage in (
      'novo_lead',
      'em_analise',
      'documentacao_pendente',
      'em_andamento'
    )
  ) then
    alter table public.clients
      add constraint clients_stage_check check (
        stage in (
          'atendimento_triagem',
          'organizacao_qualificacao',
          'redacao_peticao',
          'conferencia_revisao_final',
          'concluido',
          'protocolado'
        )
      );
  end if;
end
$$;

alter table public.clients
  alter column stage set not null;

create index if not exists clients_lawyer_stage_idx
  on public.clients (lawyer_id, stage);
