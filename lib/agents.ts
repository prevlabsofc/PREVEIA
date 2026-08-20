import {
  formatarLocalData,
  resolverLocalAdvogado,
} from '@/lib/peticao-export'

export function getSystemPrompt(agentType: string, adv: any, cli: any): string {
  const local = resolverLocalAdvogado(adv)
  const exemploLocalData = formatarLocalData(adv)
  const cidadeUfInstrucao = local.cidade
    ? `use exatamente "${local.localFormatado}" (nunca omita a cidade; nunca escreva só "/${local.uf}" ou só "${local.uf}")`
    : local.uf
      ? `a cidade do escritório não está cadastrada — use apenas "${local.uf}" (ex.: "${local.uf}, 16 de julho de 2025"), NUNCA escreva "/${local.uf}" nem "undefined/${local.uf}"`
      : 'use [Cidade]/[UF] apenas se os dados forem conhecidos; não invente cidade'

  const advDados = `
DADOS DO ADVOGADO (use obrigatoriamente no cabeçalho e pedidos):
  Nome: ${adv?.name || ''}
  OAB: ${adv?.oab_number || ''}/${adv?.oab_uf || ''}
  Email: ${adv?.email || ''}
  WhatsApp: ${adv?.whatsapp || ''}
  Cidade: ${local.cidade || '(não cadastrada)'}
  UF: ${local.uf || ''}
  Local formatado: ${local.localFormatado || '(incompleto)'}
  Exemplo de linha de local/data: ${exemploLocalData}
  Vara: ${adv?.vara_padrao || ''}
  Honorários: ${adv?.honorarios_pct ?? ''}%

LOCAL/DATA E COMARCA:
  - ${cidadeUfInstrucao}
  - Formato da linha de assinatura: "${local.localFormatado || '[Cidade]/[UF]'}, [data por extenso]."
  - Na comarca: "COMARCA DE ${local.localFormatado || '[Cidade]/[UF]'}"`

  const prompts: Record<string, string> = {
    'salario-maternidade-rural': advDados + PROMPT_SAL_MAT_RURAL,
  }

  const base =
    prompts[agentType] ??
    advDados + '\nGere o documento solicitado de forma profissional e completa.'

  // SM rural usa marcadores <<<SM_RURAL_V2>>> — hierarquia genérica conflitante
  if (agentType === 'salario-maternidade-rural') {
    return base + REGRAS_CITACOES
  }

  return base + REGRAS_HIERARQUIA + REGRAS_CITACOES
}

/**
 * Peças processuais são documentos formais protocolados em juízo e exportados em
 * PDF/DOCX: uma seção "Fontes e Referências" com links de portais seria imprópria.
 * As citações permanecem no corpo da fundamentação, na forma forense usual.
 */
const REGRAS_CITACOES = `

CITAÇÃO DE FONTES:
- NÃO acrescente seção "Fontes e Referências", lista de links, URLs ou bibliografia ao final da peça.
- Cite a legislação e a jurisprudência de forma inline na fundamentação, no padrão forense:
  "art. 71 da Lei nº 8.213/1991", "art. 7º, XVIII, da CF/88", "Súmula nº 41 da TNU",
  "STF, ADI 2.110/DF, Rel. Min. ..., j. 28/03/2024", "STJ, REsp nº 1.354.908/SP, Tema 692".
- Cite apenas normas e precedentes reais e pertinentes; nunca invente número de lei, súmula, tema ou acórdão.`

const REGRAS_HIERARQUIA = `

HIERARQUIA DE TÍTULOS (obrigatória — use markdown leve só nos títulos):
- Seção principal: ## I — PRELIMINARMENTE
- Subitem: ### 1.1 Da Gratuidade da Justiça
- Sub-subitem (se necessário): #### 1.1.1 ...
- NUNCA repita o título da seção pai como se fosse também um subitem.
  ERRADO:
    ## 1. PRELIMINARMENTE
    ### 1. PRELIMINARMENTE
    ### 1.1 Da Gratuidade
  ERRADO:
    ## I — PRELIMINARMENTE
    I — PRELIMINARMENTE
    ### 1.1 Da Gratuidade
  CORRETO:
    ## I — PRELIMINARMENTE
    ### 1.1 Da Gratuidade da Justiça
    (texto do subitem)
    ### 1.2 Da Tutela de Urgência
    (texto do subitem)
- Não funda seção e subitem no mesmo título (evite "PRELIMINARMENTE / DA GRATUIDADE" como único ##).

FECHAMENTO (nesta ordem, sem títulos extras):
Nestes termos,
Pede deferimento.

[Cidade]/[UF], [data por extenso].

[Nome do advogado]
OAB/[UF] nº [número]`

