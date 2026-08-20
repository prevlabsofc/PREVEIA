-- Estilo de formatação padrão das petições do escritório.
-- 'moderno' = barras coloridas (padrão atual)
-- 'classico' = sóbrio, preto, negrito/sublinhado (aceito por tribunais)

alter table public.lawyers
  add column if not exists estilo_peticao text;

update public.lawyers
   set estilo_peticao = 'moderno'
 where estilo_peticao is null;

alter table public.lawyers
  alter column estilo_peticao set default 'moderno';

alter table public.lawyers
  alter column estilo_peticao set not null;

alter table public.lawyers
  drop constraint if exists lawyers_estilo_peticao_check;

alter table public.lawyers
  add constraint lawyers_estilo_peticao_check
  check (estilo_peticao in ('moderno', 'classico'));

comment on column public.lawyers.estilo_peticao is
  'Padrão de formatação das petições: moderno (barras coloridas) ou classico (sóbrio).';
