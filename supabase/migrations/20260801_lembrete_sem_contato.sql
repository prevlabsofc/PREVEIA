-- Marple / PrevEIA — Alerta de dias sem contato com o cliente
-- Aditivo: coluna em lawyers + índice auxiliar em clients.

alter table public.lawyers
  add column if not exists dias_alerta_sem_contato int;

alter table public.lawyers
  drop constraint if exists lawyers_dias_alerta_sem_contato_range;

alter table public.lawyers
  add constraint lawyers_dias_alerta_sem_contato_range
  check (
    dias_alerta_sem_contato is null
    or (dias_alerta_sem_contato >= 1 and dias_alerta_sem_contato <= 365)
  );

comment on column public.lawyers.dias_alerta_sem_contato is
  'Limiar em dias sem last_contact_at para gerar notificação de lembrete. Padrão da app: 30.';

create index if not exists clients_last_contact_at_idx
  on public.clients (lawyer_id, last_contact_at nulls first);
