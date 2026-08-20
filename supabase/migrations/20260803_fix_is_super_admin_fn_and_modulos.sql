-- Alinha is_super_admin() com a coluna boolean + role.
-- Garante RPC de módulos sem argumentos (como o app chama).
-- Corrige modulos_ativos = [] (inválido; null = todos ativos).

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.lawyers
     where id = auth.uid()
       and (
         role = 'super_admin'
         or is_super_admin is true
       )
  );
$$;

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

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.modulos_ativos_do_escritorio() to authenticated;

update public.lawyers
   set modulos_ativos = null
 where email ilike 'kauaworkana1203@gmail.com'
   and (
     modulos_ativos is null
     or jsonb_typeof(modulos_ativos) = 'array'
     or modulos_ativos = '[]'::jsonb
   );
