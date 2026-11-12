/**
 * Trechos fixos de fundamentação jurídica — Salário-Maternidade / segurado especial.
 * Fonte canônica das ADIs/Tema e da tese de carência:
 * `lib/peticoes/referencias-legais-sm.ts` (edite lá).
 * Qualificação do INSS: `lib/peticoes/inss.ts`.
 */

export {
  FUND_ADI_2110_2111,
  FUND_TEMA_533_STJ,
  TESE_CARENCIA_SM_RURAL,
  motivoIndeferimentoEhCarencia,
  CITACOES_PERMITIDAS_SM,
  REF_SM_ART_71,
  REF_SM_ART_39_PU,
  REF_SM_CF_7_XVIII,
  REF_SM_ADI_2110_2111,
} from '@/lib/peticoes/referencias-legais-sm'

import { FUND_ADI_2110_2111, FUND_TEMA_533_STJ } from '@/lib/peticoes/referencias-legais-sm'

/** Bloco combinado usado na fundamentação padrão (sem a tese de carência). */
export const FUND_SM_RURAL_PRECEDENTES = `${FUND_ADI_2110_2111}

${FUND_TEMA_533_STJ}`

export {
  ENDERECO_CITACAO_INSS_PADRAO,
  CITACAO_INSS_SEM_ENDERECO,
  textoCitacaoInss,
  INSS_CNPJ,
  INSS_ENDERECO_SEDE,
  INSS_RAZAO_SOCIAL,
  INSS_SEDE_CIDADE,
  INSS_SEDE_UF,
  INSS_SIGLA,
  textoQualificacaoInssFixa,
} from '@/lib/peticoes/inss'
