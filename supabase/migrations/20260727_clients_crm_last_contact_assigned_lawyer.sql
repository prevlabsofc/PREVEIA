-- Marple / PrevEIA — CRM da carteira de clientes: último contato e responsável
-- Rodar manualmente no SQL Editor do Supabase.
--
-- Nomes canônicos das colunas (outras features devem reusar exatamente estes):
--   clients.last_contact_at    -> "Último Contato Realizado"
--   clients.assigned_lawyer_id -> "Responsável pelo Atendimento"
--
-- Esta migração só adiciona colunas novas; nada existente em clients é
-- renomeado ou redefinido, para não conflitar com as colunas de etapa/kanban
-- que estão sendo adicionadas em paralelo.

-- 1) Último contato realizado com o cliente.
--    Nulo = nenhum contato registrado ainda (a UI mostra "Nunca contatado").
--    Escrito manualmente pelo usuário na ficha do cliente ou automaticamente
--    por lib/registrar-contato.ts, que só avança o valor para frente — um
--    evento antigo que chegue atrasado nunca sobrescreve um contato mais novo.
alter table public.clients
  add column if not exists last_contact_at timestamptz;

-- 2) Responsável pelo atendimento: o membro do escritório que cuida do cliente.
--    Nulo = "Sem responsável", que é um estado válido e explícito na UI.
alter table public.clients
  add column if not exists assigned_lawyer_id uuid;

-- ON DELETE SET NULL: se o advogado/estagiário for excluído do sistema, o
-- cliente volta para "Sem responsável" em vez de guardar um id órfão. Preferido
-- a CASCADE (que apagaria o cliente) e a RESTRICT (que travaria a exclusão do
-- membro). Sair do escritório sem excluir a conta não mexe no vínculo, então a
-- UI ainda precisa tratar um responsável que não está mais na equipe.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_assigned_lawyer_id_fkey'
  ) then
    alter table public.clients
      add constraint clients_assigned_lawyer_id_fkey
      foreign key (assigned_lawyer_id) references public.lawyers(id) on delete set null;
  end if;
end
$$;

-- 3) Índices para as duas leituras que a carteira faz: ordenar pelo atraso de
--    contato dentro da carteira do advogado e filtrar por responsável.
create index if not exists clients_lawyer_last_contact_idx
  on public.clients (lawyer_id, last_contact_at desc nulls last);

create index if not exists clients_assigned_lawyer_idx
  on public.clients (assigned_lawyer_id);
