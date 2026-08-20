/**
 * Tags de segmentação da newsletter — presets + mapeamento a partir de
 * clients.tipo_beneficio (checklist INSS).
 */

export const TAGS_NEWSLETTER_PRESET = [
  'Aposentadoria Rural >55',
  'Aposentadoria Urbana',
  'BPC/LOAS',
  'Auxílio-Doença',
  'Aposentadoria por Incapacidade',
  'Salário-Maternidade',
  'Pensão por Morte',
] as const

export type TagNewsletter = (typeof TAGS_NEWSLETTER_PRESET)[number] | string

/** Mapeia tipo_beneficio canônico → tag de newsletter. */
const MAPA_TIPO_PARA_TAG: Record<string, string> = {
  'Aposentadoria por Idade (Rural)': 'Aposentadoria Rural >55',
  'Aposentadoria por Idade (Urbana)': 'Aposentadoria Urbana',
  'BPC/LOAS (Idoso)': 'BPC/LOAS',
  'BPC/LOAS (Deficiência)': 'BPC/LOAS',
  'Auxílio por Incapacidade Temporária': 'Auxílio-Doença',
  'Aposentadoria por Incapacidade Permanente': 'Aposentadoria por Incapacidade',
  'Salário-Maternidade': 'Salário-Maternidade',
  'Pensão por Morte': 'Pensão por Morte',
}

export function tagDeTipoBeneficio(tipo: string | null | undefined): string | null {
  if (!tipo?.trim()) return null
  const direto = MAPA_TIPO_PARA_TAG[tipo.trim()]
  if (direto) return direto
  // Fallback: usa o próprio rótulo se já for um preset conhecido
  const preset = TAGS_NEWSLETTER_PRESET.find(
    t => t.toLowerCase() === tipo.trim().toLowerCase()
  )
  return preset || tipo.trim()
}

export function mesclarTags(
  atuais: string[] | null | undefined,
  extras: (string | null | undefined)[]
): string[] {
  const set = new Set<string>()
  for (const t of atuais || []) {
    const v = String(t || '').trim()
    if (v) set.add(v)
  }
  for (const t of extras) {
    const v = String(t || '').trim()
    if (v) set.add(v)
  }
  return Array.from(set)
}

/** Inscrito casa com o filtro se tiver TODAS as tags selecionadas (AND). */
export function inscritoCasaComTags(
  tagsInscrito: string[] | null | undefined,
  filtro: string[] | null | undefined
): boolean {
  if (!filtro || filtro.length === 0) return true
  const set = new Set((tagsInscrito || []).map(t => t.trim()).filter(Boolean))
  return filtro.every(t => set.has(t.trim()))
}
