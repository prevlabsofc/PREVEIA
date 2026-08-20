/** Formatação de datas em pt-BR usada pelos campos de CRM da carteira de clientes. */

function paraData(valor?: string | Date | null): Date | null {
  if (!valor) return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 27/07/2026 */
export function formatarDataBR(valor?: string | Date | null): string {
  const d = paraData(valor)
  return d ? d.toLocaleDateString('pt-BR') : ''
}

/** 27/07/2026 às 14:30 */
export function formatarDataHoraBR(valor?: string | Date | null): string {
  const d = paraData(valor)
  if (!d) return ''
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${d.toLocaleDateString('pt-BR')} às ${hora}`
}

/**
 * Dias inteiros decorridos desde a data, contados por dia de calendário para que
 * "ontem 23h" não vire "há 0 dias". Negativo para datas futuras.
 */
export function diasDesde(valor?: string | Date | null, base: Date = new Date()): number | null {
  const d = paraData(valor)
  if (!d) return null
  const inicioDe = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  return Math.round((inicioDe(base) - inicioDe(d)) / 86_400_000)
}

/** "hoje", "ontem", "há 12 dias", "há 3 meses". Vazio se não houver data. */
export function tempoRelativo(valor?: string | Date | null, base: Date = new Date()): string {
  const dias = diasDesde(valor, base)
  if (dias === null) return ''
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 0) {
    const futuro = Math.abs(dias)
    return futuro === 1 ? 'amanhã' : `em ${futuro} dias`
  }
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
  const anos = Math.floor(dias / 365)
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`
}

/**
 * Cor de alerta pelo tempo sem contato. O ponto de rastrear último contato é
 * justamente enxergar o cliente esquecido, então a escala é bem curta.
 */
export function corDeAtraso(valor?: string | Date | null): string {
  const dias = diasDesde(valor)
  if (dias === null) return '#888'
  if (dias <= 30) return '#22C55E'
  if (dias <= 90) return '#F59E0B'
  return '#EF4444'
}

/** Valor para <input type="date">, no fuso local, a partir de um timestamp. */
export function paraInputDate(valor?: string | Date | null): string {
  const d = paraData(valor)
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Converte o valor de um <input type="date"> em ISO. A hora vai para o meio-dia
 * local: evita que o fuso jogue a data para o dia anterior ao voltar do banco.
 */
export function deInputDate(valor: string): string | null {
  if (!valor) return null
  const [ano, mes, dia] = valor.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  const d = new Date(ano, mes - 1, dia, 12, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
