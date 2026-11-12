/**
 * Casos fictícios para validar a geração SM rural (sem chamar a IA).
 * 1) Carência + docs rurais anexados
 * 2) Falta de prova (sem tese de carência) + CadÚnico
 * 3) Sem docs-chave → deve acionar alerta amarelo
 */

import {
  FUND_ADI_2110_2111,
  FUND_TEMA_533_STJ,
  TESE_CARENCIA_SM_RURAL,
  textoQualificacaoInssFixa,
} from '@/lib/peticoes/fundamentos'
import { valorCausaSalarioMaternidade } from '@/lib/salario-minimo'

function montarFixture(opts: {
  nome: string
  motivoInss: string
  dataParto: string
  provas: string[]
  comTeseCarencia: boolean
}): string {
  const v = valorCausaSalarioMaternidade(opts.dataParto, {
    exigirDataDoFato: true,
  })
  const provasLinhas = opts.provas
    .map((p) => `✓ ${p}`)
    .join('\n')
  const fundExtra = opts.comTeseCarencia
    ? `\n\n${TESE_CARENCIA_SM_RURAL}`
    : '\n\nO ponto controvertido é a suficiência da prova material, não a carência.'

  return `<<<SM_RURAL_V2>>>
<<<META>>>
tipo_acao: SALÁRIO MATERNIDADE - SEGURADO ESPECIAL
juizo_digital: true
prioridade_idoso: false
prioridade_deficiente: false
prioridade_menor: false
<<<END_META>>>

<<<ENDERECO>>>
AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE SÃO LUÍS/MA
<<<END_ENDERECO>>>

<<<QUALIFICACAO>>>
${opts.nome}, brasileira, solteira, agricultora, nascida em 15/03/1995, portadora do CPF nº 529.982.247-25 e do RG nº 1234567 SSP/MA, residente e domiciliada na Estrada Vicinal km 3, s/n, Povoado Boa Esperança, zona rural, São Luís/MA, CEP 65000-000, por intermédio de seus procuradores, vem, respeitosamente, à presença de Vossa Excelência, propor a presente
<<<END_QUALIFICACAO>>>

<<<TITULO>>>
AÇÃO ORDINÁRIA DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO — SALÁRIO-MATERNIDADE RURAL
<<<SUBTITULO>>>
(SEGURADA ESPECIAL – AGRICULTORA)
<<<END_TITULO>>>

<<<EM_FACE>>>
${textoQualificacaoInssFixa()}
<<<END_EM_FACE>>>

<<<I_PRELIMINARES>>>
DA GRATUIDADE DA JUSTIÇA:
A autora declara hipossuficiência nos termos do art. 5º, LXXIV, da Constituição Federal de 1988 e da Lei nº 1.060/1950, requerendo os benefícios da justiça gratuita.
<<<END_I>>>

<<<II_QUADRO>>>
| Campo | Valor |
| --- | --- |
| Nome | ${opts.nome} |
| Município/UF | São Luís/MA |
| Pedido | Salário-Maternidade – Segurado Especial |
| Criança | João Ferreira |
| Data de Nascimento | ${opts.dataParto} |
| Data do Req. Adm. | 20/02/2025 |
| NB | 123.456.789-0 |
| Situação/Decisão INSS | Indeferido |
| Data do Indef. Adm. | 15/03/2025 |
| Motivo INSS | ${opts.motivoInss} |
<<<END_II>>>

<<<III_SINTESE_ANTES>>>
${opts.nome} labora em regime de economia familiar na zona rural do município de São Luís/MA, dedicando-se à agricultura sem empregados permanentes.
<<<END_III_ANTES>>>

<<<TIMELINE>>>
{"nome":"${opts.nome}","atividade":"Agricultora","local":"São Luís/MA","estilo":"none","eventos":[]}
<<<END_TIMELINE>>>

<<<III_SINTESE_DEPOIS>>>
Em ${opts.dataParto} nasceu o filho da autora. Requereu administrativamente o salário-maternidade, indeferido pelo INSS sob o fundamento de "${opts.motivoInss}".
<<<END_III_DEPOIS>>>

<<<IV_PROVAS>>>
${provasLinhas}
✓ Autodeclaração de segurado especial (art. 38-B, §2º, Lei 8.213/91)
<<<END_IV>>>

<<<IV_FECHO>>>
As provas materiais, conjugadas com a prova testemunhal a ser produzida em audiência, comprovam o exercício de atividade rural em regime de economia familiar.
<<<END_IV_FECHO>>>

<<<V_FUNDAMENTACAO>>>
O salário-maternidade do segurado especial encontra amparo no art. 71 da Lei nº 8.213/1991 e no art. 39, parágrafo único, da Lei nº 8.213/1991, bem como no art. 7º, XVIII, da Constituição Federal de 1988.

${FUND_ADI_2110_2111}

${FUND_TEMA_533_STJ}${fundExtra}
<<<END_V>>>

<<<VI_PEDIDOS>>>
i. Que todas as comunicações processuais sejam feitas em nome dos advogados constituídos, nos termos do art. 272, § 5º, do CPC
ii. A procedência do pedido, com a concessão do salário-maternidade
iii. A averbação do período de atividade rural no CNIS
iv. A citação da ré e a juntada do processo administrativo NB
v. O pagamento de 120 dias de benefício, com atualização nos termos do Manual de Cálculos da Justiça Federal, com incidência da taxa SELIC a partir de dezembro/2021, conforme art. 3º da Emenda Constitucional nº 113/2021
vi. A designação de audiência UNA
vii. A concessão da justiça gratuita
viii. O destaque de honorários contratuais de 30% em favor do escritório
<<<END_VI>>>

<<<FECHAMENTO>>>
Protesta o alegado por todos os meios admitidos em direito.

Dá-se à causa o valor de ${v.totalFmt} (${v.total.toLocaleString('pt-BR')} reais), renunciando-se a eventual excedente da alçada do Juizado Especial Federal.

Termos em que, pede e espera deferimento.

ADVOGADO TESTE
OAB/MA nº 12345
<<<END_FECHAMENTO>>>

<<<PLANILHA>>>
| Campo | Valor |
| --- | --- |
| 1º Mês de benefício | ${v.mensalFmt} |
| 2º Mês de benefício | ${v.mensalFmt} |
| 3º Mês de benefício | ${v.mensalFmt} |
| 4º Mês de benefício | ${v.mensalFmt} |
| TOTAL | ${v.totalFmt} |
nota: ${v.nota}
<<<END_PLANILHA>>>
`
}

