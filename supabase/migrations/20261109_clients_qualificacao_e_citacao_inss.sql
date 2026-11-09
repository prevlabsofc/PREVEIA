-- Qualificação da parte autora / criança (SM rural) + endereço de citação do INSS.
-- Idempotente: formulários e clientes antigos continuam abrindo sem erro (colunas nullable).

-- clients: data de nascimento (além de birth_date legado), estado civil e CPF da criança
alter table public.clients
  add column if not exists data_nascimento date;

alter table public.clients
  add column if not exists estado_civil text;

alter table public.clients
  add column if not exists cpf_crianca text;

comment on column public.clients.data_nascimento is
  'Data de nascimento da parte autora (date). Preferir este campo nas petições; birth_date permanece por compatibilidade.';
comment on column public.clients.estado_civil is
  'Estado civil da parte autora (solteira/casada/divorciada/viúva/união estável/separada judicialmente — flexionar pelo sexo na peça).';
comment on column public.clients.cpf_crianca is
  'CPF da criança (opcional), usado no quadro sinóptico da petição de salário-maternidade.';

-- Backfill best-effort a partir de birth_date (texto ou date legado)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'birth_date'
  ) then
    update public.clients
       set data_nascimento = birth_date::date
     where data_nascimento is null
       and birth_date is not null
       and trim(birth_date::text) <> ''
       and birth_date::text ~ '^\d{4}-\d{2}-\d{2}';
  end if;
exception
  when others then
    -- birth_date pode ser texto inválido em bases legadas — ignora backfill
    null;
end $$;

-- lawyers: endereço editável para citação do INSS (padrão em branco)
alter table public.lawyers
  add column if not exists endereco_citacao_inss text;

comment on column public.lawyers.endereco_citacao_inss is
  'Endereço de citação da Procuradoria Federal Especializada junto ao INSS. Em branco até o revisor jurídico informar. Usado na peça SM rural (PDF/DOCX).';
