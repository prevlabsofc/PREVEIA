/**
 * Referências legais e trechos de fundamentação — Salário-Maternidade (segurada especial).
 *
 * EDITÁVEL: valide e corrija aqui (e o catálogo completo em `lib/legal/referencias.ts`,
 * com descrição + texto do artigo). A IA só pode citar o que estiver listado.
 * Nunca invente lei/jurisprudência.
 *
 * Escopo da tese de carência: SOMENTE salário-maternidade com indeferimento por falta de
 * carência (ação direta). Não usar em aposentadoria, BPC, pensão etc.
 *
 * Argumento ↔ dispositivo (tese de carência):
 * - Direito ao SM segurada especial → REF_SM_ART_71 + REF_SM_ART_39_PU + REF_SM_CF_7_XVIII
 * - Afastamento do indeferimento por carência pós-2024 → REF_SM_ADI_2110_2111 + TESE_CARENCIA_SM_RURAL
 * - Prova material + testemunhal → REF_SM_TEMA_533_STJ
 */

import { REFERENCIAS_LEGAIS } from '@/lib/legal/referencias'

function citacaoDoCatalogo(id: string, fallback: string): string {
  return REFERENCIAS_LEGAIS.find((r) => r.id === id)?.citacao ?? fallback
}

/** Normas base do benefício (citações inline) — alinhadas ao catálogo. */
export const REF_SM_ART_71 = citacaoDoCatalogo(
  'lei-8213-art-71',
  'art. 71 da Lei nº 8.213/1991',
)
export const REF_SM_ART_39_PU = citacaoDoCatalogo(
  'lei-8213-art-39-pu',
  'art. 39, parágrafo único, da Lei nº 8.213/1991',
)
export const REF_SM_CF_7_XVIII = citacaoDoCatalogo(
  'cf-art-7-xviii',
  'art. 7º, XVIII, da Constituição Federal de 1988',
)
export const REF_SM_ART_38B = citacaoDoCatalogo(
  'lei-8213-art-38b-p2',
  'art. 38-B, § 2º, da Lei nº 8.213/1991',
)
export const REF_SM_LEI_10259_ART_17 = citacaoDoCatalogo(
  'lei-10259-art-17',
  'art. 17 da Lei nº 10.259/2001',
)
export const REF_SM_EC_113_ART_3 = citacaoDoCatalogo(
  'ec-113-art-3',
  'art. 3º da Emenda Constitucional nº 113/2021',
)
export const REF_SM_CF_5_LXXIV = citacaoDoCatalogo(
  'cf-art-5-lxxiv',
  'art. 5º, LXXIV, da Constituição Federal de 1988',
)
export const REF_SM_LEI_1060 = citacaoDoCatalogo(
  'lei-1060',
  'Lei nº 1.060/1950',
)

/** STF — ADIs 2.110 e 2.111 (julgamento 28/03/2024). */
export const REF_SM_ADI_2110_2111 = citacaoDoCatalogo(
  'stf-adi-2110-2111',
  'STF, ADIs 2.110 e 2.111, julgamento em 28/03/2024',
)

/**
 * Trecho fixo curto (proteção à maternidade) — pode constar em toda petição SM rural.
 * Revise o texto se quiser maior precisão dogmática.
 */
export const FUND_ADI_2110_2111 =
  REFERENCIAS_LEGAIS.find((r) => r.id === 'stf-adi-2110-2111')?.texto.split(
    ' Em SM rural',
  )[0] ||
  'O STF, nas ADIs 2.110 e 2.111 (julgamento em 28/03/2024), reafirmou a proteção constitucional à maternidade no âmbito previdenciário.'

