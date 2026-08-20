-- Marple / PrevEIA — Alertas automáticos ao cliente por tipo de movimento
-- Preferências em JSON no processo monitorado + tabela de deduplicação de envios.

-- 1) Tipos de movimento que disparam aviso ao cliente (ids estáveis do app).
alter table public.processos
  add column if not exists alertas_movimentos jsonb not null default '[]'::jsonb;

comment on column public.processos.alertas_movimentos is
  'Array JSON de ids de tipo de movimento (ex.: ["nova_decisao","audiencia_marcada"]) que disparam aviso automático ao cliente.';

-- 2) Quando as preferências foram (re)configuradas — baseline para não alertar o histórico.
alter table public.processos
  add column if not exists alertas_desde timestamptz;

-- 3) Última consulta DataJud bem-sucedida neste processo.
alter table public.processos
  add column if not exists ultima_consulta_movimentos_em timestamptz;

-- 4) Registro de avisos já enviados (evita duplicar e-mail/notificação).
create table if not exists public.processos_alertas_enviados (
  id uuid primary key default gen_random_uuid(),
  processo_id uuid not null references public.processos(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  cliente_id uuid references public.clients(id) on delete set null,
  tipo_alerta text not null,
  movimento_nome text not null,
  movimento_data timestamptz,
  chave_dedup text not null,
  canal text not null default 'email',
  status text not null default 'enviado',
  detalhe text,
  created_at timestamptz not null default now(),
  constraint processos_alertas_enviados_chave_unica unique (chave_dedup)
);

create index if not exists processos_alertas_enviados_processo_idx
  on public.processos_alertas_enviados (processo_id, created_at desc);

create index if not exists processos_alertas_enviados_lawyer_idx
  on public.processos_alertas_enviados (lawyer_id, created_at desc);

create index if not exists processos_alertas_movimentos_gin
  on public.processos using gin (alertas_movimentos);

alter table public.processos_alertas_enviados enable row level security;

-- Leitura: dono do processo ou membro do mesmo escritório.
drop policy if exists processos_alertas_enviados_select on public.processos_alertas_enviados;
create policy processos_alertas_enviados_select
  on public.processos_alertas_enviados
  for select
  using (
    lawyer_id = auth.uid()
    or (
      public.current_office_id() is not null
      and exists (
        select 1
          from public.lawyers l
         where l.id = processos_alertas_enviados.lawyer_id
           and l.office_id = public.current_office_id()
      )
    )
  );

-- Inserts/updates ficam com service role (cron) ou policies explícitas se necessário.
-- Advogado não precisa escrever nesta tabela pelo client.
