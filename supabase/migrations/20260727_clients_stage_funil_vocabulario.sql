-- Marple / PrevEIA — Remapeia o vocabulário provisório do Kanban CRM para o
-- funil operacional definitivo. Não cria coluna nova: reusa `clients.stage`.
--
-- Mapeamento 1:1 por posição no funil:
--   novo_lead             → atendimento_triagem
--   em_analise            → organizacao_qualificacao
--   documentacao_pendente → redacao_peticao
--   em_andamento          → conferencia_revisao_final
--   concluido             → concluido
--
-- Também expõe `stage` nas RPCs de leitura/escrita para cargo restrito
-- (secretária/estagiário), pois a etapa é dado operacional básico.

-- 1) Garantir coluna (no-op se a migração anterior já rodou).
alter table public.clients
  add column if not exists stage text;

-- 2) Soltar o CHECK antigo para poder gravar os novos IDs.
alter table public.clients
  drop constraint if exists clients_stage_check;

-- 3) Remapear linhas ainda no vocabulário provisório.
update public.clients
set stage = case stage
  when 'novo_lead' then 'atendimento_triagem'
  when 'em_analise' then 'organizacao_qualificacao'
  when 'documentacao_pendente' then 'redacao_peticao'
  when 'em_andamento' then 'conferencia_revisao_final'
  when 'concluido' then 'concluido'
  else stage
end
where stage in (
  'novo_lead',
  'em_analise',
  'documentacao_pendente',
  'em_andamento',
  'concluido'
);

-- 4) Default + qualquer nulo residual.
update public.clients
  set stage = 'atendimento_triagem'
  where stage is null
     or stage not in (
       'atendimento_triagem',
       'organizacao_qualificacao',
       'redacao_peticao',
       'conferencia_revisao_final',
       'concluido',
       'protocolado'
     );

alter table public.clients
  alter column stage set default 'atendimento_triagem';

alter table public.clients
  alter column stage set not null;

-- 5) Novo CHECK com o vocabulário definitivo (+ protocolado, etapa terminal).
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

create index if not exists clients_lawyer_stage_idx
  on public.clients (lawyer_id, stage);

-- 6) RPCs de clientes: incluir `stage` na leitura e na escrita básica.
--    (CREATE OR REPLACE não altera RETURNS TABLE — drop + recreate.)
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

-- Assinatura antiga (9 args textuais após o id) precisa ser removida antes.
drop function if exists public.atualizar_cliente_basico(uuid, text, text, text, text, text, text, text, text);

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

  -- Só aceita etapa do vocabulário canônico; valor inválido é ignorado.
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
