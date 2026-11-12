/**
 * Constantes legais centralizadas — Salário-Maternidade e demais peças.
 *
 * EDITÁVEL pelo advogado: valide descrições e textos dos artigos antes de produção.
 * A IA SÓ PODE CITAR o que estiver listado em `REFERENCIAS_LEGAIS` (via
 * `CITACOES_PERMITIDAS_SM` / prompt). Nunca invente lei, artigo ou jurisprudência.
 *
 * Fonte SM rural detalhada: `lib/peticoes/referencias-legais-sm.ts`
 * (tese de carência, ADIs, Tema 533).
 */

export type ReferenciaLegal = {
  /** Identificador estável para apontar argumento ↔ dispositivo. */
  id: string
  /** Forma de citação forense (inline na peça). */
  citacao: string
  /** Para que serve / em qual argumento usar. */
  descricao: string
  /** Texto/resumo do dispositivo — validar juridicamente; não é transcrição oficial. */
  texto: string
  /**
   * Se true, só pode fundamentar tese de carência em salário-maternidade rural
   * com indeferimento por falta de carência. NÃO usar em aposentadoria, BPC etc.
   */
  soTeseCarenciaSmRural?: boolean
}

/**
 * Catálogo fechado. Acrescente linhas novas aqui (e nas listas do prompt)
 * quando o Fernando/advogado validar novos dispositivos.
 */
export const REFERENCIAS_LEGAIS: readonly ReferenciaLegal[] = [
  {
    id: 'lei-8213-art-71',
    citacao: 'art. 71 da Lei nº 8.213/1991',
    descricao: 'Salário-maternidade — direito ao benefício e período de 120 dias.',
    texto:
      'O salário-maternidade é devido à segurada da Previdência Social, durante 120 dias, com início no período entre 28 dias antes do parto e a data de ocorrência deste.',
  },
  {
    id: 'lei-8213-art-39-pu',
    citacao: 'art. 39, parágrafo único, da Lei nº 8.213/1991',
    descricao: 'Segurado especial — salário-maternidade no valor de 1 salário mínimo.',
    texto:
      'Para o segurado especial fica garantida a concessão de salário-maternidade no valor de 1 (um) salário mínimo, desde que comprove o exercício de atividade rural, ainda que de forma descontínua, no período imediatamente anterior ao do requerimento do benefício.',
  },
  {
    id: 'cf-art-7-xviii',
    citacao: 'art. 7º, XVIII, da Constituição Federal de 1988',
    descricao: 'Proteção constitucional à maternidade (licença à gestante).',
    texto:
      'São direitos dos trabalhadores urbanos e rurais, além de outros que visem à melhoria de sua condição social: XVIII — licença à gestante, sem prejuízo do emprego e do salário, com a duração de cento e vinte dias.',
  },
  {
    id: 'lei-8213-art-38b-p2',
    citacao: 'art. 38-B, § 2º, da Lei nº 8.213/1991',
    descricao: 'Autodeclaração de segurado especial.',
    texto:
      'A autodeclaração de segurado especial, quando apresentada, integra o conjunto probatório da qualidade de segurado especial, nos termos da legislação.',
  },
  {
    id: 'lei-10259-art-17',
    citacao: 'art. 17 da Lei nº 10.259/2001',
    descricao: 'Citação do INSS no JEF — Procuradoria Federal.',
    texto:
      'A citação do Instituto Nacional do Seguro Social — INSS far-se-á na pessoa do Procurador-Chefe ou do Procurador Federal que oficiar junto ao Juizado, com a remessa dos autos ou de peças necessárias.',
  },
  {
    id: 'ec-113-art-3',
    citacao: 'art. 3º da Emenda Constitucional nº 113/2021',
    descricao: 'Atualização monetária / SELIC a partir de dezembro/2021.',
    texto:
      'Nas discussões e nas condenações que envolvam a Fazenda Pública, independentemente de sua natureza e para fins de atualização monetária, de remuneração do capital e de compensação da mora, inclusive do precatório, haverá a incidência, uma única vez, até o efetivo pagamento, do índice da taxa referencial do Sistema Especial de Liquidação e de Custódia (Selic), acumulado mensalmente.',
  },
  {
    id: 'cf-art-5-lxxiv',
    citacao: 'art. 5º, LXXIV, da Constituição Federal de 1988',
    descricao: 'Assistência jurídica integral e gratuita — fundamenta justiça gratuita.',
    texto:
      'O Estado prestará assistência jurídica integral e gratuita aos que comprovarem insuficiência de recursos.',
  },
  {
    id: 'lei-1060',
    citacao: 'Lei nº 1.060/1950',
    descricao: 'Assistência judiciária — gratuidade da justiça.',
    texto:
      'Assegura os benefícios da assistência judiciária aos necessitados, nos termos da lei.',
  },
  {
    id: 'stf-adi-2110-2111',
    citacao: 'STF, ADIs 2.110 e 2.111, julgamento em 28/03/2024',
    descricao:
      'Proteção à maternidade no RGPS. Base da TESE DE CARÊNCIA apenas em SM rural com indeferimento por falta de carência — não usar em outros benefícios.',
    texto:
      'O STF, nas ADIs 2.110 e 2.111 (julgamento em 28/03/2024), reafirmou a proteção constitucional à maternidade no âmbito previdenciário. Em SM rural com indeferimento por carência: a exigência rígida de comprovação de labor rural no período imediatamente anterior, como obstáculo de carência, não se sustenta da mesma forma após o julgamento; a trabalhadora não precisa provar que “estará” laborando como condição de carência.',
    soTeseCarenciaSmRural: true,
  },
  {
    id: 'stj-tema-533',
    citacao: 'STJ, Tema 533',
    descricao: 'Prova material contemporânea complementável por prova testemunhal.',
    texto:
      'A jurisprudência do STJ (Tema 533), dos TRFs e da TNU é firme no sentido de que a prova material contemporânea, ainda que escassa, pode ser complementada por prova testemunhal.',
  },
  {
    id: 'cpc-art-272-p5',
    citacao: 'art. 272, § 5º, do CPC',
    descricao: 'Intimações em nome dos advogados constituídos.',
    texto:
      'Constando dos autos pedido expresso para que as comunicações dos atos processuais sejam feitas em nome dos advogados indicados, o pedido prevalecerá.',
  },
  {
    id: 'manual-calculos-jf',
    citacao: 'Manual de Cálculos da Justiça Federal',
    descricao: 'Critérios de atualização das parcelas devidas.',
    texto:
      'Atualização dos valores devidos conforme Manual de Cálculos da Justiça Federal, com SELIC a partir de dezembro/2021 (EC 113/2021).',
  },
]

/** Lista fechada de citações (anti-alucinação no prompt). */
export const CITACOES_PERMITIDAS: readonly string[] = REFERENCIAS_LEGAIS.map(
  (r) => r.citacao,
)

export function buscarReferencia(id: string): ReferenciaLegal | undefined {
  return REFERENCIAS_LEGAIS.find((r) => r.id === id)
}

export function textoPromptCitacoesPermitidas(): string {
  return REFERENCIAS_LEGAIS.map(
    (r) =>
      `- ${r.citacao}\n  Uso: ${r.descricao}${r.soTeseCarenciaSmRural ? ' [SOMENTE tese carência SM rural]' : ''}`,
  ).join('\n')
}

/**
 * Tese de carência / helpers SM: importe de `@/lib/peticoes/referencias-legais-sm`
 * (evita import circular com este catálogo).
 */
