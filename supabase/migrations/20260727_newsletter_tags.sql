-- Tags de segmentação em inscritos da newsletter + vínculo opcional com cliente.

alter table public.newsletter_subscribers
  add column if not exists tags text[] not null default '{}';

alter table public.newsletter_subscribers
  add column if not exists client_id uuid references public.clients(id) on delete set null;

comment on column public.newsletter_subscribers.tags is
  'Tags de segmentação (ex.: BPC/LOAS, Auxílio-Doença). Manual ou derivadas do tipo_beneficio do cliente vinculado.';

comment on column public.newsletter_subscribers.client_id is
  'Cliente do CRM vinculado ao inscrito (opcional) — usado para auto-tag pelo tipo de benefício.';

create index if not exists newsletter_subscribers_tags_gin
  on public.newsletter_subscribers using gin (tags);

create index if not exists newsletter_subscribers_client_id_idx
  on public.newsletter_subscribers (client_id)
  where client_id is not null;

alter table public.newsletter_envios
  add column if not exists tags_filtro text[] null;

comment on column public.newsletter_envios.tags_filtro is
  'Tags usadas como filtro no momento do envio (null = sem filtro por tag).';
