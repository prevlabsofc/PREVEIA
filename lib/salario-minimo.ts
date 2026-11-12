/**
 * Salário mínimo nacional vigente na data de referência (fato gerador / parto).
 *
 * Fonte de dados EDITÁVEL: `lib/legal/salario-minimo.json`
 * A IA NÃO inventa o valor: o prompt injeta o resultado de
 * `valorCausaSalarioMaternidade(dataDoParto)`.
 *
 * SM rural: se a data do parto não estiver preenchida, NÃO chute — use
 * `exigirDataDoFato: true` (retorna erro) e peça ao usuário.
 */

import tabela from '@/lib/legal/salario-minimo.json'

type VigenciaJson = { inicio: string; valor: number }

const VIGENCIAS_RAW = (tabela.vigencias || []) as VigenciaJson[]

/** Pares [ano, mês 1–12, dia, valor mensal R$], ordenados do mais antigo ao mais recente. */
export const VIGENCIAS_SALARIO_MINIMO: ReadonlyArray<
  readonly [number, number, number, number]
> = VIGENCIAS_RAW.map((v) => {
  const [y, m, d] = v.inicio.split('-').map(Number)
  return [y, m, d, v.valor] as const
})

/** Mapa ano → valor (consulta rápida; preferir vigências para data exata). */
export const SALARIO_MINIMO_POR_ANO: Readonly<Record<string, number>> =
  (tabela.por_ano || {}) as Record<string, number>

/**
 * Parse local por componentes (ano/mês/dia).
 * Nunca usa `new Date("YYYY-MM-DD")` sozinho (UTC desloca o dia).
 */
function parseDataRef(data?: Date | string | null): Date | null {
  if (data == null || data === '') return null
  if (data instanceof Date) {
    if (!Number.isFinite(data.getTime())) return null
    return new Date(data.getFullYear(), data.getMonth(), data.getDate())
  }
  const s = String(data).trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2])
    const d = Number(iso[3])
    const dt = new Date(y, m - 1, d)
    return Number.isFinite(dt.getTime()) &&
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
      ? dt
      : null
  }
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (br) {
    const d = Number(br[1])
    const m = Number(br[2])
    const y = Number(br[3])
    const dt = new Date(y, m - 1, d)
    return Number.isFinite(dt.getTime()) &&
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
      ? dt
      : null
  }
  const y = Number.parseInt(s, 10)
  if (Number.isFinite(y) && y >= 1900 && y <= 2100) {
    return new Date(y, 0, 1)
  }
  return null
}

function ymd(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

function vigenciaYmd(v: readonly [number, number, number, number]): number {
  return v[0] * 10000 + v[1] * 100 + v[2]
}

function formatarDataVigenciaBr(v: readonly [number, number, number, number]): string {
  const dd = String(v[2]).padStart(2, '0')
  const mm = String(v[1]).padStart(2, '0')
  return `${dd}/${mm}/${v[0]}`
}

export const ERRO_DATA_FATO_AUSENTE =
  'Informe a data do parto / fato gerador para calcular o salário mínimo e o valor da causa.'

/**
 * Salário mínimo vigente na data de referência.
 * Sem data e sem exigir → mínimo vigente (hoje).
 * Com `exigirDataDoFato: true` e sem data → lança Error (petição SM).
 */
export function getSalarioMinimo(
  dataReferencia?: Date | string | null,
  opts?: { exigirDataDoFato?: boolean },
): number {
  const info = resolverSalarioMinimo(dataReferencia, opts)
  return info.mensal
}

/** Resolve valor + data de início da vigência aplicada (para nota da planilha). */
export function resolverSalarioMinimo(
  dataReferencia?: Date | string | null,
  opts?: { exigirDataDoFato?: boolean },
): {
  mensal: number
  anoVigencia: number
  /** Data de início da vigência usada (dd/mm/aaaa). */
  dataVigenciaFmt: string
  dataRef: Date
} {
  const parsed = parseDataRef(dataReferencia)
  if (!parsed) {
    if (opts?.exigirDataDoFato) {
      throw new Error(ERRO_DATA_FATO_AUSENTE)
    }
  }
  const ref = parsed ?? new Date()
  const key = ymd(ref)
  let escolhida = VIGENCIAS_SALARIO_MINIMO[0]
  for (const v of VIGENCIAS_SALARIO_MINIMO) {
    if (vigenciaYmd(v) <= key) escolhida = v
    else break
  }
  return {
    mensal: escolhida[3],
    anoVigencia: escolhida[0],
    dataVigenciaFmt: formatarDataVigenciaBr(escolhida),
    dataRef: ref,
  }
}

export function formatarSalarioMinimo(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

export type ValorCausaSm = {
  mensal: number
  total: number
  mensalFmt: string
  totalFmt: string
  anoVigencia: number
  dataVigenciaFmt: string
  nota: string
}

/**
 * Valor da causa padrão SM (4 × salário mínimo na data do parto).
 * Em geração de petição, passe `exigirDataDoFato: true`.
 */
export function valorCausaSalarioMaternidade(
  dataReferencia?: Date | string | null,
  opts?: { exigirDataDoFato?: boolean },
): ValorCausaSm {
  const { mensal, anoVigencia, dataVigenciaFmt } = resolverSalarioMinimo(
    dataReferencia,
    opts,
  )
  const total = mensal * 4
  return {
    mensal,
    total,
    mensalFmt: formatarSalarioMinimo(mensal),
    totalFmt: formatarSalarioMinimo(total),
    anoVigencia,
    dataVigenciaFmt,
    nota: `Referência do valor: salário mínimo vigente desde ${dataVigenciaFmt} (data do parto/fato gerador); quantia devida por fato gerador (cada nascimento)`,
  }
}

/** Tentativa segura — retorna null se a data do fato estiver ausente/inválida. */
export function tentarValorCausaSalarioMaternidade(
  dataReferencia?: Date | string | null,
): ValorCausaSm | null {
  try {
    return valorCausaSalarioMaternidade(dataReferencia, {
      exigirDataDoFato: true,
    })
  } catch {
    return null
  }
}
