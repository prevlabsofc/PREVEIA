-- Marple / PrevEIA — Endereço estruturado do cliente (rua/número/bairro)
-- Rodar manualmente no SQL Editor do Supabase.
--
-- Contexto: hoje `clients.address` guarda rua + número + bairro como texto
-- livre num único campo (placeholder do formulário de /clientes: "Rua,
-- número, bairro"). `cep`, `city` e `state` JÁ existem como colunas
-- separadas desde a criação da tabela — não são recriados aqui, só
-- reaproveitados como estão (nomes em inglês/CEP mantidos para não quebrar
-- todo o código que já lê/grava `cep`/`city`/`state`).
--
-- Nomes canônicos finais de endereço em `clients` após esta migração:
--   clients.rua     -> Rua/logradouro                (NOVA coluna)
--   clients.numero  -> Número                         (NOVA coluna)
--   clients.bairro  -> Bairro                         (NOVA coluna)
--   clients.cep     -> CEP                            (já existia)
--   clients.city    -> Cidade                         (já existia)
--   clients.state   -> Estado/UF                      (já existia)
--
-- `clients.address` NÃO é removido nem renomeado: é a única fonte de
-- endereço de todo cliente cadastrado antes desta migração, e ainda é lido
-- por outras telas (exportações da carteira de clientes, snapshot do link
-- de aceite do cliente, importação de CSV). Passa a ser DEPRECATED em favor
-- de rua/numero/bairro, mas o formulário de /clientes continua escrevendo
-- nele automaticamente (concatenação de rua+número+bairro) para manter essas
-- outras telas funcionando durante a transição — ver `juntarEnderecoLegado`
-- em lib/formatar-endereco.ts.

alter table public.clients
  add column if not exists rua text,
  add column if not exists numero text,
  add column if not exists bairro text;

comment on column public.clients.rua is
  'Logradouro (rua/avenida). Junto com numero/bairro, substitui o uso de `address` (deprecated) para clientes cadastrados/editados após esta migração.';
comment on column public.clients.numero is
  'Número do endereço (aceita "S/N" para imóveis rurais sem numeração). Substitui parte de `address` (deprecated).';
comment on column public.clients.bairro is
  'Bairro. Substitui parte de `address` (deprecated).';
comment on column public.clients.address is
  'DEPRECATED em favor de rua/numero/bairro (ver migração 20260801_clients_endereco_estruturado). Mantido só por compatibilidade com telas que ainda leem este campo (exportações, snapshot de aceite, importação de CSV); o formulário de /clientes continua escrevendo aqui automaticamente a partir de rua+numero+bairro.';

-- Backfill best-effort: só separa quando o texto livre já vem no padrão
-- "Rua, Número, Bairro[, complemento]" (>= 3 partes separadas por vírgula —
-- o mesmo padrão sugerido pelo placeholder do formulário). Endereços fora
-- desse padrão (sem vírgula, formato livre etc.) NÃO são adivinhados: ficam
-- com rua/numero/bairro vazios e continuam 100% legíveis pelo `address`
-- original — sem nenhum risco de perda ou corrupção de dado existente.
do $$
declare
  r record;
  partes text[];
begin
  for r in
    select id, address
    from public.clients
    where address is not null
      and trim(address) <> ''
      and rua is null
  loop
    partes := regexp_split_to_array(trim(r.address), '\s*,\s*');
    if array_length(partes, 1) >= 3 then
      update public.clients
      set
        rua = partes[1],
        numero = partes[2],
        bairro = array_to_string(partes[3:array_length(partes, 1)], ', ')
      where id = r.id;
    end if;
  end loop;
end
$$;