/**
 * Tese de carência — SOMENTE quando o INSS indeferiu o salário-maternidade por falta de carência.
 * Ideia central (validar juridicamente): antes do julgamento das ADIs 2.110/2.111 (2024),
 * a comprovação de exercício de atividade rural no período anterior ao benefício era
 * exigida de forma rígida para fins de carência; após o entendimento do STF, essa
 * exigência não pode fundamentar o indeferimento do salário-maternidade da segurada
 * especial, nem se exige prova de que a trabalhadora “estará” laborando como condição
 * de carência.
 *
 * Dispositivos que sustentam este argumento:
 * - ${REF_SM_ART_71}, ${REF_SM_ART_39_PU}, ${REF_SM_CF_7_XVIII}
 * - ${REF_SM_ADI_2110_2111}
 */
export const TESE_CARENCIA_SM_RURAL = `No que tange à carência, o indeferimento administrativo não se sustenta. O salário-maternidade da segurada especial encontra amparo no ${REF_SM_ART_71} e no ${REF_SM_ART_39_PU}, bem como no ${REF_SM_CF_7_XVIII}.

Antes do julgamento das ADIs 2.110 e 2.111 pelo STF (28/03/2024), a Administração costumava exigir da trabalhadora rural a comprovação do exercício de atividade rural no período imediatamente anterior ao benefício, como se a carência pudesse obstar a proteção à maternidade. Após o referido julgamento, essa comprovação não pode ser exigida da mesma forma para indeferir o salário-maternidade: a carência não constitui motivo legítimo de negativa do benefício à segurada especial, tampouco se condiciona a proteção à prova de que a autora “estará” laborando.

Assim, o motivo de indeferimento por falta de carência deve ser afastado, com a concessão do salário-maternidade nos termos da lei e da orientação do ${REF_SM_ADI_2110_2111}.`

/**
 * STJ Tema 533 — prova material contemporânea complementável por prova testemunhal.
 */
export const FUND_TEMA_533_STJ =
  REFERENCIAS_LEGAIS.find((r) => r.id === 'stj-tema-533')?.texto ||
  'A jurisprudência do STJ (Tema 533), dos TRFs e da TNU é firme no sentido de que a prova material contemporânea, ainda que escassa, pode ser complementada por prova testemunhal.'

export const REF_SM_TEMA_533_STJ = citacaoDoCatalogo(
  'stj-tema-533',
  'STJ, Tema 533',
)

/** Lista fechada de citações permitidas no prompt (anti-alucinação). */
export const CITACOES_PERMITIDAS_SM: readonly string[] = [
  REF_SM_ART_71,
  REF_SM_ART_39_PU,
  REF_SM_CF_7_XVIII,
  REF_SM_ART_38B,
  REF_SM_LEI_10259_ART_17,
  REF_SM_EC_113_ART_3,
  REF_SM_CF_5_LXXIV,
  REF_SM_LEI_1060,
  REF_SM_ADI_2110_2111,
  REF_SM_TEMA_533_STJ,
  citacaoDoCatalogo('cpc-art-272-p5', 'art. 272, § 5º, do CPC'),
  citacaoDoCatalogo('manual-calculos-jf', 'Manual de Cálculos da Justiça Federal'),
]

/**
 * Detecta se o motivo do indeferimento informado pelo INSS é falta de carência.
 * Usado para injetar a tese somente nesse cenário (ação direta de SM).
 */
export function motivoIndeferimentoEhCarencia(motivo: string | null | undefined): boolean {
  const raw = String(motivo || '').trim()
  if (!raw) return false
  const m = raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  return (
    /\bcarencia\b/.test(m) ||
    /periodo\s+de\s+carencia/.test(m) ||
    /falta\s+de\s+carencia/.test(m) ||
    /ausencia\s+de\s+carencia/.test(m) ||
    /nao\s+cumprimento\s+da\s+carencia/.test(m) ||
    /carencia\s+nao\s+cumprida/.test(m) ||
    /insuficien\w*\s+de\s+contribuic/.test(m) ||
    /falta\s+de\s+contribuic/.test(m) ||
    /ausencia\s+de\s+contribuic/.test(m)
  )
}
