export type TipoCitacao =
  | 'legislacao'
  | 'artigo'
  | 'sumula'
  | 'recurso'
  | 'tema'
  | 'processo'
  | 'tribunal'

export interface CitacaoDetectada {
  tipo: TipoCitacao
  texto: string
  index: number
}

interface Padrao {
  tipo: TipoCitacao
  regex: RegExp
}

const PADROES: Padrao[] = [
  // Lei 8.213/91 · Lei nº 8.213/1991 · Decreto 3.048/99 · Emenda Constitucional 103/2019
  {
    tipo: 'legislacao',
    regex:
      /\b(?:lei\s+complementar|lei|decreto[-\s]lei|decreto|emenda\s+constitucional|medida\s+provis[óo]ria|instru[çc][ãa]o\s+normativa|portaria)\s+n?[º°o]?\.?\s*\d{1,3}(?:\.\d{3})*(?:\s*\/\s*\d{2,4})?/gi,
  },
  // Siglas de norma em caixa alta, para não capturar palavras comuns (ec, mp, in)
  {
    tipo: 'legislacao',
    regex: /\b(?:LC|EC|MP|IN)\s+n?[º°]?\.?\s*\d{1,3}(?:\.\d{3})*(?:\s*\/\s*\d{2,4})?/g,
  },
  // Art. 201 · Artigo 195 · Arts. 20 e 21 — exige a forma abreviada com ponto ou por extenso
  {
    tipo: 'artigo',
    regex: /\bart(?:s?\.|igos?)\s*\d{1,4}[º°]?/gi,
  },
  // Súmula 149 · Súmula Vinculante 37 · Súmula nº 44
  {
    tipo: 'sumula',
    regex: /\bs[úu]mula(?:\s+vinculante)?\s+n?[º°o]?\.?\s*\d{1,4}/gi,
  },
  // REsp 1.234.567 · RE 631240 · AgRg 123 · ADI 4357 · Tema/IRDR de classe processual
  {
    tipo: 'recurso',
    regex:
      /\b(?:REsp|AREsp|AgRg|AgInt|EDcl|ADPF|ADIn|ADI|ADC|IRDR|IAC|PUIL|RHC|RMS|AIRR|ARE|RR|RE|HC|MS|AI)\s+n?[º°]?\.?\s*\d(?:[\d.\-\/]*\d)?/g,
  },
  // Tema 1007 · Tema repetitivo 995 · Tema de repercussão geral 810
  {
    tipo: 'tema',
    regex:
      /\btema\s+(?:repetitivo\s+|de\s+repercuss[ãa]o\s+geral\s+)?n?[º°o]?\.?\s*\d{1,4}/gi,
  },
  // Numeração unificada CNJ: 0000000-00.0000.0.00.0000
  {
    tipo: 'processo',
    regex: /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g,
  },
]

const TRIBUNAIS = /\b(?:STF|STJ|TST|TNU|TSE|CRPS|TRF\s?-?\s?\d|TRT\s?-?\s?\d{1,2}|TJ[A-Z]{2})\b/g

// Uma sigla de tribunal só vira citação quando há algum número por perto
// (súmula, tema, recurso ou ano), evitando alarme em menções genéricas.
const JANELA_TRIBUNAL = 40

function detectarTribunais(texto: string): CitacaoDetectada[] {
  const encontradas: CitacaoDetectada[] = []
  TRIBUNAIS.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TRIBUNAIS.exec(texto)) !== null) {
    const inicio = Math.max(0, match.index - JANELA_TRIBUNAL)
    const fim = match.index + match[0].length + JANELA_TRIBUNAL
    if (/\d/.test(texto.slice(inicio, fim))) {
      encontradas.push({ tipo: 'tribunal', texto: match[0].trim(), index: match.index })
    }
  }
  return encontradas
}

export function detectarCitacoes(texto: string): CitacaoDetectada[] {
  if (!texto || texto.length < 6) return []

  const encontradas: CitacaoDetectada[] = []

  for (const { tipo, regex } of PADROES) {
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(texto)) !== null) {
      encontradas.push({ tipo, texto: match[0].trim(), index: match.index })
      if (match[0].length === 0) regex.lastIndex++
    }
  }

  encontradas.push(...detectarTribunais(texto))

  return encontradas.sort((a, b) => a.index - b.index)
}

export function temCitacaoJuridica(texto: string): boolean {
  if (!texto || texto.length < 6) return false

  for (const { regex } of PADROES) {
    regex.lastIndex = 0
    if (regex.test(texto)) return true
  }

  return detectarTribunais(texto).length > 0
}
