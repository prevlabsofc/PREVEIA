/**
 * Validação de campos do formulário de petição (Salário-Maternidade etc.).
 */

const VOGALS_RE = /[aeiouáéíóúâêôãõàüAEIOUÁÉÍÓÚÂÊÔÃÕÀÜ]/u

/** Nome da criança: obrigatório, min 3, só letras/espaços/acentos; rejeita lixo. */
export function validarNomeCrianca(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Informe o nome da criança'
  if (v.length < 3) return 'Nome deve ter pelo menos 3 caracteres'
  if (!/^[\p{L}\s'-]+$/u.test(v)) {
    return 'Use apenas letras e espaços'
  }
  const letras = v.replace(/[^\p{L}]/gu, '')
  if (letras.length < 3) return 'Nome inválido'
  if (!VOGALS_RE.test(letras)) {
    return 'Nome inválido — use um nome real (com vogais)'
  }
  // Sequências repetitivas (ex.: "sdfsfdsfssdfs", "aaaaaa")
  if (/(.)\1{3,}/u.test(letras)) {
    return 'Nome inválido (caracteres repetidos demais)'
  }
  const unicos = new Set(letras.toLowerCase())
  if (letras.length >= 6 && unicos.size < 3) {
    return 'Nome inválido — use um nome real'
  }
  // Pouca diversidade em strings longas sem espaços (teclado aleatório)
  if (!/\s/.test(v) && letras.length >= 8 && unicos.size / letras.length < 0.35) {
    return 'Nome inválido — use um nome real'
  }
  return null
}

/** NB: só dígitos (máscara 000.000.000-0 ok); exatamente 10 dígitos. */
export function validarNb(valor: string): string | null {
  const v = valor.trim()
  if (!v) return null // opcional
  if (!/^[\d.\-]+$/.test(v)) {
    return 'Use apenas números (máscara 000.000.000-0)'
  }
  const digits = v.replace(/\D/g, '')
  if (digits.length !== 10) {
    return 'NB deve ter exatamente 10 dígitos'
  }
  return null
}

function parseDataLocal(valor: string): Date | null {
  const v = valor.trim()
  if (!v) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  let day: number
  let month: number
  let year: number
  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2])
    day = Number(iso[3])
  } else if (br) {
    day = Number(br[1])
    month = Number(br[2])
    year = Number(br[3])
  } else {
    return null
  }
  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null
  }
  return dt
}

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Valida data. Aceita YYYY-MM-DD ou DD/MM/AAAA.
 * Por padrão rejeita datas futuras.
 */
export function validarDataPeticao(
  valor: string,
  obrigatorio = true,
  opts?: { permitirFuturo?: boolean },
): string | null {
  const v = valor.trim()
  if (!v) return obrigatorio ? 'Informe a data' : null

  const dt = parseDataLocal(v)
  if (!dt) {
    if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(v) && !/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(v)) {
      return 'Use o formato DD/MM/AAAA'
    }
    return 'Data inválida'
  }

  const year = dt.getFullYear()
  if (year < 1900 || year > 2100) return 'Ano deve estar entre 1900 e 2100'

  if (!opts?.permitirFuturo) {
    const hoje = inicioDoDia(new Date())
    if (inicioDoDia(dt) > hoje) return 'Data não pode ser futura'
  }
  return null
}

/**
 * Período de segurado especial: mínimo 10 caracteres,
 * rejeita sequências com 4+ caracteres iguais consecutivos.
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

/** Subtrai dias de uma data local (sem UTC). */
export function subtrairDias(data: Date, dias: number): Date {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  d.setDate(d.getDate() - dias)
  return d
}

/**
 * Aviso (não bloqueio): indeferimento há mais de 5 anos → possível prescrição quinquenal.
 */
export function avisoPrescricaoQuinquenal(dataIndeferimento: string): string | null {
  const dt = parseDataLocal(dataIndeferimento)
  if (!dt) return null
  const limite = subtrairDias(inicioDoDia(new Date()), 5 * 365 + 1) // ~5 anos
  // Mais preciso: 5 anos civis
  const cincoAnosAtras = new Date()
  cincoAnosAtras.setFullYear(cincoAnosAtras.getFullYear() - 5)
  if (inicioDoDia(dt) < inicioDoDia(cincoAnosAtras)) {
    return 'Atenção: possível prescrição quinquenal das parcelas (art. 103, parágrafo único, Lei 8.213/91). Revise antes de protocolar.'
  }
  return null
}

