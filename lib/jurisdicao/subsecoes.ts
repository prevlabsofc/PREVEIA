/**
 * Mapeamento município → Subseção Judiciária (JEF / Justiça Federal).
 *
 * Fonte oficial TRF1:
 * https://www.trf1.jus.br/trf1/secoes-judiciarias/jurisdicao
 *
 * Política: NÃO inventar vínculos. Só entram municípios com mapeamento
 * confirmado (revisor / sede óbvia da própria subseção). Município fora
 * da tabela exige preenchimento manual da subseção no formulário.
 *
 * Confirmado pelo revisor: Lago da Pedra/MA → Subseção de Bacabal/MA.
 * Sedes de subseção do MA mapeiam para si mesmas (óbvio).
 */

export type MapeamentoSubsecao = {
  /** Nome do município (canônico, Title Case). */
  municipio: string
  uf: string
  /** Nome da cidade-sede da subseção (sem "/UF"). */
  subsecao: string
  /** Origem do vínculo. */
  fonte: string
}

const FONTE_TRF1 =
  'https://www.trf1.jus.br/trf1/secoes-judiciarias/jurisdicao'
const FONTE_REVISOR = 'Confirmado pelo revisor do produto (Lago da Pedra → Bacabal)'
const FONTE_SEDE = `Sede da própria subseção — ${FONTE_TRF1}`

/**
 * Sedes de Subseção Judiciária da SJMA (TRF1) — cada uma responde por si.
 * Lista conservadora das sedes publicadas pela SJ do Maranhão.
 */
const SEDES_SUBSECAO_MA = [
  'São Luís',
  'Imperatriz',
  'Caxias',
  'Bacabal',
  'Balsas',
  'Pinheiro',
  'Santa Inês',
  'Chapadinha',
  'Presidente Dutra',
] as const

/** Tabela município → subseção (somente vínculos confirmados). */
export const MAPEAMENTO_SUBSECOES: MapeamentoSubsecao[] = [
  ...SEDES_SUBSECAO_MA.map((sede) => ({
    municipio: sede,
    uf: 'MA',
    subsecao: sede,
    fonte: FONTE_SEDE,
  })),
  {
    municipio: 'Lago da Pedra',
    uf: 'MA',
    subsecao: 'Bacabal',
    fonte: FONTE_REVISOR,
  },
]

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

/** Normaliza nome de município para comparação (sem acento, lower, trim). */
export function normalizarChaveMunicipio(nome: string): string {
  return stripAccents(String(nome || ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Formata "Bacabal" + "MA" → "Bacabal/MA". Se já tiver "/", mantém. */
export function formatarSubsecaoUf(subsecao: string, uf?: string): string {
  const s = String(subsecao || '').trim()
  if (!s) return ''
  if (/\//.test(s)) return s.replace(/\s*\/\s*/, '/').trim()
  const u = String(uf || '').trim().toUpperCase()
  return u ? `${s}/${u}` : s
}

/**
 * Busca a subseção competente para o município/UF.
 * Retorna "Cidade/UF" ou null se não houver mapeamento confirmado.
 */
export function buscarSubsecao(
  municipio: string,
  uf: string,
): string | null {
  const munKey = normalizarChaveMunicipio(municipio)
  const ufKey = String(uf || '').trim().toUpperCase()
  if (!munKey || !ufKey) return null

  const hit = MAPEAMENTO_SUBSECOES.find(
    (m) =>
      m.uf.toUpperCase() === ufKey &&
      normalizarChaveMunicipio(m.municipio) === munKey,
  )
  if (!hit) return null
  return formatarSubsecaoUf(hit.subsecao, hit.uf)
}

/** Lista de subseções distintas de uma UF (para o select do formulário). */
export function listarSubsecoesUf(uf: string): string[] {
  const ufKey = String(uf || '').trim().toUpperCase()
  const set = new Set<string>()
  for (const m of MAPEAMENTO_SUBSECOES) {
    if (m.uf.toUpperCase() === ufKey) {
      set.add(formatarSubsecaoUf(m.subsecao, m.uf))
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Extrai só o nome da cidade da subseção ("Bacabal/MA" → "Bacabal"). */
export function nomeSubsecaoSemUf(subsecaoUf: string): string {
  const s = String(subsecaoUf || '').trim()
  const i = s.indexOf('/')
  return i >= 0 ? s.slice(0, i).trim() : s
}
