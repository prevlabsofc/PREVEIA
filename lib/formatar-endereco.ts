/**
 * Formatação e composição do endereço do cliente a partir dos campos
 * separados de `clients` (rua/numero/bairro — ver migração
 * 20260801_clients_endereco_estruturado.sql — mais os campos `cep`, `city`
 * e `state`, que já existiam como colunas próprias antes dessa migração).
 */

const PLACEHOLDER = '[a preencher]'

/** Formata dígitos de CEP como "00000-000". Deixa como está se não tiver 8 dígitos. */
export function formatarCEP(cep?: string | null): string {
  const digitos = (cep ?? '').replace(/\D/g, '').slice(0, 8)
  if (digitos.length !== 8) return (cep ?? '').trim()
  return digitos.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/** Máscara aplicada durante a digitação em inputs de CEP (00000-000). */
export function mascaraCEP(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export type EnderecoClienteParaFormatacao = {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
  /** Campo legado (texto livre) de clientes cadastrados antes da separação em rua/número/bairro. */
  address?: string | null
}

/**
 * Junta rua/número/bairro num único texto (para manter `clients.address`
 * escrito automaticamente e compatível com telas que ainda só leem esse
 * campo legado, ex.: exportações e snapshot do link de aceite do cliente).
 */
export function juntarEnderecoLegado(c: {
  rua?: string | null
  numero?: string | null
  bairro?: string | null
}): string {
  return [c.rua, c.numero, c.bairro]
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

/**
 * Monta a linha de endereço usada na qualificação da parte nas petições
 * (ex.: "Rua X, nº Y, Bairro Z, Cidade/UF, CEP 00000-000").
 *
 * Regra de fallback (decisão de produto, documentada aqui por ser o único
 * lugar que decide isso):
 *  - Se o cliente não tem NENHUM dado de endereço cadastrado (nem os campos
 *    novos, nem o `address` legado), retorna string vazia — não força uma
 *    linha inteira de "[a preencher]" na petição quando não há absolutamente
 *    nada preenchido; nesse caso é melhor a peça simplesmente omitir o trecho.
 *  - Se há AO MENOS um campo preenchido, cada sub-campo ausente é marcado
 *    individualmente com "[a preencher]" (mesmo padrão de placeholder usado
 *    no gerador de contrato de honorários, em
 *    app/(dashboard)/honorarios/page.tsx), para o advogado ver exatamente o
 *    que falta completar antes de protocolar, sem perder o restante do
 *    endereço que já está cadastrado.
 *
 * Compatibilidade: clientes cadastrados antes da migração de rua/número/
 * bairro só têm o campo `address` (texto livre). Nesse caso ele é usado
 * como a própria rua, já que não é possível separar com segurança um texto
 * livre em rua/número/bairro sem risco de errar o corte.
 */
export function formatarEnderecoQualificacao(c: EnderecoClienteParaFormatacao): string {
  const rua = (c.rua ?? '').trim() || (c.address ?? '').trim()
  const numero = (c.numero ?? '').trim()
  const bairro = (c.bairro ?? '').trim()
  const cidade = (c.city ?? '').trim()
  const estado = (c.state ?? '').trim()
  const cep = (c.cep ?? '').trim()

  const temAlgumDado = Boolean(rua || numero || bairro || cidade || estado || cep)
  if (!temAlgumDado) return ''

  return [
    `Rua ${rua || PLACEHOLDER}`,
    `nº ${numero || PLACEHOLDER}`,
    `Bairro ${bairro || PLACEHOLDER}`,
    `${cidade || PLACEHOLDER}/${estado || PLACEHOLDER}`,
    `CEP ${cep ? formatarCEP(cep) : PLACEHOLDER}`,
  ].join(', ')
}