const PROMPT_SAL_MAT_RURAL = `
Você é um advogado previdenciarista especializado com 20 anos de experiência.
Gere uma PETIÇÃO INICIAL COMPLETA para Salário-Maternidade — Segurada Especial no JEF.

FORMATO OBRIGATÓRIO (PRIORIDADE MÁXIMA — sobrescreve as regras genéricas de hierarquia/fechamento abaixo):
A saída DEVE começar com <<<SM_RURAL_V2>>> e usar EXATAMENTE os marcadores abaixo, nesta ordem.
NÃO use markdown ## / ### fora desses blocos. NÃO invente seções extras.
O sistema renderiza o PDF no layout Custódio Advogados (6 páginas) a partir desses marcadores.

<<<SM_RURAL_V2>>>
<<<META>>>
tipo_acao: SALÁRIO MATERNIDADE - SEGURADO ESPECIAL
juizo_digital: true
prioridade_idoso: false
prioridade_deficiente: false
prioridade_menor: false
<<<END_META>>>

<<<ENDERECO>>>
AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE [Cidade]/[UF]
<<<END_ENDERECO>>>

<<<QUALIFICACAO>>>
[Parágrafo corrido completo com nome, profissão, data de nascimento, idade, RG, CPF, endereço, menção aos procuradores e fundamento legal, TERMINANDO exatamente com as palavras: propor a presente]
<<<END_QUALIFICACAO>>>

<<<TITULO>>>
AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE
<<<SUBTITULO>>>
(SEGURADA ESPECIAL – AGRICULTORA)
<<<END_TITULO>>>

<<<EM_FACE>>>
[Parágrafo "Em face do INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS..." com endereço de citação na comarca]
<<<END_EM_FACE>>>

<<<I_PRELIMINARES>>>
DA GRATUIDADE DA JUSTIÇA:
[Parágrafo da gratuidade — art. 5º, LXXIV, CF/88 e Lei 1.060/50]
<<<END_I>>>

<<<II_QUADRO>>>
| Campo | Valor |
| --- | --- |
| Nome | [nome] |
| Idade no Req. Adm. | [idade] |
| Pedido | Salário-Maternidade – Segurado Especial |
| Criança | [nome da criança] |
| Data de Nascimento | [dd/mm/aaaa] |
| Data do Req. Adm. | [dd/mm/aaaa] |
| NB | [número] |
| Situação/Decisão INSS | [Indeferido/etc.] |
| Data do Indef. Adm. | [dd/mm/aaaa] |
| Motivo INSS | [motivo] |
| Tempo de trabalho antes do parto | [texto] |
| Período de Segurado Especial declarado | [texto] |
| Ponto controvertido | [texto] |
| Benefício anterior | [texto ou Não consta] |
| Período averbado no CNIS | [texto ou Não consta] |
| Vínculo urbano | [texto] |
<<<END_II>>>

<<<III_SINTESE_ANTES>>>
[2–3 parágrafos narrativos sobre a autora, atividade rural e economia familiar]
[Último parágrafo deve terminar com: A seguir, a linha do tempo de sua trajetória de vida e trabalho rural:]
<<<END_III_ANTES>>>

<<<TIMELINE>>>
{"nome":"[NOME DA AUTORA]","atividade":"Agricultora","local":"[Cidade]/[UF]","estilo":"horizontal","eventos":[{"data":"AAAA ou dd/mm/aaaa","titulo":"Evento curto","detalhe":"detalhe opcional"},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."}]}
<<<END_TIMELINE>>>

<<<III_SINTESE_DEPOIS>>>
[Parágrafos após a timeline: nascimento do filho, período gestacional, requerimento administrativo, indeferimento e crítica à decisão]
<<<END_III_DEPOIS>>>

<<<IV_PROVAS>>>
✓ [prova 1]
✓ [prova 2]
✓ [prova 3]
✓ [prova 4]
✓ [prova 5]
<<<END_IV>>>

<<<IV_FECHO>>>
[Parágrafo de fechamento da seção de provas — início de prova material + economia familiar + carência]
<<<END_IV_FECHO>>>

<<<V_FUNDAMENTACAO>>>
[4–6 parágrafos: art. 71 e art. 39 p.u. Lei 8.213/91; STF ADIs 2110 e 2111 (28/03/2024); CF/88 art. 7º, XVIII; STJ/TRFs; TNU; conclusão]
<<<END_V>>>

<<<VI_PEDIDOS>>>
i. [comunicações em nome dos advogados — art. 272, §5º, CPC]
ii. [procedência e concessão do salário-maternidade]
iii. [averbação no CNIS]
iv. [citação da ré + juntada do PA NB]
v. [pagamento de 120 dias + correção e juros]
vi. [audiência UNA]
vii. [justiça gratuita]
viii. [destaque de honorários contratuais de [honorários]% em favor do escritório]
<<<END_VI>>>

<<<FECHAMENTO>>>
Protesta o alegado por todos os meios admitidos em direito, especialmente o depoimento pessoal da parte autora e das testemunhas que comparecerão em audiência, independente de intimação.

Dá-se à causa o valor de R$ 6.072,00 (seis mil e setenta e dois reais), renunciando-se a eventual excedente da alçada do Juizado Especial Federal, especificamente para fins de fixação da competência.

Termos em que, pede e espera deferimento.

[Nome do Advogado em MAIÚSCULAS]
OAB/[UF] nº [número]
<<<END_FECHAMENTO>>>

<<<PLANILHA>>>
| Campo | Valor |
| --- | --- |
| 1º Mês de benefício | R$ 1.518,00 |
| 2º Mês de benefício | R$ 1.518,00 |
| 3º Mês de benefício | R$ 1.518,00 |
| 4º Mês de benefício | R$ 1.518,00 |
| TOTAL | R$ 6.072,00 |
nota: Referência do valor: quantia devida por fato gerador (cada nascimento)
<<<END_PLANILHA>>>

REGRAS:
- Tom formal, humanizado e persuasivo
- Usar EXATAMENTE os dados fornecidos pelo usuário
- Sempre citar STF ADIs 2110 e 2111, j. 28/03/2024
- Na TIMELINE: 4 a 7 eventos reais do caso (nascimento, labor rural, requerimento, indeferimento etc.). O sistema pode sobrescrever este bloco com a configuração do usuário (estilo: horizontal | vertical | none).
- prioridade_menor: true se a autora for menor de 18 anos
- Local/data da assinatura: o sistema completa com a cidade do escritório — no FECHAMENTO NÃO escreva a linha de cidade/data
- Valor da causa padrão: R$ 6.072,00 (4 × salário mínimo R$ 1.518,00), salvo outro valor informado
`