export type ErrosFormSm = {
  nome_crianca?: string
  nb?: string
  data_nascimento_crianca?: string
  data_requerimento?: string
  data_indeferimento?: string
  periodo_segurado?: string
  sexo_parte_autora?: string
  /** Endereço da parte autora (SM rural / competência JEF). */
  autor_logradouro?: string
  autor_municipio?: string
  autor_uf?: string
  subsecao_judiciaria?: string
}

export function validarSexoParteAutora(valor: string): string | null {
  const v = valor.trim().toLowerCase()
  if (!v) return 'Informe o sexo da parte autora'
  if (v !== 'masculino' && v !== 'feminino') {
    return 'Selecione masculino ou feminino'
  }
  return null
}

/** Endereço + subseção obrigatórios para SM rural (competência pelo domicílio). */
export function validarEnderecoAutorSmRural(
  form: Record<string, string>,
): Pick<
  ErrosFormSm,
  'autor_logradouro' | 'autor_municipio' | 'autor_uf' | 'subsecao_judiciaria'
> {
  const erros: Pick<
    ErrosFormSm,
    'autor_logradouro' | 'autor_municipio' | 'autor_uf' | 'subsecao_judiciaria'
  > = {}

  if (!(form.autor_logradouro || form.logradouro || form.rua || '').trim()) {
    erros.autor_logradouro = 'Informe o logradouro / endereço'
  }
  if (!(form.autor_municipio || form.municipio || form.cidade || form.city || '').trim()) {
    erros.autor_municipio = 'Informe o município'
  }
  const uf = (form.autor_uf || form.uf || form.state || form.estado || '').trim()
  if (!uf) {
    erros.autor_uf = 'Informe a UF'
  } else if (!/^[A-Za-z]{2}$/.test(uf)) {
    erros.autor_uf = 'UF inválida'
  }
  if (!(form.subsecao_judiciaria || form.subsecao || '').trim()) {
    erros.subsecao_judiciaria =
      'Informe a subseção judiciária competente para este município.'
  }
  return erros
}

export function validarFormularioSm(
  form: Record<string, string>,
  opts?: { rural?: boolean },
): ErrosFormSm {
  const erros: ErrosFormSm = {}
  const eNome = validarNomeCrianca(form.nome_crianca || '')
  if (eNome) erros.nome_crianca = eNome

  const eNb = validarNb(form.nb || '')
  if (eNb) erros.nb = eNb

  const eSexo = validarSexoParteAutora(
    form.sexo_parte_autora || form.sexo_autor || form.sexo || '',
  )
  if (eSexo) erros.sexo_parte_autora = eSexo

  const eNasc = validarDataPeticao(form.data_nascimento_crianca || '', true)
  if (eNasc) erros.data_nascimento_crianca = eNasc

  const eReq = validarDataPeticao(form.data_requerimento || '', true)
  if (eReq) erros.data_requerimento = eReq

  const eInd = validarDataPeticao(form.data_indeferimento || '', true)
  if (eInd) erros.data_indeferimento = eInd

  const ePer = validarPeriodoSegurado(form.periodo_segurado || '')
  if (ePer) erros.periodo_segurado = ePer

  // Cruzamentos de datas (só se as individuais passaram)
  const nasc = parseDataLocal(form.data_nascimento_crianca || '')
  const req = parseDataLocal(form.data_requerimento || '')
  const ind = parseDataLocal(form.data_indeferimento || '')

  if (nasc && req && !erros.data_requerimento && !erros.data_nascimento_crianca) {
    const minReq = subtrairDias(nasc, 28)
    if (inicioDoDia(req) < inicioDoDia(minReq)) {
      erros.data_requerimento =
        'Requerimento não pode ser anterior a 28 dias antes do nascimento'
    }
  }

  if (req && ind && !erros.data_requerimento && !erros.data_indeferimento) {
    if (inicioDoDia(ind) < inicioDoDia(req)) {
      erros.data_indeferimento =
        'Indeferimento não pode ser anterior ao requerimento'
    }
  }

  if (opts?.rural) {
    Object.assign(erros, validarEnderecoAutorSmRural(form))
  }

  return erros
}

export function formSmTemErros(erros: ErrosFormSm): boolean {
  return Object.keys(erros).length > 0
}
