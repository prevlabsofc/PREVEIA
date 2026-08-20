-- Marple / PrevEIA — Auto-arquivar cliente ao atingir etapa final do funil.
--
-- Reusa `clients.status` ('active' | 'archived') já existente nos filtros de
-- /clientes. Adiciona `status_final` como rótulo (concluido | protocolado).
-- Inclui `protocolado` no vocabulário de `clients.stage` como etapa final
-- irmã de `concluido`.
--
-- Fonte única: trigger BEFORE UPDATE OF stage — qualquer caminho de escrita
-- (Kanban, ficha, tabela, RPC, API) passa por aqui.

-- 1) Rótulo do status final (não duplica arquivamento — isso continua em status).
alter table public.clients
  add column if not exists status_final text;

alter table public.clients
  drop constraint if exists clients_status_final_check;

alter table public.clients
  add constraint clients_status_final_check check (
    status_final is null
    or status_final in ('concluido', 'protocolado')
  );

-- 2) Ampliar CHECK de stage com protocolado (sem reinventar a coluna).
alter table public.clients
  drop constraint if exists clients_stage_check;

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

-- 3) Backfill: casos já na etapa final ficam arquivados + rotulados.
update public.clients
   set status = 'archived',
       status_final = stage
 where stage in ('concluido', 'protocolado')
   and (
     status is distinct from 'archived'
     or status_final is distinct from stage
   );

create index if not exists clients_lawyer_status_idx
  on public.clients (lawyer_id, status);

-- 4) Trigger: transição TO final → arquiva; LEAVING final → reabre.
create or replace function public.clients_auto_arquivar_etapa_final()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.stage is not distinct from old.stage then
    return new;
  end if;

  if new.stage in ('concluido', 'protocolado') then
    new.status := 'archived';
    new.status_final := new.stage;
  elsif tg_op = 'UPDATE'
     and old.stage in ('concluido', 'protocolado')
     and new.stage not in ('concluido', 'protocolado') then
    new.status := 'active';
    new.status_final := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_clients_auto_arquivar_etapa_final on public.clients;

create trigger trg_clients_auto_arquivar_etapa_final
  before insert or update of stage on public.clients
  for each row
  execute function public.clients_auto_arquivar_etapa_final();

-- 5) Expor status_final nas RPCs de leitura + aceitar protocolado na escrita básica.
drop function if exists public.cliente_visivel(uuid);
drop function if exists public.clientes_visiveis();

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
  stage text,
  status_final text,
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
    c.stage::text,
    c.status_final::text,
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
  stage text,
  status_final text,
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

create or replace function public.atualizar_cliente_basico(
  p_id uuid,
  p_phone text default null,
  p_whatsapp text default null,
  p_email text default null,
  p_cep text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_status_contato text default null,
  p_stage text default null
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
  v_stage text;
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

  if p_stage is null
     or p_stage in (
       'atendimento_triagem',
       'organizacao_qualificacao',
       'redacao_peticao',
       'conferencia_revisao_final',
       'concluido',
       'protocolado'
     )
  then
    v_stage := p_stage;
  else
    v_stage := null;
  end if;

  update public.clients c
     set phone          = coalesce(p_phone, c.phone),
         whatsapp       = coalesce(p_whatsapp, c.whatsapp),
         email          = coalesce(p_email, c.email),
         cep            = coalesce(p_cep, c.cep),
         address        = coalesce(p_address, c.address),
         city           = coalesce(p_city, c.city),
         state          = coalesce(p_state, c.state),
         status_contato = coalesce(p_status_contato, c.status_contato),
         stage          = coalesce(v_stage, c.stage)
   where c.id = p_id;

  return true;
end;
$$;

revoke all on function public.clientes_visiveis() from public, anon;
revoke all on function public.cliente_visivel(uuid) from public, anon;
revoke all on function public.atualizar_cliente_basico(uuid, text, text, text, text, text, text, text, text, text) from public, anon;

grant execute on function public.clientes_visiveis() to authenticated;
grant execute on function public.cliente_visivel(uuid) to authenticated;
grant execute on function public.atualizar_cliente_basico(uuid, text, text, text, text, text, text, text, text, text) to authenticated;
