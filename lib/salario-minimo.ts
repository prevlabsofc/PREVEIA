/**
 * Tabela do salário mínimo nacional (piso mensal em reais).
 * Fonte 2026: Decreto nº 12.797/2025 (R$ 1.621,00 a partir de 01/01/2026).
 */
const SALARIO_MINIMO_POR_ANO: Record<number, number> = {
  2019: 998,
  2020: 1045,
  2021: 1100,
  2022: 1212,
  2023: 1320,
  2024: 1412,
  2025: 1518,
  2026: 1621,
}

const ANOS_ORD = Object.keys(SALARIO_MINIMO_POR_ANO)
  .map(Number)
  .sort((a, b) => a - b)

function anoDe(data?: Date | string | null): number {
  if (data == null || data === '') return new Date().getFullYear()
  if (data instanceof Date) {
    return Number.isFinite(data.getTime()) ? data.getFullYear() : new Date().getFullYear()
  }
  const s = String(data).trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return Number(iso[1])
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (br) return Number(br[3])
  const y = Number.parseInt(s, 10)
  if (Number.isFinite(y) && y >= 1900 && y <= 2100) return y
  return new Date().getFullYear()
}

/**
 * Salário mínimo vigente na data de referência.
 * Sem data → mínimo vigente (ano corrente). Pronto para uso com data do parto.
 */
export function getSalarioMinimo(dataReferencia?: Date | string | null): number {
  const y = anoDe(dataReferencia)
  if (SALARIO_MINIMO_POR_ANO[y] != null) return SALARIO_MINIMO_POR_ANO[y]
  const menor = ANOS_ORD[0]
  const maior = ANOS_ORD[ANOS_ORD.length - 1]
  if (y < menor) return SALARIO_MINIMO_POR_ANO[menor]
  return SALARIO_MINIMO_POR_ANO[maior]
}

export function formatarSalarioMinimo(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/** Valor da causa padrão SM (4 × salário mínimo). */
export function valorCausaSalarioMaternidade(
  dataReferencia?: Date | string | null,
): {
  mensal: number
  total: number
  mensalFmt: string
  totalFmt: string
} {
  const mensal = getSalarioMinimo(dataReferencia)
  const total = mensal * 4
  return {
    mensal,
    total,
    mensalFmt: formatarSalarioMinimo(mensal),
    totalFmt: formatarSalarioMinimo(total),
  }
}
