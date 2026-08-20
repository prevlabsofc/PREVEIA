/**
 * Série temporal de contagens usada pelos gráficos de linha do dashboard e das
 * métricas de CRM. Recebe as datas cruas (`created_at`) e devolve os pontos já
 * agrupados no período escolhido.
 */

export type Periodo = 'semana' | 'mes' | 'ano'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export type PontoSerie = { dia: string } & Record<string, string | number>

/**
 * @param chave nome do campo numérico no ponto — é o `dataKey` do gráfico e
 *              também o rótulo padrão do tooltip do recharts.
 */
export function serieTemporal(
  datas: (string | null | undefined)[],
  periodo: Periodo,
  chave = 'docs'
): PontoSerie[] {
  const hoje = new Date()

  if (periodo === 'ano') {
    const porMes = new Array(12).fill(0)
    for (const iso of datas) {
      const d = iso ? new Date(iso) : null
      if (!d || Number.isNaN(d.getTime())) continue
      if (d.getFullYear() === hoje.getFullYear()) porMes[d.getMonth()] += 1
    }
    return MESES.map((mes, i) => ({ dia: mes, [chave]: porMes[i] }))
  }

  const porDia = new Map<string, number>()
  for (const iso of datas) {
    const d = iso ? new Date(iso) : null
    if (!d || Number.isNaN(d.getTime())) continue
    const k = d.toDateString()
    porDia.set(k, (porDia.get(k) ?? 0) + 1)
  }

  const total = periodo === 'semana' ? 7 : 30
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() - (total - 1 - i))
    const rotulo = periodo === 'semana' ? DIAS_SEMANA[d.getDay()] : `${d.getDate()}/${d.getMonth() + 1}`
    return { dia: rotulo, [chave]: porDia.get(d.toDateString()) ?? 0 }
  })
}
