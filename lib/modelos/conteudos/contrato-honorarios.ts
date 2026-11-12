/**
 * CONTEÚDO-BASE — Contrato de honorários advocatícios
 *
 * ⏳ AGUARDANDO TEXTO DO FERNANDO
 * Substitua apenas a string abaixo quando o modelo oficial chegar.
 * Não é necessário alterar código de UI, variáveis ou geração.
 *
 * Variáveis no formato {{snake_case}}. Lista canônica: lib/modelos/variaveis.ts
 */

export const CONTEUDO_CONTRATO_HONORARIOS = `
CONTRATO DE HONORÁRIOS ADVOCATÍCIOS

Pelo presente instrumento, de um lado:

ADVOGADO(A): {{nome_advogado}}, OAB {{oab}}, atuando junto a {{nome_escritorio}};

e de outro lado:

CLIENTE: {{nome_cliente}}, CPF nº {{cpf_cliente}}, residente em {{endereco_cliente}};

acordam o seguinte quanto aos honorários advocatícios:

CLÁUSULA 1ª — DO OBJETO

O(A) Cliente confere mandato ao(à) Advogado(a) para patrocinar a causa indicada, incluindo os serviços advocatícios necessários.

CLÁUSULA 2ª — DOS HONORÁRIOS

{{clausula_honorarios}}

Quando aplicável:
- Valor dos honorários: {{valor_honorarios}}
- Percentual de êxito: {{percentual_exito}}
- Forma de pagamento: {{forma_pagamento}}
- Prazo: {{prazo}}

Parágrafo único. Os honorários de sucumbência, quando deferidos judicialmente, pertencem ao(à) Advogado(a), nos termos do art. 23 do Estatuto da Advocacia (Lei nº 8.906/94), sem prejuízo do avençado entre as partes.

CLÁUSULA 3ª — DO PRAZO E CONDIÇÕES

O prazo estimado de tramitação/acompanhamento é de {{prazo}}. O inadimplemento das obrigações pecuniárias autoriza a adoção das medidas cabíveis, observando-se o Código de Ética e Disciplina da OAB.

CLÁUSULA 4ª — DAS OBRIGAÇÕES RECÍPROCAS

O(A) Advogado(a) prestará os serviços com zelo e ética. O(A) Cliente fornecerá documentação e informações necessárias e manterá seus dados de contato atualizados.

CLÁUSULA 5ª — DA RESCISÃO

Em caso de rescisão antecipada, serão devidos honorários proporcionais aos serviços efetivamente prestados até a data da comunicação, sem prejuízo de outras verbas legalmente cabíveis.

CLÁUSULA 6ª — DO FORO

Fica eleito o foro de {{comarca}} para dirimir dúvidas oriundas deste contrato.

{{data_contrato}}


_________________________________          _________________________________
{{nome_advogado}}                          {{nome_cliente}}
OAB {{oab}}                                CPF {{cpf_cliente}}
`.trim()
