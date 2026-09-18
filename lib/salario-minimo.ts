/**
 * Salário mínimo nacional vigente na data de referência (fato gerador / parto).
 * Valores nominais oficiais (R$), com vigência por data de INÍCIO.
 * Fontes: Decretos/MPs/Leis federais; série histórica Senado/Ipeadata.
 */

/** Pares [ano, mês 1–12, dia, valor mensal R$], ordenados do mais antigo ao mais recente. */
const VIGENCIAS: ReadonlyArray<readonly [number, number, number, number]> = [
  [1994, 9, 1, 70],
  [1995, 5, 1, 100],
  [1996, 5, 1, 112],
  [1997, 5, 1, 120],
  [1998, 5, 1, 130],
  [1999, 5, 1, 136],
  [2000, 4, 3, 151],
  [2001, 4, 1, 180],
  [2002, 4, 1, 200],
  [2003, 4, 1, 240],
  [2004, 5, 1, 260],
  [2005, 5, 1, 300],
  [2006, 4, 1, 350],
  [2007, 4, 1, 380],
  [2008, 3, 1, 415],
  [2009, 2, 1, 465],
  [2010, 1, 1, 510],
  [2011, 1, 1, 540],
  [2011, 3, 1, 545],
  [2012, 1, 1, 622],
  [2013, 1, 1, 678],
  [2014, 1, 1, 724],
  [2015, 1, 1, 788],
  [2016, 1, 1, 880],
  [2017, 1, 1, 937],
  [2018, 1, 1, 954],
  [2019, 1, 1, 998],
  [2020, 1, 1, 1039],
  [2020, 2, 1, 1045],
  [2021, 1, 1, 1100],
  [2022, 1, 1, 1212],
  [2023, 1, 1, 1302],
  [2023, 5, 1, 1320],
  [2024, 1, 1, 1412],
  [2025, 1, 1, 1518],
  [2026, 1, 1, 1621],
]

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

/**
 * Salário mínimo vigente na data de referência.
 * Sem data → mínimo vigente (hoje).
 * Ex.: parto 12/02/2000 → R$ 136 (vigência desde 01/05/1999; antes de 03/04/2000).
 */
export function getSalarioMinimo(dataReferencia?: Date | string | null): number {
  const info = resolverSalarioMinimo(dataReferencia)
  return info.mensal
}

/** Resolve valor + data de início da vigência aplicada (para nota da planilha). */
export function resolverSalarioMinimo(dataReferencia?: Date | string | null): {
  mensal: number
  anoVigencia: number
  /** Data de início da vigência usada (dd/mm/aaaa). */
  dataVigenciaFmt: string
  dataRef: Date
} {
  const ref = parseDataRef(dataReferencia) ?? new Date()
  const key = ymd(ref)
  let escolhida = VIGENCIAS[0]
  // Último reajuste com vigência <= data do parto (nunca < exclusivo).
  for (const v of VIGENCIAS) {
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

/** Valor da causa padrão SM (4 × salário mínimo na data do parto). */
export function valorCausaSalarioMaternidade(
  dataReferencia?: Date | string | null,
): {
  mensal: number
  total: number
  mensalFmt: string
  totalFmt: string
  anoVigencia: number
  dataVigenciaFmt: string
  nota: string
} {
  const { mensal, anoVigencia, dataVigenciaFmt } = resolverSalarioMinimo(dataReferencia)
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
