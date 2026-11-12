/**
 * Formatação forense compartilhada da petição SM:
 * - negrito do nome da cliente e de "INSS"
 * - normalização de trechos em CAIXA ALTA (exceto títulos/cabeçalhos)
 */

import {
  caixaTituloSeUniforme,
  inteiramenteMaiusculo,
} from '@/lib/formatar-endereco'

/** Siglas/acrônimos que permanecem em maiúsculas na normalização de caixa. */
const SIGLAS_PRESERVAR = new Set([
  'INSS',
  'CPF',
  'RG',
  'NB',
  'CNIS',
  'JEF',
  'CPC',
  'STF',
  'STJ',
  'TNU',
  'TRF',
  'ADI',
  'ADIS',
  'CF',
  'EC',
  'OAB',
  'SSP',
  'UF',
  'MEI',
  'CLT',
  'BPC',
  'LOAS',
  'ITR',
  'INCRA',
  'SELIC',
  'PDF',
  'DOCX',
  'HTML',
])

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Variantes de grafia do nome para busca (original, maiúscula, título). */
export function variantesNomeCliente(nome: string | null | undefined): string[] {
  const raw = String(nome || '').trim()
  if (raw.length < 2) return []
  const titulo = caixaTituloSeUniforme(raw)
  const upper = raw.toLocaleUpperCase('pt-BR')
  const lower = raw.toLocaleLowerCase('pt-BR')
  return Array.from(new Set([raw, titulo, upper, lower].filter((v) => v.length >= 2)))
}

/**
 * Converte parágrafo inteiramente em CAIXA ALTA para caixa de sentença,
 * preservando siglas conhecidas. Não altera títulos curtos (≤ 6 palavras
 * todas maiúsculas com "DA "/"DO "/"DAS ") — o chamador deve pular títulos.
 */
export function normalizarCaixaAltaCorrida(texto: string): string {
  const s = String(texto || '')
  if (!s.trim()) return s
  // Só age se o trecho tem letras e está (quase) todo em maiúsculas.
  const letras = s.replace(/[^\p{L}]/gu, '')
  if (letras.length < 12) return s
  if (!inteiramenteMaiusculo(letras)) return s

  const lower = s.toLocaleLowerCase('pt-BR')
  let out = lower.replace(/(^|[.!?]\s+)(\p{L})/gu, (_m, pre: string, ch: string) => {
    return pre + ch.toLocaleUpperCase('pt-BR')
  })
  // Primeira letra
  out = out.replace(/^(\s*)(\p{L})/u, (_m, sp: string, ch: string) => {
    return sp + ch.toLocaleUpperCase('pt-BR')
  })
  // Restaura siglas
  out = out.replace(/\b([\p{L}]{2,})\b/gu, (tok) => {
    const up = tok.toLocaleUpperCase('pt-BR')
    if (SIGLAS_PRESERVAR.has(up)) return up
    return tok
  })
  // "INSS" após normalização
  out = out.replace(/\binss\b/gi, 'INSS')
  return out
}

/**
 * Normaliza CAIXA ALTA em um bloco multiparágrafo (síntese, fundamentação etc.).
 * Linhas que parecem subtítulo "DA …:" ficam em maiúsculas.
 */
export function normalizarCaixaAltaEmBloco(texto: string): string {
  return String(texto || '')
    .split(/\n/)
    .map((linha) => {
      const t = linha.trim()
      if (!t) return linha
      if (/^DA\s+\p{L}/iu.test(t) && t.endsWith(':')) return linha
      if (/^(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s*[–—\-]/i.test(t)) return linha
      return normalizarCaixaAltaCorrida(linha)
    })
    .join('\n')
}

export type SegmentoNegrito = { text: string; bold: boolean }

/**
 * Parte o texto em segmentos com/sem negrito para nome da cliente e INSS.
 * O nome exibido é normalizado para caixa de título quando veio uniforme.
 */
export function segmentarNegritoNomeInss(
  texto: string,
  nomeCliente?: string | null,
): SegmentoNegrito[] {
  const src = String(texto || '')
  if (!src) return []

  const parts: { start: number; end: number; display: string }[] = []

  // Instituto Nacional do Seguro Social (antes da sigla, para não fragmentar)
  const reRazao = /Instituto\s+Nacional\s+do\s+Seguro\s+Social/gi
  let mRazao: RegExpExecArray | null
  while ((mRazao = reRazao.exec(src))) {
    parts.push({
      start: mRazao.index,
      end: mRazao.index + mRazao[0].length,
      display: 'Instituto Nacional do Seguro Social',
    })
  }

  // INSS
  const reInss = /\bINSS\b/gi
  let m: RegExpExecArray | null
  while ((m = reInss.exec(src))) {
    parts.push({ start: m.index, end: m.index + m[0].length, display: 'INSS' })
  }

  for (const variante of variantesNomeCliente(nomeCliente)) {
    const re = new RegExp(`(?<![\\p{L}])${escapeRegExp(variante)}(?![\\p{L}])`, 'giu')
    let nm: RegExpExecArray | null
    while ((nm = re.exec(src))) {
      const matched = nm[0]
      const display = caixaTituloSeUniforme(matched)
      parts.push({
        start: nm.index,
        end: nm.index + matched.length,
        display,
      })
    }
  }

  if (!parts.length) return [{ text: src, bold: false }]

  parts.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: typeof parts = []
  for (const p of parts) {
    const last = merged[merged.length - 1]
    if (last && p.start < last.end) continue // overlap: keep first (longer preferred by sort)
    merged.push(p)
  }

  const segs: SegmentoNegrito[] = []
  let cursor = 0
  for (const p of merged) {
    if (p.start > cursor) {
      segs.push({ text: src.slice(cursor, p.start), bold: false })
    }
    segs.push({ text: p.display, bold: true })
    cursor = p.end
  }
  if (cursor < src.length) segs.push({ text: src.slice(cursor), bold: false })
  return segs
}

/** HTML escapado + <strong> no nome da cliente e em INSS. */
export function htmlComNegritoNomeInss(
  textoEscapadoOuCru: string,
  escapar: (s: string) => string,
  nomeCliente?: string | null,
): string {
  const segs = segmentarNegritoNomeInss(textoEscapadoOuCru, nomeCliente)
  return segs
    .map((s) => {
      const e = escapar(s.text)
      return s.bold ? `<strong>${e}</strong>` : e
    })
    .join('')
}

/** Normaliza o nome no início da qualificação (caixa + padrão forense). */
export function normalizarNomeAberturaQualificacao(texto: string): string {
  return String(texto || '').replace(/^(\s*)([^,]+)(?=,)/, (_m, sp: string, nome: string) => {
    return `${sp}${caixaTituloSeUniforme(nome)}`
  })
}
