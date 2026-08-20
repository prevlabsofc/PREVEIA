-- Marple / PrevEIA — Controle de acesso por cargo em clientes e peças judiciais
-- Rodar manualmente no SQL Editor do Supabase.
--
-- Modelo: `lawyers.office_role` (owner/member) continua respondendo por convites e
-- faturamento; `lawyers.role` (lawyer/super_admin) continua sendo o papel de
-- plataforma. Este arquivo introduz uma terceira dimensão, `lawyers.cargo`, que
-- responde exclusivamente por quais DADOS do cliente o membro pode ler.

-- ---------------------------------------------------------------------------
-- 1) Tabela de cargos. Novos níveis são adicionados com um INSERT, sem alterar
--    constraints nem funções — daí ser uma tabela em vez de um CHECK.
-- ---------------------------------------------------------------------------
create table if not exists public.cargos (
  cargo text primary key,
  rotulo text not null,
  acesso_total boolean not null default false,
  ordem integer not null default 0
);

insert into public.cargos (cargo, rotulo, acesso_total, ordem) values
  ('socio',      'Sócio',      true,  1),
  ('advogado',   'Advogado',   true,  2),
  ('secretaria', 'Secretária', false, 3),
  ('estagiario', 'Estagiário', false, 4)
on conflict (cargo) do update
  set rotulo = excluded.rotulo,
      acesso_total = excluded.acesso_total,
      ordem = excluded.ordem;

alter table public.cargos enable row level security;

drop policy if exists cargos_select on public.cargos;
create policy cargos_select on public.cargos
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2) Coluna de cargo em lawyers.
--    Backfill: toda linha existente pertence a alguém que se cadastrou pelo
--    /registro informando número de OAB, ou seja, é advogado de fato. Rebaixar
--    esse universo para o cargo menos privilegiado tiraria o acesso de
--    advogados reais aos próprios clientes, então o padrão seguro aqui é
--    'advogado' (e 'socio' para quem é dono do escritório). O "fail closed"
--    vale para cargo NÃO RESOLVÍVEL (sem sessão, sem linha em lawyers, cargo
--    nulo), tratado nas funções abaixo.
-- ---------------------------------------------------------------------------
alter table public.lawyers
  add column if not exists cargo text references public.cargos(cargo);

update public.lawyers
  set cargo = case when office_role = 'owner' then 'socio' else 'advogado' end
  where cargo is null;

alter table public.lawyers alter column cargo set default 'advogado';

create index if not exists lawyers_office_cargo_idx on public.lawyers (office_id, cargo);

-- Status de contato do cliente: dado operacional, de nível básico, que a
-- secretária/estagiário pode ler e escrever.
alter table public.clients
  add column if not exists status_contato text;

-- ---------------------------------------------------------------------------
-- 3) Funções de apoio.
-- ---------------------------------------------------------------------------

-- Fail closed: sem sessão, sem linha em lawyers ou cargo desconhecido => false.
create or replace function public.meu_acesso_total()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select c.acesso_total
       from public.lawyers l
       join public.cargos c on c.cargo = l.cargo
      where l.id = auth.uid()),
    false);
$$;

create or replace function public.meu_cargo()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select l.cargo from public.lawyers l where l.id = auth.uid()), 'estagiario');
$$;

-- 12345678901 -> ***.***.789-**
create or replace function public.mascarar_cpf(p_cpf text)
returns text
language sql
immutable
as $$
  select case
    when p_cpf is null then null
    when length(regexp_replace(p_cpf, '\D', '', 'g')) < 9 then '***.***.***-**'
    else '***.***.' || substr(regexp_replace(p_cpf, '\D', '', 'g'), 7, 3) || '-**'
  end;
$$;