/** Caso 1 — indeferimento por carência + 3 docs-chave. */
export const FIXTURE_SM_CARENCIA_COM_DOCS = montarFixture({
  nome: 'Ana Lúcia Ferreira',
  motivoInss: 'Falta de período de carência',
  dataParto: '10/01/2025',
  comTeseCarencia: true,
  provas: [
    'Certidão de Nascido Vivo com profissão da mãe constando como AGRICULTORA',
    'CadÚnico com endereço rural',
    'Espelho ou Relatório do Bolsa Família com endereço rural',
  ],
})

/** Caso 2 — indeferimento por prova; só CadÚnico. */
export const FIXTURE_SM_PROVA_COM_CADUNICO = montarFixture({
  nome: 'Maria das Dores Silva',
  motivoInss: 'Insuficiência de prova material de atividade rural',
  dataParto: '15/06/2023',
  comTeseCarencia: false,
  provas: ['CadÚnico com endereço rural', 'Declaração de sindicato rural'],
})

/** Caso 3 — sem docs-chave (alerta amarelo esperado). */
export const FIXTURE_SM_SEM_DOCS_CHAVE = montarFixture({
  nome: 'Francisca Lima Souza',
  motivoInss: 'Ausência de qualidade de segurado especial',
  dataParto: '01/03/2024',
  comTeseCarencia: false,
  provas: ['Fotos de atividade agrícola', 'Testemunhas disponíveis'],
})

export const CASOS_TESTE_SM = [
  {
    id: 'carencia-com-docs',
    texto: FIXTURE_SM_CARENCIA_COM_DOCS,
    motivo: 'Falta de período de carência',
    dataParto: '10/01/2025',
    provas: [
      'Certidão de Nascido Vivo com profissão da mãe constando como AGRICULTORA',
      'CadÚnico com endereço rural',
      'Espelho ou Relatório do Bolsa Família com endereço rural',
    ],
    esperaTeseCarencia: true,
    esperaAlerta: false,
    smEsperado: 1518,
  },
  {
    id: 'prova-com-cadunico',
    texto: FIXTURE_SM_PROVA_COM_CADUNICO,
    motivo: 'Insuficiência de prova material de atividade rural',
    dataParto: '15/06/2023',
    provas: ['CadÚnico com endereço rural', 'Declaração de sindicato rural'],
    esperaTeseCarencia: false,
    esperaAlerta: false,
    smEsperado: 1320,
  },
  {
    id: 'sem-docs-chave',
    texto: FIXTURE_SM_SEM_DOCS_CHAVE,
    motivo: 'Ausência de qualidade de segurado especial',
    dataParto: '01/03/2024',
    provas: ['Fotos de atividade agrícola', 'Testemunhas disponíveis'],
    esperaTeseCarencia: false,
    esperaAlerta: true,
    smEsperado: 1412,
  },
] as const
