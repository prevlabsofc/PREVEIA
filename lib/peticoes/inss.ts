/**
 * Dados fixos de qualificação do INSS na petição.
 * EDITÁVEL pelo revisor jurídico — preencha CNPJ e endereço reais antes de produção.
 * Não coloque esses valores no prompt da IA; o pós-processamento injeta o texto abaixo.
 */

/** Razão social oficial (sem a sigla). */
export const INSS_RAZAO_SOCIAL = 'Instituto Nacional do Seguro Social'

/** Sigla — sempre em negrito na peça renderizada. */
export const INSS_SIGLA = 'INSS'

/**
 * CNPJ do INSS (formato 00.000.000/0000-00).
 * Deixe vazio até validar o número oficial; a peça exibirá o placeholder.
 */
export const INSS_CNPJ = ''

/** Cidade/UF da sede (Brasília/DF). */
export const INSS_SEDE_CIDADE = 'Brasília'
export const INSS_SEDE_UF = 'DF'

/**
 * Endereço completo da sede em Brasília.
 * Preencher com o endereço oficial (logradouro, nº, bairro, CEP).
 */
export const INSS_ENDERECO_SEDE = ''

/** Representação processual padrão. */
export const INSS_REPRESENTACAO = 'Procuradoria Federal'

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
 * Sem endereço: redação neutra (não inventa postal/e-mail).
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

function campoOuPlaceholder(valor: string, rotulo: string): string {
  const v = String(valor || '').trim()
  return v || `[${rotulo} — preencher em lib/peticoes/inss.ts]`
}

/**
 * Parágrafo fixo "Em face do INSS…" para <<<EM_FACE>>>.
 * CNPJ/endereço vêm das constantes acima; citação usa o endereço configurável
 * do escritório (lawyers.endereco_citacao_inss) quando houver.
 */
export function textoQualificacaoInssFixa(enderecoCitacao?: string | null): string {
  const cnpj = campoOuPlaceholder(INSS_CNPJ, 'CNPJ do INSS')
  const endSede = campoOuPlaceholder(INSS_ENDERECO_SEDE, 'endereço da sede do INSS')
  const sede = `${INSS_SEDE_CIDADE}/${INSS_SEDE_UF}`
  const citacao = textoCitacaoInss(enderecoCitacao)
  return (
    `Em face do ${INSS_RAZAO_SOCIAL.toUpperCase()} – ${INSS_SIGLA}, ` +
    `autarquia federal, com sede em ${sede}, inscrito no CNPJ sob o nº ${cnpj}, ` +
    `com endereço em ${endSede}, ${citacao}, representada pela ${INSS_REPRESENTACAO}.`
  )
}
