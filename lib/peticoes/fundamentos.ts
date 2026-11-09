/**
 * Trechos fixos de fundamentação jurídica — Salário-Maternidade / segurado especial.
 * Centralizados aqui para reuso no prompt e no template; NÃO alterar o texto sem revisão jurídica.
 */

/** STF — ADIs 2.110 e 2.111 (julgamento 28/03/2024). */
export const FUND_ADI_2110_2111 =
  'O STF, nas ADIs 2110 e 2111 (28/03/2024), reafirmou a proteção à maternidade.'

/**
 * STJ Tema 533 — prova material contemporânea pode ser complementada por prova testemunhal.
 * Texto alinhado ao uso atual nas peças SM rural.
 */
export const FUND_TEMA_533_STJ =
  'A jurisprudência do STJ, dos TRFs e da TNU é firme no sentido de que a prova material contemporânea, ainda que escassa, pode ser complementada por prova testemunhal.'

/** Bloco combinado usado na fundamentação padrão. */
export const FUND_SM_RURAL_PRECEDENTES = `${FUND_ADI_2110_2111}

${FUND_TEMA_533_STJ}`

/**
 * Endereço de citação da Procuradoria Federal Especializada junto ao INSS.
 * Padrão em BRANCO até o revisor jurídico informar o endereço oficial.
 * Editável em /configuracoes (lawyers.endereco_citacao_inss).
 */
export const ENDERECO_CITACAO_INSS_PADRAO = ''

/** Redação curta (sem endereço) — usada quando o campo de citação está vazio. */
export const CITACAO_INSS_SEM_ENDERECO =
  'a ser citado na pessoa de seu representante legal, por meio da Procuradoria Federal'

/**
 * Monta o trecho de citação do INSS.
 * Com endereço: Procuradoria Federal Especializada + art. 17 da Lei 10.259/2001.
 * Sem endereço: redação neutra atual (não inventa postal/e-mail).
 */
export function textoCitacaoInss(endereco?: string | null): string {
  const end = String(endereco ?? ENDERECO_CITACAO_INSS_PADRAO).trim()
  if (!end) return CITACAO_INSS_SEM_ENDERECO
  return (
    'a ser citado na pessoa de seu representante legal, por meio da Procuradoria ' +
    `Federal Especializada junto ao INSS, com endereço em ${end}, ` +
    'nos termos do art. 17 da Lei nº 10.259/2001'
  )
}
