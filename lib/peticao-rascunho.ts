/**
 * Fallback local para edições de petição (refresh / troca de aba).
 * Backend (documents) permanece a fonte de verdade quando há documentId.
 */

export type RascunhoPeticao = {
  title: string
  content: string
  updatedAt: number
}

const PREFIX = 'marple:peticao-rascunho:'

function chave(id: string): string {
  return `${PREFIX}${id}`
}

export function chaveRascunhoPeticao(opts: {
  documentId?: string | null
  clientId?: string | null
  agentType?: string | null
  fileName?: string | null
}): string {
  if (opts.documentId) return `doc:${opts.documentId}`
  const partes = [
    opts.clientId || 'sem-cliente',
    opts.agentType || 'agente',
    opts.fileName || 'peticao',
  ]
  return `sessao:${partes.join('|')}`
}

export function lerRascunhoPeticao(id: string): RascunhoPeticao | null {
  if (typeof window === 'undefined' || !id) return null
  try {
    const raw = localStorage.getItem(chave(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as RascunhoPeticao
    if (!parsed || typeof parsed.content !== 'string') return null
    return {
      title: String(parsed.title || 'Petição'),
      content: parsed.content,
      updatedAt: Number(parsed.updatedAt) || Date.now(),
    }
  } catch {
    return null
  }
}

export function gravarRascunhoPeticao(id: string, data: { title: string; content: string }): void {
  if (typeof window === 'undefined' || !id) return
  try {
    const payload: RascunhoPeticao = {
      title: data.title,
      content: data.content,
      updatedAt: Date.now(),
    }
    localStorage.setItem(chave(id), JSON.stringify(payload))
  } catch {
    // quota / private mode — ignora
  }
}

export function limparRascunhoPeticao(id: string): void {
  if (typeof window === 'undefined' || !id) return
  try {
    localStorage.removeItem(chave(id))
  } catch {
    /* ignore */
  }
}
