-- Marple / PrevEIA — Módulos ativos do escritório (menu lateral)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- Não há tabela `offices`: o escritório é `lawyers.office_id`.
-- A config fica no dono (`office_role = 'owner'`); membros leem via RPC.
-- null = todos os módulos ativos (compatível com bases já existentes).

alter table public.lawyers
  add column if not exists modulos_ativos jsonb;

comment on column public.lawyers.modulos_ativos is
  'Mapa id→boolean dos módulos do menu. null = todos ativos. Fonte de verdade no dono do escritório.';

-- Leitura: dono do office (ou a própria linha se solo / sem dono).
create or replace function public.modulos_ativos_do_escritorio()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select o.modulos_ativos
        from public.lawyers me
        join public.lawyers o
          on o.office_id = me.office_id
         and o.office_role = 'owner'
       where me.id = auth.uid()
         and me.office_id is not null
       limit 1
    ),
    (select modulos_ativos from public.lawyers where id = auth.uid())
  );
$$;

-- Escrita: só owner, sócio, super_admin ou conta solo.
create or replace function public.salvar_modulos_ativos(p_modulos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me record;
  v_owner_id uuid;
begin
  select id, office_id, office_role, cargo, role
    into v_me
    from public.lawyers
   where id = auth.uid();

  if v_me.id is null then
    raise exception 'nao_autenticado';
  end if;

  if not (
    v_me.role = 'super_admin'
    or v_me.office_role = 'owner'
    or v_me.cargo = 'socio'
    or v_me.office_id is null
  ) then
    raise exception 'sem_permissao';
  end if;

  if v_me.office_id is null then
    update public.lawyers
       set modulos_ativos = p_modulos
     where id = v_me.id;
    return p_modulos;
  end if;

  select id into v_owner_id
    from public.lawyers
   where office_id = v_me.office_id
     and office_role = 'owner'
   limit 1;

  update public.lawyers
     set modulos_ativos = p_modulos
   where id = coalesce(v_owner_id, v_me.id);

  return p_modulos;
end;
$$;

grant execute on function public.modulos_ativos_do_escritorio() to authenticated;
grant execute on function public.salvar_modulos_ativos(jsonb) to authenticated;
