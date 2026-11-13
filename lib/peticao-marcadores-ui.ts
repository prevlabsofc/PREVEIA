/**
 * Marcadores <<<TAG>>> da petição SM — rótulos para divisores visuais no editor.
 * O valor salvo continua com as tags; só a apresentação muda.
 */

export const MARCADOR_RE = /<<<\s*([A-Z0-9_]+)\s*>>>/g

/** Rótulos amigáveis (abertura e fim). */
export const LABEL_MARCADOR: Record<string, string> = {
  SM_RURAL_V2: 'SM Rural v2',
  META: 'Meta',
  END_META: 'Fim · Meta',
  ENDERECO: 'Endereço / juízo',
  END_ENDERECO: 'Fim · Endereço',
  QUALIFICACAO: 'Qualificação',
  END_QUALIFICACAO: 'Fim · Qualificação',
  TITULO: 'Título',
  SUBTITULO: 'Subtítulo',
  END_TITULO: 'Fim · Título',
  EM_FACE: 'Em face do INSS',
  END_EM_FACE: 'Fim · Em face',
  I_PRELIMINARES: 'I · Preliminares',
  END_I: 'Fim · I',
  II_QUADRO: 'II · Quadro fático',
  END_II: 'Fim · II',
  III_SINTESE_ANTES: 'III · Síntese (antes)',
  END_III_ANTES: 'Fim · III antes',
  TIMELINE: 'Linha do tempo',
  END_TIMELINE: 'Fim · Timeline',
  III_SINTESE_DEPOIS: 'III · Síntese (depois)',
  END_III_DEPOIS: 'Fim · III depois',
  IV_PROVAS: 'IV · Das provas',
  END_IV: 'Fim · IV',
  IV_FECHO: 'IV · Fecho',
  END_IV_FECHO: 'Fim · IV fecho',
  V_FUNDAMENTACAO: 'V · Fundamentação',
  END_V: 'Fim · V',
  VI_PEDIDOS: 'VI · Dos pedidos',
  END_VI: 'Fim · VI',
  FECHAMENTO: 'Fechamento',
  END_FECHAMENTO: 'Fim · Fechamento',
  PLANILHA: 'Planilha de cálculo',
  END_PLANILHA: 'Fim · Planilha',
  CLOSING: 'Fecho',
  END_CLOSING: 'Fim · Fecho',
}

export function labelMarcador(tag: string): string {
  const key = tag.replace(/^\//, '').toUpperCase()
  return LABEL_MARCADOR[key] || key.replace(/_/g, ' ')
}

export type SegmentoPeticao =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'marcador'; tag: string; raw: string }

/** Parte o texto em segmentos de texto livre e marcadores. */
export function segmentarPeticao(value: string): SegmentoPeticao[] {
  const out: SegmentoPeticao[] = []
  const re = /<<<\s*([A-Z0-9_]+)\s*>>>/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    if (m.index > last) {
      out.push({ tipo: 'texto', texto: value.slice(last, m.index) })
    }
    out.push({ tipo: 'marcador', tag: m[1].toUpperCase(), raw: m[0] })
    last = m.index + m[0].length
  }
  if (last < value.length) {
    out.push({ tipo: 'texto', texto: value.slice(last) })
  }
  if (out.length === 0) {
    out.push({ tipo: 'texto', texto: value })
  }
  return out
}

/** Remonta o texto a partir dos segmentos (marcadores canônicos). */
export function remontarPeticao(segmentos: SegmentoPeticao[]): string {
  return segmentos
    .map((s) => (s.tipo === 'marcador' ? `<<<${s.tag}>>>` : s.texto))
    .join('')
}

/** True se a posição do caret está sobre um marcador (para impedir apagar). */
export function intervaloCobreMarcador(
  value: string,
  start: number,
  end: number,
): boolean {
  const re = /<<<\s*[A-Z0-9_]+\s*>>>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(value)) !== null) {
    const a = m.index
    const b = m.index + m[0].length
    if (start < b && end > a) return true
  }
  return false
}
