# Modelo-base — Petição de Salário-Maternidade Rural (Segurada Especial)

> **EDITÁVEL.** Aguardando os modelos oficiais do Fernando.
> Enquanto isso, este arquivo é o conteúdo-base estrutural que a IA deve respeitar.
> Substitua seções abaixo pelos textos validados do escritório — sem alterar os
> marcadores `<<<…>>>` usados pelo renderizador (`lib/peticao-sm-rural.ts`).
>
> Escopo da tese de carência: **somente** SM rural com indeferimento por falta de
> carência. Não aplicar a outros benefícios.
>
> Citações legais: apenas as de `lib/legal/referencias.ts` /
> `lib/peticoes/referencias-legais-sm.ts`.
>
> Qualificação do INSS: `lib/legal/inss.ts` (preencher CNPJ/endereço).
>
> Valor da causa: salário mínimo na data do parto (`lib/legal/salario-minimo.json`).

---

## Estrutura obrigatória da abertura

1. Qualificação completa da autora (nome, nacionalidade, estado civil, profissão, CPF, RG se houver, endereço).
2. Qualificação completa do réu (INSS — autarquia federal, sede Brasília/DF, CNPJ, endereço, Procuradoria Federal).
3. Nome da ação (exemplo):

   **AÇÃO ORDINÁRIA DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO — SALÁRIO-MATERNIDADE RURAL**

4. Resumo em 1–2 parágrafos do pedido e do motivo do indeferimento (atacar exatamente o motivo do INSS).

---

## Marcadores do sistema (não remover)

```
<<<SM_RURAL_V2>>>
<<<META>>> … <<<END_META>>>
<<<ENDERECO>>> … <<<END_ENDERECO>>>
<<<QUALIFICACAO>>> … <<<END_QUALIFICACAO>>>
<<<TITULO>>> … <<<SUBTITULO>>> … <<<END_TITULO>>>
<<<EM_FACE>>> … <<<END_EM_FACE>>>
<<<I_PRELIMINARES>>> … <<<END_I>>>
<<<II_QUADRO>>> … <<<END_II>>>
<<<III_SINTESE_ANTES>>> … <<<END_III_ANTES>>>
<<<TIMELINE>>> … <<<END_TIMELINE>>>
<<<III_SINTESE_DEPOIS>>> … <<<END_III_DEPOIS>>>
<<<IV_PROVAS>>> … <<<END_IV>>>
<<<IV_FECHO>>> … <<<END_IV_FECHO>>>
<<<V_FUNDAMENTACAO>>> … <<<END_V>>>
<<<VI_PEDIDOS>>> … <<<END_VI>>>
<<<FECHAMENTO>>> … <<<END_FECHAMENTO>>>
<<<PLANILHA>>> … <<<END_PLANILHA>>>
```

---

## Título sugerido (quando Fernando enviar o modelo definitivo, alinhar aqui)

AÇÃO ORDINÁRIA DE CONCESSÃO DE BENEFÍCIO PREVIDENCIÁRIO — SALÁRIO-MATERNIDADE RURAL

Subtítulo (feminino): (SEGURADA ESPECIAL – AGRICULTORA)

---

## Documentos a citar na fundamentação (se anexados)

- Certidão de Nascido Vivo com profissão da mãe constando como AGRICULTORA
- CadÚnico com endereço rural
- Espelho ou Relatório do Bolsa Família com endereço rural

Se nenhum estiver anexado, o editor exibe alerta amarelo (não inventar documentos).

---

## Placeholder — corpo do modelo Fernando

_[Cole aqui o texto-base validado pelo Fernando. Até lá, a IA segue o prompt em
`lib/agents.ts` + referências em `lib/legal/referencias.ts`.]_
