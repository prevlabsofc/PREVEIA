/** Sessão ativa de geração de petição (Agentes) ↔ Jurisprudência. */

export const PETICAO_ATIVA_KEY = 'marple_peticao_ativa'
export const PETICAO_FILA_KEY = 'marple_peticao_fila'
export const PETICAO_INSERIR_EVENT = 'marple:inserir-peticao'
export const PETICAO_CHANNEL = 'marple_peticao'

export function formatarEmentaParaPeticao(item: {
  tribunal?: string | null
  tipo?: string | null
  numero?: string | null
  assunto?: string | null
  ementa?: string | null
  data_julgamento?: string | null
}): string {
  const cabeca = [
    item.tribunal,
    [item.tipo, item.numero].filter(Boolean).join(' '),
    item.assunto,
  ].filter(Boolean).join(' — ')
  const data = item.data_julgamento
    ? `\nData do julgamento: ${new Date(item.data_julgamento).toLocaleDateString('pt-BR')}`
    : ''
  return `JURISPRUDÊNCIA\n${cabeca}${data}\n\n${item.ementa || ''}`.trim()
}

export function marcarPeticaoAtiva(ativa: boolean) {
  try {
    if (typeof window === 'undefined') return
    if (ativa) sessionStorage.setItem(PETICAO_ATIVA_KEY, '1')
    else sessionStorage.removeItem(PETICAO_ATIVA_KEY)
  } catch { /* SSR / private mode */ }
}

export function peticaoEstaAtiva(): boolean {
  try {
    return typeof window !== 'undefined' && sessionStorage.getItem(PETICAO_ATIVA_KEY) === '1'
  } catch {
    return false
  }
}

function enfileirar(texto: string) {
  try {
    const raw = sessionStorage.getItem(PETICAO_FILA_KEY)
    const fila: string[] = raw ? JSON.parse(raw) : []
    fila.push(texto)
    sessionStorage.setItem(PETICAO_FILA_KEY, JSON.stringify(fila))
  } catch { /* ignore */ }
}

/** Consome e limpa a fila de ementas pendentes (Agentes). */
export function consumirFilaPeticao(): string[] {
  try {
    const raw = sessionStorage.getItem(PETICAO_FILA_KEY)
    sessionStorage.removeItem(PETICAO_FILA_KEY)
    if (!raw) return []
    const fila = JSON.parse(raw)
    return Array.isArray(fila) ? fila.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

export type ResultadoInsercaoPeticao = 'inserido' | 'copiado'

/**
 * Envia ementa para a sessão ativa de petição, ou copia formatada para a área
 * de transferência se não houver sessão.
 *
 * Como /jurisprudencia e /agentes são páginas distintas, usamos sessionStorage
 * (fila) + BroadcastChannel + CustomEvent para cobrir mesma aba e abas paralelas.
 */
export async function inserirNaPeticaoOuCopiar(texto: string): Promise<ResultadoInsercaoPeticao> {
  if (peticaoEstaAtiva()) {
    enfileirar(texto)
    try {
      window.dispatchEvent(new CustomEvent(PETICAO_INSERIR_EVENT, { detail: texto }))
    } catch { /* ignore */ }
    try {
      const ch = new BroadcastChannel(PETICAO_CHANNEL)
      ch.postMessage({ type: 'inserir', texto })
      ch.close()
    } catch { /* Safari antigo / SSR */ }
    return 'inserido'
  }
  try {
    await navigator.clipboard.writeText(texto)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = texto
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  return 'copiado'
}
