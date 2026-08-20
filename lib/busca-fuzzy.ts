/** Busca fuzzy por trigramas (espelha pg_trgm) — fallback client-side. */

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function trigramas(texto: string): Set<string> {
  const set = new Set<string>()
  for (const p of semAcento(texto).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)) {
    const s = '  ' + p + ' '
    for (let i = 0; i + 3 <= s.length; i++) set.add(s.slice(i, i + 3))
  }
  return set
}

export function similarity(a: string, b: string): number {
  const A = trigramas(a)
  const B = trigramas(b)
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

export function wordSimilarity(a: string, b: string): number {
  const A = trigramas(a)
  const nA = A.size
  if (nA === 0) return 0
  const palavras = semAcento(b).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
  const largura = Math.max(1, semAcento(a).split(/[^a-z0-9]+/i).filter(Boolean).length)
  let melhor = 0
  for (let i = 0; i < palavras.length; i++) {
    for (let w = largura; w <= largura + 1 && i + w <= palavras.length; w++) {
      const B = trigramas(palavras.slice(i, i + w).join(' '))
      let inter = 0
      for (const t of A) if (B.has(t)) inter++
      melhor = Math.max(melhor, inter / nA)
    }
  }
  return melhor
}

export type ItemBuscavel = {
  id: string
  assunto: string
  ementa?: string | null
  numero?: string | null
  tribunal?: string | null
  [key: string]: unknown
}

export function scoreItem(termo: string, item: ItemBuscavel): number {
  const q = termo.trim()
  if (!q) return 1
  return Math.max(
    similarity(q, item.assunto || ''),
    wordSimilarity(q, item.assunto || ''),
    wordSimilarity(q, item.ementa || ''),
    wordSimilarity(q, item.numero || ''),
  )
}

/** Filtra e ordena por score. Limiar baixo para typos. */
export function filtrarFuzzy<T extends ItemBuscavel>(
  items: T[],
  termo: string,
  limiar = 0.22
): T[] {
  const q = termo.trim()
  if (!q) return items
  const exact = q.toLowerCase()
  const ranqueados = items
    .map(it => {
      const hay = `${it.assunto} ${it.numero || ''} ${it.ementa || ''}`.toLowerCase()
      if (hay.includes(exact) || semAcento(hay).includes(semAcento(exact))) {
        return { it, score: 1 }
      }
      return { it, score: scoreItem(q, it) }
    })
    .filter(r => r.score >= limiar)
    .sort((a, b) => b.score - a.score)
  return ranqueados.map(r => r.it)
}

/** Sugestão "Você quis dizer" a partir do vocabulário de assuntos. */
export function sugerirCorrecao(termo: string, assuntos: string[], limiar = 0.35): string | null {
  const q = termo.trim()
  if (q.length < 3) return null
  const qNorm = semAcento(q).toLowerCase()
  let melhor: { t: string; s: number } | null = null
  const vistos = new Set<string>()
  for (const raw of assuntos) {
    for (const palavra of semAcento(raw).toLowerCase().split(/[^a-z0-9]+/).filter(p => p.length >= 4)) {
      if (vistos.has(palavra)) continue
      vistos.add(palavra)
      if (palavra === qNorm) return null
      const s = similarity(q, palavra)
      if (s >= limiar && (!melhor || s > melhor.s)) melhor = { t: palavra, s }
    }
    const assuntoNorm = semAcento(raw).toLowerCase()
    if (assuntoNorm === qNorm) return null
    const sAssunto = similarity(q, raw)
    if (sAssunto >= limiar && (!melhor || sAssunto > melhor.s)) melhor = { t: raw, s: sAssunto }
  }
  return melhor?.t ?? null
}
