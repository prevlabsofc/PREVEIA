/**
 * Validação de campos do formulário de petição (Salário-Maternidade etc.).
 */

/** Nome da criança: apenas letras (incl. acentos) e espaços. */
export function validarNomeCrianca(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Informe o nome da criança'
  if (!/^[\p{L}\s'-]+$/u.test(v)) {
    return 'Use apenas letras e espaços'
  }
  if (v.length < 2) return 'Nome muito curto'
  return null
}

/** NB: apenas dígitos, pontos e hífen. */
export function validarNb(valor: string): string | null {
  const v = valor.trim()
  if (!v) return null // opcional
  if (!/^[\d.\-]+$/.test(v)) {
    return 'Use apenas números e hífen'
  }
  const digits = v.replace(/\D/g, '')
  if (digits.length < 5) return 'NB incompleto'
  return null
}

/**
 * Valida data. Aceita:
 * - input type=date (YYYY-MM-DD)
 * - DD/MM/AAAA
 * Ano deve estar entre 1900 e 2100.
 */
export function validarDataPeticao(valor: string, obrigatorio = true): string | null {
  const v = valor.trim()
  if (!v) return obrigatorio ? 'Informe a data' : null

  let day: number
  let month: number
  let year: number

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)

  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (br) {
    day = Number(br[1])
    month = Number(br[2])
    year = Number(br[3])
  } else {
    return 'Use o formato DD/MM/AAAA'
  }

  if (year < 1900 || year > 2100) return 'Ano deve estar entre 1900 e 2100'
  if (month < 1 || month > 12) return 'Mês inválido'
  if (day < 1 || day > 31) return 'Dia inválido'

  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return 'Data inválida'
  }
  return null
}

/**
 * Período de segurado especial: mínimo 10 caracteres,
 * rejeita sequências com 4+ caracteres iguais consecutivos (ex.: "ghgghgh" / "aaaa").
 */
export function validarPeriodoSegurado(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Informe o período de atividade rural'
  if (v.length < 10) return 'Descreva com pelo menos 10 caracteres'
  if (/(.)\1{3,}/u.test(v)) {
    return 'Texto inválido (caracteres repetidos demais)'
  }
  const letras = v.replace(/[^\p{L}]/gu, '')
  if (letras.length < 6) return 'Descreva o período com palavras (ex.: Desde os 12 anos)'
  const unicos = new Set(letras.toLowerCase())
  if (unicos.size < 3) return 'Texto inválido — use uma descrição real do período'
  return null
}

export type ErrosFormSm = {
  nome_crianca?: string
  nb?: string
  data_nascimento_crianca?: string
  data_requerimento?: string
  data_indeferimento?: string
  periodo_segurado?: string
}

export function validarFormularioSm(form: Record<string, string>): ErrosFormSm {
  const erros: ErrosFormSm = {}
  const eNome = validarNomeCrianca(form.nome_crianca || '')
  if (eNome) erros.nome_crianca = eNome

  const eNb = validarNb(form.nb || '')
  if (eNb) erros.nb = eNb

  const eNasc = validarDataPeticao(form.data_nascimento_crianca || '', true)
  if (eNasc) erros.data_nascimento_crianca = eNasc

  const eReq = validarDataPeticao(form.data_requerimento || '', true)
  if (eReq) erros.data_requerimento = eReq

  const eInd = validarDataPeticao(form.data_indeferimento || '', true)
  if (eInd) erros.data_indeferimento = eInd

  const ePer = validarPeriodoSegurado(form.periodo_segurado || '')
  if (ePer) erros.periodo_segurado = ePer

  return erros
}

export function formSmTemErros(erros: ErrosFormSm): boolean {
  return Object.keys(erros).length > 0
}
