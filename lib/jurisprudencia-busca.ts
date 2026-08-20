/**
 * A4 — busca tolerante a acentos e typos (client-side).
 * A página carrega a base completa; o RPC `buscar_jurisprudencias_fuzzy`
 * (migration) fica disponível se no futuro a listagem for paginada no servidor.
 */

export function semAcento(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function trigramas(texto: string): Set<string> {
  const set = new Set<string>()
  for (const p of semAcento(texto).split(/[^a-z0-9]+/i).filter(Boolean)) {
    const s = `  ${p} `
    for (let i = 0; i + 3 <= s.length; i++) set.add(s.slice(i, i + 3))
  }
  return set
}

/** similaridade Jaccard de trigramas (≈ pg_trgm similarity). */
export function similaridade(a: string, b: string): number {
  const A = trigramas(a)
  const B = trigramas(b)
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

const LIMIAR_MATCH = 0.28
const LIMIAR_SUGESTAO = 0.35

export function matchFuzzy(
  termo: string,
  campos: (string | null | undefined)[]
): boolean {
  const q = termo.trim()
  if (!q) return true
  const qn = semAcento(q)
  for (const campo of campos) {
    if (!campo) continue
    const cn = semAcento(campo)
    if (cn.includes(qn)) return true
    if (similaridade(q, campo) >= LIMIAR_MATCH) return true
    // Typos curtos: qualquer palavra do campo com boa similaridade
    for (const palavra of cn.split(/[^a-z0-9]+/).filter(p => p.length >= 4)) {
      if (similaridade(qn, palavra) >= 0.55) return true
    }
  }
  return false
}

/** Sugestões a partir de assuntos reais da base ("Você quis dizer"). */
export function sugerirTermos(
  termo: string,
  assuntos: string[],
  limite = 3
): string[] {
  const q = termo.trim()
  if (q.length < 2) return []
  const qn = semAcento(q)
  const vocab = new Map<string, string>()
  for (const assunto of assuntos) {
    if (!assunto) continue
    vocab.set(semAcento(assunto), assunto)
    for (const p of assunto.split(/[^a-zA-ZÀ-ÿ0-9]+/).filter(x => x.length >= 4)) {
      const k = semAcento(p)
      if (!vocab.has(k)) vocab.set(k, p)
    }
  }
  return [...vocab.entries()]
    .map(([norm, original]) => ({ original, score: similaridade(qn, norm) }))
    .filter(x => x.score >= LIMIAR_SUGESTAO && semAcento(x.original) !== qn)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(x => x.original)
}
