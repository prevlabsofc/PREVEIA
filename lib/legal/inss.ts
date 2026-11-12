/**
 * Qualificação fixa do INSS — reexporta a fonte canônica editável.
 *
 * Preencha CNPJ e endereço reais em `lib/peticoes/inss.ts` antes de produção.
 * Não coloque esses valores no prompt da IA.
 */

export {
  INSS_RAZAO_SOCIAL,
  INSS_SIGLA,
  INSS_CNPJ,
  INSS_SEDE_CIDADE,
  INSS_SEDE_UF,
  INSS_ENDERECO_SEDE,
  INSS_REPRESENTACAO,
  ENDERECO_CITACAO_INSS_PADRAO,
  CITACAO_INSS_SEM_ENDERECO,
  textoCitacaoInss,
  textoQualificacaoInssFixa,
} from '@/lib/peticoes/inss'
