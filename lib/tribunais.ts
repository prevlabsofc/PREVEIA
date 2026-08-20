export interface TribunalPortal {
  sigla: string
  nome: string
  url: string
}

/**
 * Portais oficiais dos 5 principais tribunais usados no "Acesso rápido"
 * de /processos. Mantido separado do mapeamento de deep-links por número
 * de processo (usado na busca/seleção de tribunal), pois aqui o link é
 * sempre para a página inicial do portal.
 */
export const TRIBUNAIS_PRINCIPAIS: TribunalPortal[] = [
  { sigla: 'STF', nome: 'Supremo Tribunal Federal', url: 'https://portal.stf.jus.br' },
  { sigla: 'STJ', nome: 'Superior Tribunal de Justiça', url: 'https://www.stj.jus.br' },
  { sigla: 'TRF1', nome: 'Tribunal Regional Federal da 1ª Região', url: 'https://www.trf1.jus.br' },
  { sigla: 'TRF2', nome: 'Tribunal Regional Federal da 2ª Região', url: 'https://www.trf2.jus.br' },
  { sigla: 'TRF3', nome: 'Tribunal Regional Federal da 3ª Região', url: 'https://www.trf3.jus.br' },
]
