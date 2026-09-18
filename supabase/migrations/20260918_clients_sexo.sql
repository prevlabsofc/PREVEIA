-- Sexo da parte autora (cliente) — concordância gramatical nas petições SM.
-- Valores esperados pela UI: 'masculino' | 'feminino' (texto livre aceito).

alter table public.clients
  add column if not exists sexo text;

comment on column public.clients.sexo is
  'Sexo da parte autora (masculino/feminino). Usado na concordância da petição (agricultor/agricultora, segurado/segurada especial etc.). Não confundir com o sexo da criança.';