-- ---------------------------------------------------------------------------
-- 4) RLS. Usamos policies RESTRICTIVE: elas são combinadas com AND às policies
--    permissivas já existentes na base, então nada do acesso atual de advogado
--    é alterado — apenas somamos um bloqueio para cargos restritos. Isso evita
--    ter que dropar policies cujos nomes não estão versionados neste repo.
--
--    Efeito prático: para secretária/estagiário a tabela `clients` devolve ZERO
--    linhas. O único caminho de leitura é a função SECURITY DEFINER abaixo, que
--    nunca seleciona coluna sensível sem máscara. É assim que conseguimos
--    proteção por COLUNA: o Postgres só sabe conceder SELECT de coluna por
--    role (o que atingiria todo mundo), então trocamos "coluna proibida" por
--    "tabela inacessível + função que projeta só o permitido".
--
--    `documents` (peças judiciais) e as tabelas financeiras entram no mesmo
--    bloqueio, inclusive nos metadados: para cargo restrito elas somem por
--    completo, sem função de leitura alternativa.
--
--    Uma policy restritiva só serve de trava se houver alguma policy permissiva
--    do lado de lá; e ligar RLS numa tabela sem policy nenhuma trancaria todo
--    mundo. Por isso o bloco abaixo, para cada tabela: se ela ainda não tem
--    policy alguma, cria antes a linha de base `lawyer_id = auth.uid()` (que é
--    exatamente o filtro que o app já aplica hoje no cliente) e só então liga
--    RLS e aplica a trava de cargo. Tabela sem `lawyer_id` e sem RLS é deixada
--    intacta, para não derrubar página de outro agente.
do $$
declare
  t text;
  tem_rls boolean;
  qtd_policies integer;
  tem_lawyer_id boolean;
begin
  foreach t in array array['clients', 'documents', 'honorarios', 'pagamentos', 'processos'] loop
    continue when to_regclass('public.' || t) is null;

    select c.relrowsecurity into tem_rls
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = t;

    select count(*) into qtd_policies
      from pg_policies p
     where p.schemaname = 'public' and p.tablename = t;

    select exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = t and column_name = 'lawyer_id'
    ) into tem_lawyer_id;

    if qtd_policies = 0 then
      if not tem_lawyer_id then
        raise notice 'Pulando %: sem policies e sem lawyer_id; aplique a trava manualmente.', t;
        continue;
      end if;
      execute format(
        'create policy %I on public.%I for all to authenticated using (lawyer_id = auth.uid()) with check (lawyer_id = auth.uid())',
        t || '_dono', t);
    end if;

    if not coalesce(tem_rls, false) then
      execute format('alter table public.%I enable row level security', t);
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_cargo_restrito_select', t);
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated using (public.meu_acesso_total())',
      t || '_cargo_restrito_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_cargo_restrito_insert', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (public.meu_acesso_total())',
      t || '_cargo_restrito_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_cargo_restrito_update', t);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (public.meu_acesso_total()) with check (public.meu_acesso_total())',
      t || '_cargo_restrito_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_cargo_restrito_delete', t);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (public.meu_acesso_total())',
      t || '_cargo_restrito_delete', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Leitura permitida para cargo restrito.
