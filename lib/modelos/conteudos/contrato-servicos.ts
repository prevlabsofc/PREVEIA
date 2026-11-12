/**
 * CONTEÚDO-BASE — Contrato de prestação de serviços advocatícios
 *
 * ⏳ AGUARDANDO TEXTO DO FERNANDO
 * Substitua apenas a string abaixo quando o modelo oficial chegar.
 * Não é necessário alterar código de UI, variáveis ou geração.
 *
 * Variáveis no formato {{snake_case}}. Lista canônica: lib/modelos/variaveis.ts
 */

export const CONTEUDO_CONTRATO_SERVICOS = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

Pelo presente instrumento particular, de um lado:

CONTRATADO: {{nome_advogado}}, inscrito(a) na OAB sob o nº {{oab}}, atuando em {{nome_escritorio}}, doravante denominado(a) ADVOGADO(A);

e de outro lado:

CONTRATANTE: {{nome_cliente}}, portador(a) do CPF nº {{cpf_cliente}}, residente e domiciliado(a) em {{endereco_cliente}}, doravante denominado(a) CLIENTE;

têm entre si justo e contratado o seguinte:

CLÁUSULA 1ª — DO OBJETO

O presente contrato tem por objeto {{objeto_contrato}}, abrangendo análise do caso, orientação jurídica, elaboração de peças e acompanhamento dos atos necessários ao bom andamento da demanda, nos limites deste instrumento.

CLÁUSULA 2ª — DAS OBRIGAÇÕES DO ADVOGADO

O(A) Advogado(a) obriga-se a:
a) Empregar a diligência técnica adequada na condução do mandato;
b) Manter o(a) Cliente informado(a) sobre o andamento do caso;
c) Guardar sigilo profissional, nos termos do Estatuto da OAB e do Código de Ética;
d) Atuar com lealdade processual e independência.

CLÁUSULA 3ª — DAS OBRIGAÇÕES DO CLIENTE

O(A) Cliente obriga-se a:
a) Fornecer informações e documentos verdadeiros e completos;
b) Comparecer aos atos que dependam de sua presença, quando intimado(a);
c) Comunicar prontamente qualquer alteração de endereço, telefone ou e-mail;
d) Cumprir as obrigações financeiras previstas neste contrato ou em instrumento de honorários vinculado.

CLÁUSULA 4ª — DO PRAZO

O prazo estimado para a prestação dos serviços é de {{prazo}}, podendo ser prorrogado conforme a complexidade da causa e a marcha processual.

CLÁUSULA 5ª — DOS HONORÁRIOS

Os honorários advocatícios serão definidos em instrumento próprio de contrato de honorários e/ou conforme a cláusula abaixo:

{{clausula_honorarios}}

CLÁUSULA 6ª — DA RESCISÃO

O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação escrita, observando-se o Estatuto da OAB quanto à renúncia ou revogação do mandato e à eventual remuneração proporcional pelos serviços já prestados.

CLÁUSULA 7ª — DAS DISPOSIÇÕES GERAIS

As partes elegem o foro da comarca de {{comarca}} para dirimir quaisquer controvérsias oriundas deste contrato.

Observações: {{observacoes}}

E, por estarem assim justos e contratados, firmam o presente em duas vias de igual teor.

{{data_contrato}}


_________________________________          _________________________________
{{nome_advogado}}                          {{nome_cliente}}
OAB {{oab}}                                CPF {{cpf_cliente}}
ADVOGADO(A)                                CLIENTE
`.trim()
