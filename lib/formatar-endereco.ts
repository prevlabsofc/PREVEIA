/**
 * Formatação e composição do endereço do cliente a partir dos campos
 * separados de `clients` (rua/numero/bairro — ver migração
 * 20260801_clients_endereco_estruturado.sql — mais os campos `cep`, `city`
 * e `state`, que já existiam como colunas próprias antes dessa migração).
 */

const PLACEHOLDER = '[a preencher]'

/** Prefixos de comunidade/bairro ignorados na comparação de duplicidade. */
const PREFIXOS_COMUNIDADE =
  /\b(povoado|comunidade|vila|distrito|localidade|bairro)\b/gi

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

/** Chave comparável: sem acento, caixa, pontuação e prefixos povoado/comunidade/vila. */
export function chaveEnderecoComparavel(texto: string): string {
  return stripAccents(String(texto || ''))
    .toLowerCase()
    .replace(PREFIXOS_COMUNIDADE, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True se o bairro/comunidade já está contido no logradouro
 * (ex.: logradouro "Estrada … do Povoado Santa Luzia" + bairro "Povoado Santa Luzia").
 */
export function bairroJaContidoNoLogradouro(
  logradouro: string,
  bairro: string,
): boolean {
  const b = chaveEnderecoComparavel(bairro)
  const l = chaveEnderecoComparavel(logradouro)
  if (!b || !l) return false
  if (b.length < 3) return false
  return l.includes(b)
}

/** Formata dígitos de CEP como "00000-000" (padrão Correios, sem ponto milhar). */
export function formatarCEP(cep?: string | null): string {
  const digitos = (cep ?? '').replace(/\D/g, '').slice(0, 8)
  if (digitos.length !== 8) return (cep ?? '').trim()
  return digitos.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/** Corrige "CEP 65.715-000" / "CEP 65715000" → "CEP 65715-000" em texto livre. */
export function normalizarCepEmTexto(texto: string): string {
  return String(texto || '').replace(
    /\bCEP\s*[:.]?\s*(\d{2})\.?(\d{3})-?(\d{3})\b/gi,
    (_m, a: string, b: string, c: string) => `CEP ${a}${b}-${c}`,
  )
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

export type EnderecoAutorForm = {
  autor_logradouro?: string | null
  autor_numero?: string | null
  autor_bairro?: string | null
  autor_municipio?: string | null
  autor_uf?: string | null
  autor_cep?: string | null
  /** 'rural' | 'urbana' (ou legado 'urban'/'urbano'). */
  autor_zona?: string | null
  /** Aliases aceitos do formulário/cadastro. */
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  municipio?: string | null
  cidade?: string | null
  city?: string | null
  uf?: string | null
  state?: string | null
  cep?: string | null
  zona?: string | null
  zone?: string | null
  rua?: string | null
  address?: string | null
}

/**
 * Endereço completo da parte autora para a qualificação da petição
 * (logradouro, número, bairro/comunidade, zona rural se marcada, município/UF, CEP).
 *
 * Se o bairro/comunidade já estiver contido no logradouro (comparação sem
 * acentos/caixa e sem "povoado"/"comunidade"/"vila"), o bairro é omitido
 * para evitar "… Povoado X, Povoado X, Município/UF".
 */
export function formatarEnderecoAutorPeticao(c: EnderecoAutorForm): string {
  const logradouro =
    (c.autor_logradouro ?? c.logradouro ?? c.rua ?? c.address ?? '').trim()
  const numero = (c.autor_numero ?? c.numero ?? '').trim()
  const bairro = (c.autor_bairro ?? c.bairro ?? '').trim()
  const municipio =
    (c.autor_municipio ?? c.municipio ?? c.cidade ?? c.city ?? '').trim()
  const uf = (c.autor_uf ?? c.uf ?? c.state ?? '').trim().toUpperCase()
  const cep = (c.autor_cep ?? c.cep ?? '').trim()
  const zonaRaw = (c.autor_zona ?? c.zona ?? c.zone ?? '').trim().toLowerCase()
  const zonaRural =
    zonaRaw === 'rural' || zonaRaw === 'r'

  const temAlgumDado = Boolean(
    logradouro || numero || bairro || municipio || uf || cep,
  )
  if (!temAlgumDado) return ''

  const partes: string[] = []
  if (logradouro) partes.push(logradouro)
  else partes.push(PLACEHOLDER)

  if (numero) {
    const n = /^s\/?n$/i.test(numero) ? 's/n' : `nº ${numero}`
    partes.push(n)
  }

  const omitirBairro =
    Boolean(bairro) && bairroJaContidoNoLogradouro(logradouro, bairro)
  if (bairro && !omitirBairro) partes.push(bairro)

  if (zonaRural) partes.push('zona rural')

  if (municipio || uf) {
    partes.push([municipio || PLACEHOLDER, uf || PLACEHOLDER].join('/'))
  }

  if (cep) partes.push(`CEP ${formatarCEP(cep)}`)

  return partes.join(', ')
}

/** Só município/UF — para menções após a primeira (qualificação completa). */
export function formatarMunicipioUfAutor(c: EnderecoAutorForm): string {
  const municipio =
    (c.autor_municipio ?? c.municipio ?? c.cidade ?? c.city ?? '').trim()
  const uf = (c.autor_uf ?? c.uf ?? c.state ?? '').trim().toUpperCase()
  if (municipio && uf) return `${municipio}/${uf}`
  return municipio || uf || ''
}