--    Advogado/sócio: seus próprios clientes, como já era.
--    Secretária/estagiário: os clientes de TODO o escritório, porém com CPF
--    mascarado e com rg/nascimento/observações suprimidos — é o recorte que
--    permite atender telefone e atualizar cadastro sem ver dado sensível.
--    Todos os valores são projetados como text para não depender do tipo exato
--    de cada coluna nesta base.
-- ---------------------------------------------------------------------------
create or replace function public.clientes_visiveis()
returns table (
  id uuid,
  lawyer_id uuid,
  name text,
  cpf text,
  cpf_mascarado text,
  rg text,
  birth_date text,
  profession text,
  phone text,
  whatsapp text,
  email text,
  zone text,
  cep text,
  address text,
  city text,
  state text,
  status text,
  status_contato text,
  notes text,
  created_at text,
  acesso_total boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_total boolean := public.meu_acesso_total();
  v_office uuid;
begin
  if v_uid is null then
    return;
  end if;

  select l.office_id into v_office from public.lawyers l where l.id = v_uid;

  return query
  select
    c.id,
    c.lawyer_id,
    c.name::text,
    case when v_total then c.cpf::text else public.mascarar_cpf(c.cpf::text) end,
    public.mascarar_cpf(c.cpf::text),
    case when v_total then c.rg::text else null end,
    case when v_total then c.birth_date::text else null end,
    c.profession::text,
    c.phone::text,
    c.whatsapp::text,
    c.email::text,
    c.zone::text,
    c.cep::text,
    c.address::text,
    c.city::text,
    c.state::text,
    c.status::text,
    c.status_contato::text,
    case when v_total then c.notes::text else null end,
    c.created_at::text,
    v_total
  from public.clients c
  where c.lawyer_id = v_uid
     or (
       not v_total
       and v_office is not null
       and c.lawyer_id in (select l2.id from public.lawyers l2 where l2.office_id = v_office)
     )
  order by c.created_at desc;
end;
$$;

create or replace function public.cliente_visivel(p_id uuid)
returns table (
  id uuid,
  lawyer_id uuid,
  name text,
  cpf text,
  cpf_mascarado text,
  rg text,
  birth_date text,
  profession text,
  phone text,
  whatsapp text,
  email text,
  zone text,
  cep text,
  address text,
  city text,
  state text,
  status text,
  status_contato text,
  notes text,
  created_at text,
  acesso_total boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select * from public.clientes_visiveis() v where v.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- 6) Escrita permitida para cargo restrito: apenas campos de contato e o
--    status de atendimento, e apenas dentro do próprio escritório.
-- ---------------------------------------------------------------------------
create or replace function public.atualizar_cliente_basico(
  p_id uuid,
  p_phone text default null,
  p_whatsapp text default null,
  p_email text default null,
  p_cep text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_status_contato text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_office uuid;
  v_ok boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select l.office_id into v_office from public.lawyers l where l.id = v_uid;

  select exists (
    select 1
      from public.clients c
      join public.lawyers dono on dono.id = c.lawyer_id
     where c.id = p_id
       and (c.lawyer_id = v_uid or (v_office is not null and dono.office_id = v_office))
  ) into v_ok;

  if not v_ok then
    return false;
  end if;

  update public.clients c
     set phone          = coalesce(p_phone, c.phone),
         whatsapp       = coalesce(p_whatsapp, c.whatsapp),
         email          = coalesce(p_email, c.email),
         cep            = coalesce(p_cep, c.cep),
         address        = coalesce(p_address, c.address),
         city           = coalesce(p_city, c.city),
         state          = coalesce(p_state, c.state),
         status_contato = coalesce(p_status_contato, c.status_contato)
   where c.id = p_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Tarefas (prazos) do cliente — dado básico, liberado para cargo restrito
--    dentro do escritório. Não retorna nada de conteúdo de peça.
-- ---------------------------------------------------------------------------
create or replace function public.tarefas_do_cliente(p_cliente_nome text)
returns table (
  id uuid,
  titulo text,
  tipo text,
  data_prazo text,
  prioridade text,
  concluido boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_office uuid;
begin
  if v_uid is null or to_regclass('public.prazos') is null then
    return;
  end if;

  select l.office_id into v_office from public.lawyers l where l.id = v_uid;

  return query execute $q$
    select p.id, p.titulo::text, p.tipo::text, p.data_prazo::text,
           p.prioridade::text, coalesce(p.concluido, false)
      from public.prazos p
     where p.cliente = $1
       and (p.lawyer_id = $2
            or ($3 is not null
                and p.lawyer_id in (select l2.id from public.lawyers l2 where l2.office_id = $3)))
     order by p.data_prazo asc
  $q$ using p_cliente_nome, v_uid, v_office;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Privilégios. Nenhuma função é exposta a anon.
-- ---------------------------------------------------------------------------
revoke all on function public.meu_acesso_total() from public, anon;
revoke all on function public.meu_cargo() from public, anon;
revoke all on function public.clientes_visiveis() from public, anon;
revoke all on function public.cliente_visivel(uuid) from public, anon;
revoke all on function public.tarefas_do_cliente(text) from public, anon;
revoke all on function public.atualizar_cliente_basico(uuid, text, text, text, text, text, text, text, text) from public, anon;

grant execute on function public.meu_acesso_total() to authenticated;
grant execute on function public.meu_cargo() to authenticated;
grant execute on function public.mascarar_cpf(text) to authenticated;
grant execute on function public.clientes_visiveis() to authenticated;
grant execute on function public.cliente_visivel(uuid) to authenticated;
grant execute on function public.tarefas_do_cliente(text) to authenticated;
grant execute on function public.atualizar_cliente_basico(uuid, text, text, text, text, text, text, text, text) to authenticated;
