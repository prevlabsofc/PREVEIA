-- Marple / PrevEIA — Prazos: responsável pelo item e importação via DJEN
-- Rodar manualmente no SQL Editor do Supabase.
--
-- Esta migração só adiciona colunas e policies novas; nada existente em
-- `prazos` é renomeado, removido ou tem seu tipo alterado.

-- ---------------------------------------------------------------------------
-- 1) Responsável pelo prazo (advogado/estagiário atribuído). Mesmo nome de
--    coluna usado em `clients.assigned_lawyer_id` (ver
--    20260727_clients_crm_last_contact_assigned_lawyer.sql), para manter um
--    único padrão de "responsável" no projeto. Nulo = "Sem responsável",
--    estado válido e explícito na UI (ver lib/equipe.ts).
-- ---------------------------------------------------------------------------
alter table public.prazos
  add column if not exists assigned_lawyer_id uuid;

-- ON DELETE SET NULL: mesma razão da migração de clients — se o membro for
-- excluído do sistema, o prazo volta para "Sem responsável" em vez de um id
-- órfão. Sair do escritório sem excluir a conta não mexe no vínculo.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.prazos'::regclass
      and conname = 'prazos_assigned_lawyer_id_fkey'
  ) then
    alter table public.prazos
      add constraint prazos_assigned_lawyer_id_fkey
      foreign key (assigned_lawyer_id) references public.lawyers(id) on delete set null;
  end if;
end
$$;

create index if not exists prazos_assigned_lawyer_idx on public.prazos (assigned_lawyer_id);

-- ---------------------------------------------------------------------------
-- 2) Origem do prazo — 'manual' (padrão, criado na tela) ou 'djen' (buscado
--    automaticamente por OAB no DJEN/CNJ — ver lib/djen.ts e
--    app/api/importar-prazos-djen/route.ts). `origem_externo_id` guarda o
--    `id` da comunicação no DJEN só para não importar a mesma publicação
--    duas vezes ao repetir a busca. `observacao` carrega o resumo e o link
--    para o teor completo, algo que o formulário manual não precisava até
--    aqui.
-- ---------------------------------------------------------------------------
alter table public.prazos
  add column if not exists origem text not null default 'manual';

alter table public.prazos
  add column if not exists origem_externo_id text;

alter table public.prazos
  add column if not exists observacao text;

create unique index if not exists prazos_origem_externo_unico
  on public.prazos (lawyer_id, origem_externo_id)
  where origem_externo_id is not null;

-- ---------------------------------------------------------------------------
-- 3) Visibilidade e atribuição por toda a equipe do escritório.
--
--    Antes desta migração, a única leitura de `prazos` fora do próprio
--    advogado era a função `tarefas_do_cliente` (SECURITY DEFINER, ver
--    20260727_cargos_e_acesso_clientes.sql) — sinal de que a policy de RLS
--    de `prazos` restringia SELECT a `lawyer_id = auth.uid()`. A tela de
--    Prazos agora precisa listar e reatribuir prazos de qualquer colega do
--    escritório diretamente (mesmo padrão já usado em `/processos` e
--    `/clientes`, via `carregarMembrosEscritorio`), então ampliamos aqui.
--
--    Como em 20260727_cargos_e_acesso_clientes.sql: policies PERMISSIVE
--    combinam entre si com OR, então a policy nova só AMPLIA quem enxerga
--    uma linha — nada do que já funcionava para "dono do registro" muda.
--    Se `prazos` ainda não tiver nenhuma policy (RLS nunca configurado),
--    criamos antes a linha de base "dono do registro" para não trancar
--    todo mundo ao ligar RLS.
-- ---------------------------------------------------------------------------
do $$
declare
  tem_rls boolean;
  qtd_policies integer;
begin
  select c.relrowsecurity into tem_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'prazos';

  select count(*) into qtd_policies
    from pg_policies where schemaname = 'public' and tablename = 'prazos';

  if qtd_policies = 0 then
    execute 'create policy prazos_dono on public.prazos for all to authenticated using (lawyer_id = auth.uid()) with check (lawyer_id = auth.uid())';
  end if;

  if not coalesce(tem_rls, false) then
    execute 'alter table public.prazos enable row level security';
  end if;
end
$$;

drop policy if exists prazos_equipe_select on public.prazos;
create policy prazos_equipe_select on public.prazos
  as permissive for select to authenticated using (
    lawyer_id = auth.uid()
    or exists (
      select 1
        from public.lawyers eu
        join public.lawyers dono on dono.office_id = eu.office_id
       where eu.id = auth.uid()
         and dono.id = prazos.lawyer_id
         and eu.office_id is not null
    )
  );

-- Reatribuição: qualquer membro do escritório pode mudar o responsável (ou
-- concluir/editar) um prazo do escritório, não só quem criou o registro.
drop policy if exists prazos_equipe_update on public.prazos;
create policy prazos_equipe_update on public.prazos
  as permissive for update to authenticated using (
    lawyer_id = auth.uid()
    or exists (
      select 1
        from public.lawyers eu
        join public.lawyers dono on dono.office_id = eu.office_id
       where eu.id = auth.uid()
         and dono.id = prazos.lawyer_id
         and eu.office_id is not null
    )
  )
  with check (
    lawyer_id = auth.uid()
    or exists (
      select 1
        from public.lawyers eu
        join public.lawyers dono on dono.office_id = eu.office_id
       where eu.id = auth.uid()
         and dono.id = prazos.lawyer_id
         and eu.office_id is not null
    )
  );
