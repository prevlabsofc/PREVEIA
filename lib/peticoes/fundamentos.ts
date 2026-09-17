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
