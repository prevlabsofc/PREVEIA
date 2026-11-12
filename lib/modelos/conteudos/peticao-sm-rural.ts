/**
 * CONTEÚDO-BASE — Petição de salário-maternidade rural
 *
 * ⏳ AGUARDANDO TEXTO DO FERNANDO
 * Substitua apenas a string abaixo quando o modelo oficial chegar.
 * Não é necessário alterar código de UI, variáveis ou geração.
 *
 * Variáveis no formato {{snake_case}}. Lista canônica: lib/modelos/variaveis.ts
 */

export const CONTEUDO_PETICAO_SM_RURAL = `
EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE {{comarca}}

{{nome_cliente}}, brasileiro(a), portador(a) do CPF nº {{cpf_cliente}}, RG {{rg_cliente}}, nascido(a) em {{data_nascimento}}, residente e domiciliado(a) em {{endereco_cliente}}, por seu(sua) advogado(a) que esta subscreve, vem, respeitosamente, à presença de Vossa Excelência propor a presente

AÇÃO PREVIDENCIÁRIA — {{beneficio}}

em face do INSTITUTO NACIONAL DO SEGURO SOCIAL — INSS, pelos fatos e fundamentos a seguir expostos.

I — DOS FATOS

O(A) Autor(a), {{nome_cliente}}, CPF {{cpf_cliente}}, requer a concessão do benefício de {{beneficio}}.

Data do parto / nascimento da criança: {{data_parto}}.

Motivo do indeferimento administrativo: {{motivo_indeferimento}}.

[Descreva aqui o histórico administrativo, o NB, as provas da atividade rural e demais fatos do caso.]

II — DO DIREITO

O direito invocado encontra amparo na Constituição Federal, na Lei nº 8.213/91 e na legislação previdenciária aplicável, bem como na jurisprudência consolidada dos Tribunais.

[Inclua aqui os fundamentos jurídicos específicos do salário-maternidade rural.]

III — DOS PEDIDOS

Diante do exposto, requer:

a) A citação do INSS, na forma da lei, para, querendo, contestar a presente ação;
b) A procedência do pedido, com a concessão do benefício de {{beneficio}};
c) A condenação do réu ao pagamento das parcelas vencidas e vincendas, com juros e correção monetária;
d) A condenação do réu ao pagamento de honorários advocatícios e custas processuais;
e) A produção de todas as provas em direito admitidas, especialmente documental e testemunhal.

Dá-se à causa o valor de {{valor_causa}}.

Termos em que pede deferimento.

{{comarca}}, {{data_hoje}}.


_________________________________
{{nome_advogado}}
OAB {{oab}}
{{nome_escritorio}}
`.trim()
