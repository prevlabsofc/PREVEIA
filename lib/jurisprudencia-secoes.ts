/**
 * Agrupamento da base de jurisprudências por data de entrada no sistema.
 *
 * A seção é definida por QUANDO O REGISTRO CHEGOU NA BASE, não pela data de
 * julgamento. Do ponto de vista do advogado, "Hoje" significa "novidade para
 * mim": um acórdão publicado semana passada mas importado nesta manhã é
 * novidade, enquanto um acórdão julgado hoje que já estava cadastrado há meses
 * não é. Ordenar por `data_julgamento` deixaria as seções praticamente
 * imóveis — a base tem súmulas de 2008 — e esconderia o que acabou de entrar.
 */

export const FUSO_BRASIL = 'America/Sao_Paulo'

export type SecaoId = 'hoje' | 'recentes' | 'antigas'

export const SECOES: { id: SecaoId; titulo: string; descricao: string; cor: string }[] = [
  { id: 'hoje', titulo: 'Hoje', descricao: 'Entraram na base hoje', cor: '#D4AF37' },
  { id: 'recentes', titulo: 'Recentes', descricao: 'Últimos 7 dias', cor: '#3B82F6' },
  { id: 'antigas', titulo: 'Antigas', descricao: 'Mais de 7 dias na base', cor: '#555' },
]

/**
 * Colunas candidatas ao carimbo de "entrou na base", em ordem de prioridade.
 * Hoje só existe `created_at`; a sincronização diária de jurisprudências pode
 * acrescentar um carimbo próprio de importação, e nesse caso basta que o nome
 * dele já esteja no topo desta lista para o agrupamento passar a usá-lo.
 */
const CAMPOS_DATA_ENTRADA = ['importado_em', 'sincronizado_em', 'created_at'] as const

const diaBrasil = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_BRASIL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Data civil (`YYYY-MM-DD`) de um instante no fuso de Brasília.
 *
 * O corte das seções precisa ser o dia brasileiro, não o dia UTC: às 22h de
 * Brasília já é o dia seguinte em UTC, então um `new Date().toISOString()`
 * jogaria registros da noite para a seção errada.
 */
export function diaCivilBrasil(instante: Date = new Date()): string {
  return diaBrasil.format(instante)
}

function meiaNoiteUTC(dia: string): number {
  return Date.parse(`${dia}T00:00:00Z`)
}

/** Quantos dias civis brasileiros separam `iso` de `hoje`. */
export function diasCorridosAte(iso: string, hoje: string = diaCivilBrasil()): number | null {
  const instante = new Date(iso)
  if (Number.isNaN(instante.getTime())) return null
  return Math.round((meiaNoiteUTC(hoje) - meiaNoiteUTC(diaCivilBrasil(instante))) / 86_400_000)
}

/** Carimbo de entrada na base do registro, ou `null` se nenhum estiver preenchido. */
export function dataDeEntrada(registro: Record<string, unknown>): string | null {
  for (const campo of CAMPOS_DATA_ENTRADA) {
    const valor = registro[campo]
    if (typeof valor === 'string' && valor.length > 0) return valor
  }
  return null
}

export function secaoDaJurisprudencia(
  registro: Record<string, unknown>,
  hoje: string = diaCivilBrasil()
): SecaoId {
  const entrada = dataDeEntrada(registro)
  if (!entrada) return 'antigas'
  const dias = diasCorridosAte(entrada, hoje)
  if (dias === null) return 'antigas'
  // Datas no futuro (relógio dessincronizado do importador) contam como hoje.
  if (dias <= 0) return 'hoje'
  return dias <= 7 ? 'recentes' : 'antigas'
}
