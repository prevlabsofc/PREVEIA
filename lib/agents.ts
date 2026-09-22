import {
  formatarLocalData,
  resolverLocalAdvogado,
} from '@/lib/peticao-export'
import {
  FUND_ADI_2110_2111,
  FUND_TEMA_533_STJ,
} from '@/lib/peticoes/fundamentos'
import { valorCausaSalarioMaternidade } from '@/lib/salario-minimo'
import { formatarEnderecoAutorPeticao } from '@/lib/formatar-endereco'
import { formatarSubsecaoUf } from '@/lib/jurisdicao/subsecoes'

function lerCampo(fd: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = fd[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

export function getSystemPrompt(
  agentType: string,
  adv: any,
  cli: any,
  formData?: Record<string, unknown> | null,
): string {
  const local = resolverLocalAdvogado(adv)
  const exemploLocalData = formatarLocalData(adv)
  const cidadeUfInstrucao = local.cidade
    ? `use exatamente "${local.localFormatado}" (nunca omita a cidade; nunca escreva só "/${local.uf}" ou só "${local.uf}")`
    : local.uf
      ? `a cidade do escritório não está cadastrada — use apenas "${local.uf}" (ex.: "${local.uf}, 16 de julho de 2025"), NUNCA escreva "/${local.uf}" nem "undefined/${local.uf}"`
      : 'use [Cidade]/[UF] apenas se os dados forem conhecidos; não invente cidade'

  const fd = formData && typeof formData === 'object' ? formData : {}
  const subsecaoForm = formatarSubsecaoUf(
    lerCampo(fd, 'subsecao_judiciaria', 'subsecao'),
    lerCampo(fd, 'autor_uf', 'uf', 'state', 'estado') || local.uf,
  )
  const municipioAutor = lerCampo(
    fd,
    'autor_municipio',
    'municipio',
    'cidade',
    'city',
  )
  const ufAutor = lerCampo(fd, 'autor_uf', 'uf', 'state', 'estado').toUpperCase()
  const bairroAutor = lerCampo(fd, 'autor_bairro', 'bairro')
  const zonaAutor = lerCampo(fd, 'autor_zona', 'zona', 'zone').toLowerCase()
  const enderecoAutor =
    formatarEnderecoAutorPeticao(fd as Record<string, string>) ||
    lerCampo(fd, 'endereco')

  const juizoCompetente =
    subsecaoForm ||
    (municipioAutor && ufAutor
      ? `${municipioAutor}/${ufAutor}`
      : '[Subseção]/[UF]')

  const advDados = `
DADOS DO ADVOGADO (use obrigatoriamente no cabeçalho e pedidos):
  Nome: ${adv?.name || ''}
  OAB: ${adv?.oab_number || ''}/${adv?.oab_uf || ''}
  Email: ${adv?.email || ''}
  WhatsApp: ${adv?.whatsapp || ''}
  Cidade do escritório: ${local.cidade || '(não cadastrada)'}
  UF do escritório: ${local.uf || ''}
  Local formatado (escritório): ${local.localFormatado || '(incompleto)'}
  Exemplo de linha de local/data: ${exemploLocalData}
  Vara: ${adv?.vara_padrao || ''}
  Honorários: ${adv?.honorarios_pct ?? ''}%

SEPARAÇÃO OBRIGATÓRIA — CIDADE DO ESCRITÓRIO vs SUBSEÇÃO COMPETENTE:
  - Cidade do escritório (${local.localFormatado || '[Cidade]/[UF]'}): SOMENTE assinatura (local/data), endereço profissional do advogado para intimações e rodapé.
  - Subseção judiciária COMPETENTE (domicílio da parte autora): "${juizoCompetente}"
  - Endereçamento JEF (obrigatório, SEM a palavra Comarca) — use EXATAMENTE a subseção do formulário, NUNCA a cidade do escritório:
    "AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ${juizoCompetente}"
  - PROIBIDO substituir a subseção competente pela cidade do escritório (${local.localFormatado || 'escritório'}).
  - Assinatura (local/data): ${cidadeUfInstrucao}
  - Formato da linha de assinatura: "${local.localFormatado || '[Cidade]/[UF]'}, [data por extenso]."

DOMICÍLIO DA PARTE AUTORA (qualificação e competência territorial JEF):
  - Endereço completo: ${enderecoAutor || '(preencher com os campos do formulário)'}
  - Município/UF: ${municipioAutor && ufAutor ? `${municipioAutor}/${ufAutor}` : '(informar)'}
  - Bairro/comunidade/povoado: ${bairroAutor || '(se informado)'}
  - Zona: ${zonaAutor || '(se informada)'}
  - Subseção judiciária: ${juizoCompetente}`

  const dataParto =
    String(fd.data_nascimento_crianca || fd.data_parto || '').trim() || null
  const sexoCriancaRaw = String(fd.sexo_crianca || '').trim().toLowerCase()
  // Preferência: form SM; fallback: cadastro do cliente (sexo / genero)
  const sexoAutorRaw = String(
    fd.sexo_parte_autora ||
      fd.sexo_autor ||
      fd.sexo ||
      cli?.sexo ||
      cli?.genero ||
      '',
  )
    .trim()
    .toLowerCase()
  const prompts: Record<string, string> = {
    'salario-maternidade-rural':
      advDados +
      buildPromptSalMatRural(dataParto, sexoCriancaRaw, sexoAutorRaw, {
        juizoCompetente,
        cidadeEscritorio: local.localFormatado,
        enderecoAutor,
        municipioAutor,
        ufAutor,
        bairroAutor,
        zonaAutor,
      }),
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

const _smValor = valorCausaSalarioMaternidade()

function normalizarSexo(sexoRaw: string): 'masculino' | 'feminino' | '' {
  const s = String(sexoRaw || '').trim().toLowerCase()
  if (s === 'masculino' || s === 'm' || s === 'male' || s === 'homem') return 'masculino'
  if (s === 'feminino' || s === 'f' || s === 'female' || s === 'mulher') return 'feminino'
  return ''
}

function instrucaoGeneroCrianca(sexoRaw: string): string {
  const sexo = normalizarSexo(sexoRaw)
  if (sexo === 'masculino') {
    return `GÊNERO DA CRIANÇA (obrigatório): masculino.
- Use SEMPRE: "o filho", "seu filho", "do filho", "nascido", "o menor".
- NUNCA use "filha", "nascida", "a menor" nem "o(a) filho(a)".`
  }
  if (sexo === 'feminino') {
    return `GÊNERO DA CRIANÇA (obrigatório): feminino.
- Use SEMPRE: "a filha", "sua filha", "da filha", "nascida", "a menor".
- NUNCA use "filho", "nascido", "o menor" nem "o(a) filho(a)".`
  }
  return `GÊNERO DA CRIANÇA: não informado.
- Use formas neutras: "o(a) filho(a)", "a criança", "nascido(a)".
- Evite assumir masculino ou feminino.`
}

function instrucaoGeneroParteAutora(sexoRaw: string): {
  bloco: string
  subtitulo: string
} {
  const sexo = normalizarSexo(sexoRaw)
  if (sexo === 'masculino') {
    return {
      subtitulo: '(SEGURADO ESPECIAL – AGRICULTOR)',
      bloco: `SEXO DA PARTE AUTORA (obrigatório): masculino.
CONCORDÂNCIA EM TODA A PEÇA (sem exceção):
- Use SEMPRE: "o autor", "agricultor", "segurado especial", "portador", "domiciliado", "nascido", "seu" (quando se referir ao autor).
- NUNCA use: "a autora", "agricultora", "segurada especial", "portadora", "domiciliada", "nascida" para a parte autora.
- Homem pode requerer SM (adoção/guarda/falecimento da mãe) — NÃO force feminino.
- Subtítulo FIXO em <<<SUBTITULO>>>: (SEGURADO ESPECIAL – AGRICULTOR)`,
    }
  }
  if (sexo === 'feminino') {
    return {
      subtitulo: '(SEGURADA ESPECIAL – AGRICULTORA)',
      bloco: `SEXO DA PARTE AUTORA (obrigatório): feminino.
CONCORDÂNCIA EM TODA A PEÇA (sem exceção):
- Use SEMPRE: "a autora", "agricultora", "segurada especial", "portadora", "domiciliada", "nascida".
- NUNCA use formas masculinas para a parte autora.
- Subtítulo FIXO em <<<SUBTITULO>>>: (SEGURADA ESPECIAL – AGRICULTORA)`,
    }
  }
  return {
    subtitulo: '(SEGURADO(A) ESPECIAL – AGRICULTOR(A))',
    bloco: `SEXO DA PARTE AUTORA: não informado.
- Use formas neutras: "a parte autora", "segurado(a) especial", "agricultor(a)", "portador(a)", "domiciliado(a)".
- NÃO assuma feminino nem masculino.
- Subtítulo em <<<SUBTITULO>>>: (SEGURADO(A) ESPECIAL – AGRICULTOR(A))`,
  }
}

function buildPromptSalMatRural(
  dataParto: string | null,
  sexoCriancaRaw: string,
  sexoAutorRaw: string,
  ctx: {
    juizoCompetente: string
    cidadeEscritorio: string
    enderecoAutor: string
    municipioAutor: string
    ufAutor: string
    bairroAutor: string
    zonaAutor: string
  },
): string {
  const smValor = valorCausaSalarioMaternidade(dataParto)
  const generoCrianca = instrucaoGeneroCrianca(sexoCriancaRaw)
  const generoAutor = instrucaoGeneroParteAutora(sexoAutorRaw)
  const munUf =
    ctx.municipioAutor && ctx.ufAutor
      ? `${ctx.municipioAutor}/${ctx.ufAutor}`
      : ctx.municipioAutor || '[Município]/[UF]'
  const comunidade = ctx.bairroAutor
    ? `na comunidade/povoado/bairro ${ctx.bairroAutor}`
    : 'na comunidade/povoado informado no formulário (se houver)'
  const zonaTxt =
    ctx.zonaAutor === 'rural' || ctx.zonaAutor === 'r'
      ? 'zona rural'
      : ctx.zonaAutor === 'urbana' ||
          ctx.zonaAutor === 'urban' ||
          ctx.zonaAutor === 'urbano'
        ? 'zona urbana'
        : ''

  return `
Você é um advogado previdenciarista especializado com 20 anos de experiência.
Gere uma PETIÇÃO INICIAL COMPLETA para Salário-Maternidade — Segurado Especial no JEF.

${generoAutor.bloco}

${generoCrianca}

SALÁRIO MÍNIMO / VALOR DA CAUSA (obrigatório):
- Use o salário mínimo vigente na DATA DO PARTO (fato gerador): ${smValor.mensalFmt} (vigência desde ${smValor.dataVigenciaFmt}).
- Valor da causa = 4 × esse salário = ${smValor.totalFmt}.
- NÃO use o salário mínimo de ${new Date().getFullYear()} se a data do parto for anterior.
- Na PLANILHA, a nota deve indicar a data de vigência ${smValor.dataVigenciaFmt} (não só o ano).

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
AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ${ctx.juizoCompetente}
<<<END_ENDERECO>>>

<<<QUALIFICACAO>>>
[Parágrafo corrido completo com nome, profissão, data de nascimento, idade, CPF, endereço COMPLETO da parte autora (${ctx.enderecoAutor || 'logradouro, número, bairro/comunidade, zona se rural, município/UF, CEP'}), menção aos procuradores e fundamento legal, TERMINANDO exatamente com as palavras: propor a presente]
[RG: só mencione "portadora do RG …" se o RG estiver informado nos dados. Se RG vazio/ausente, OMITA qualquer menção a RG — nunca escreva "RG não informado".]
[NÃO use o endereço do escritório na qualificação — use o domicílio da parte autora.]
<<<END_QUALIFICACAO>>>

<<<TITULO>>>
AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE
<<<SUBTITULO>>>
${generoAutor.subtitulo}
<<<END_TITULO>>>

IMPORTANTE SOBRE TÍTULO (OBRIGATÓRIO):
- Em <<<TITULO>>> coloque APENAS a linha da ação, SEM subtítulo e SEM artefatos << >> ou <<>>.
- O subtítulo "${generoAutor.subtitulo}" vai SOMENTE em <<<SUBTITULO>>>, UMA única vez.
- NÃO repita o subtítulo dentro de <<<TITULO>>> nem cole título+subtítulo no mesmo bloco.
- NÃO invente << >> / marcadores extras entre título e subtítulo.

<<<EM_FACE>>>
[Parágrafo "Em face do INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS, autarquia federal, a ser citado na pessoa de seu representante legal, por meio da Procuradoria Federal..." — redação NEUTRA. NUNCA invente "Agência da Previdência Social em …" nem "Agência do INSS na Comarca de …".]
<<<END_EM_FACE>>>

<<<I_PRELIMINARES>>>
DA GRATUIDADE DA JUSTIÇA:
[Parágrafo da gratuidade — art. 5º, LXXIV, CF/88 e Lei 1.060/50]
DA PRIORIDADE DE TRAMITAÇÃO:
[Se couber — idoso/deficiente/menor; senão omita este subtítulo]
<<<END_I>>>

<<<II_QUADRO>>>
| Campo | Valor |
| --- | --- |
| Nome | [nome] |
| Município/UF | ${munUf} |
| Idade no Req. Adm. | [idade — se desconhecida, use "Não informada"] |
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
| Período de atividade rural | [texto] |
| Ponto controvertido | [texto] |
| Benefício anterior | [texto ou omita a linha se vazio] |
| Período averbado no CNIS | [texto ou omita a linha se vazio] |
| Vínculo urbano | [texto] |
<<<END_II>>>
[No quadro: omita linhas de campos opcionais vazios. "Não informada" só para idade. Inclua sempre a linha Município/UF.]

<<<III_SINTESE_ANTES>>>
[2–3 parágrafos narrativos sobre a parte autora, atividade rural e economia familiar — respeitando o sexo informado]
[OBRIGATÓRIO: cite o município ${munUf} e ${comunidade}${zonaTxt ? `, em ${zonaTxt}` : ''}, onde a atividade é exercida. NÃO use genéricos como "no interior do Estado do Maranhão" sem nomear o município.]
[Último parágrafo deve terminar com: A seguir, a linha do tempo de sua trajetória de vida e trabalho rural:]
<<<END_III_ANTES>>>

<<<TIMELINE>>>
{"nome":"[NOME DA PARTE AUTORA]","atividade":"[OBRIGATÓRIO: 'Agricultor' se sexo masculino; 'Agricultora' se sexo feminino; NUNCA use Agricultora para autor masculino]","local":"${munUf}","estilo":"horizontal","eventos":[{"data":"AAAA ou dd/mm/aaaa","titulo":"Evento curto","detalhe":"detalhe opcional"},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."},{"data":"...","titulo":"...","detalhe":"..."}]}
<<<END_TIMELINE>>>

<<<III_SINTESE_DEPOIS>>>
[Parágrafos após a timeline: nascimento do filho/filha conforme gênero, período gestacional, requerimento administrativo, indeferimento e crítica à decisão]
[PROIBIDO listar provas aqui. NÃO escreva linhas "Documento — explicação". Provas vão SOMENTE em <<<IV_PROVAS>>>]
<<<END_III_DEPOIS>>>

<<<IV_PROVAS>>>
✓ [Nome do documento] — [explicação breve do que prova]
✓ [Nome do documento] — [explicação]
✓ [Nome do documento] — [explicação]
✓ Autodeclaração de segurado especial — art. 38-B, §2º, Lei 8.213/91
✓ [outras provas no mesmo formato]
<<<END_IV>>>
[OBRIGATÓRIO: cada prova em UMA linha, começando com ✓, formato "Nome — explicação".
NUNCA escreva provas em parágrafos corridos. NUNCA coloque a lista antes da seção IV.
NUNCA coloque provas em <<<III_SINTESE_DEPOIS>>> — o sistema renderiza as caixas com check somente dentro de IV.]

<<<IV_FECHO>>>
[Parágrafo de análise/fechamento da seção de provas — início de prova material + economia familiar + carência.
Este parágrafo vem DEPOIS da lista de provas (não antes).
Se houver declaração de sindicato rural, descreva-a como prova complementar (NÃO cite art. 106, III, da Lei 8.213/91).]
<<<END_IV_FECHO>>>

<<<V_FUNDAMENTACAO>>>
[4–6 parágrafos: art. 71 e art. 39 p.u. Lei 8.213/91; CF/88 art. 7º, XVIII; conclusão.
Inclua obrigatoriamente estes trechos (sem alterar):
"${FUND_ADI_2110_2111}"
"${FUND_TEMA_533_STJ}"]
<<<END_V>>>

<<<VI_PEDIDOS>>>
i. [comunicações em nome dos advogados — art. 272, §5º, CPC]
ii. [procedência e concessão do salário-maternidade]
iii. [averbação do período de atividade rural no CNIS]
iv. [citação da ré + juntada do PA NB]
v. [pagamento de 120 dias, com atualização nos termos do Manual de Cálculos da Justiça Federal, com incidência da taxa SELIC a partir de dezembro/2021, conforme art. 3º da EC nº 113/2021]
vi. [audiência UNA]
vii. [justiça gratuita]
viii. [destaque de honorários contratuais de [honorários]% em favor do escritório]
<<<END_VI>>>

<<<FECHAMENTO>>>
Protesta o alegado por todos os meios admitidos em direito, especialmente o depoimento pessoal da parte autora e das testemunhas que comparecerão em audiência, independente de intimação.

Dá-se à causa o valor de ${smValor.totalFmt} (${smValor.total.toLocaleString('pt-BR')} reais), renunciando-se a eventual excedente da alçada do Juizado Especial Federal, especificamente para fins de fixação da competência.

Termos em que, pede e espera deferimento.

[Nome do Advogado em MAIÚSCULAS]
OAB/[UF] nº [número]
<<<END_FECHAMENTO>>>

<<<PLANILHA>>>
| Campo | Valor |
| --- | --- |
| 1º Mês de benefício | ${smValor.mensalFmt} |
| 2º Mês de benefício | ${smValor.mensalFmt} |
| 3º Mês de benefício | ${smValor.mensalFmt} |
| 4º Mês de benefício | ${smValor.mensalFmt} |
| TOTAL | ${smValor.totalFmt} |
nota: ${smValor.nota}
<<<END_PLANILHA>>>

REGRAS:
- Tom formal, humanizado e persuasivo
- Usar EXATAMENTE os dados fornecidos pelo usuário
- Endereçamento SEM "Comarca"; juízo = "${ctx.juizoCompetente}" (NUNCA "${ctx.cidadeEscritorio || 'cidade do escritório'}" no endereçamento)
- Citação INSS: redação neutra via Procuradoria Federal — NUNCA invente agência da Previdência Social
- Sempre citar STF ADIs 2110 e 2111, j. 28/03/2024 (texto fixo acima)
- Declaração de sindicato: prova complementar — NÃO mencionar art. 106, III, Lei 8.213
- Incluir checklist "Autodeclaração de segurado especial (art. 38-B, §2º, Lei 8.213/91)" nas provas
- Em <<<IV_PROVAS>>>: SOMENTE lista com ✓ no formato "Nome do documento — explicação". Nunca parágrafos. Renderizadas em caixas cinza com check verde DENTRO da seção IV.
- Em <<<I_PRELIMINARES>>>: cada tema em subtítulo próprio "DA …:" (ex.: DA GRATUIDADE DA JUSTIÇA:, DA PRIORIDADE…).
- Na TIMELINE: 4 a 7 eventos reais do caso (nascimento, labor rural, requerimento, indeferimento etc.). O sistema pode sobrescrever este bloco com a configuração do usuário (estilo: horizontal | vertical | none). Local da timeline = município da parte autora (${munUf}), NÃO a cidade do escritório.
- prioridade_menor: true se a parte autora for menor de 18 anos
- Local/data da assinatura: o sistema completa com a cidade do escritório (${ctx.cidadeEscritorio || '[Cidade]/[UF]'}) — no FECHAMENTO NÃO escreva a linha de cidade/data
- Valor da causa: ${smValor.totalFmt} (4 × salário mínimo ${smValor.mensalFmt} vigente desde ${smValor.dataVigenciaFmt} na data do parto)
- Texto corrido em caixa de sentença (primeira letra maiúscula, resto minúsculo conforme o português). NUNCA escreva parágrafos inteiros em CAIXA ALTA.
- Copie os nomes dos marcadores EXATAMENTE, com underscores: <<<END_III_ANTES>>> (nunca <<<ENDIIANTES>>>). Todo bloco aberto DEVE ser fechado.
- Os marcadores são instruções internas do sistema: não os explique, não os repita fora do formato e não os deixe no meio do texto jurídico.
- Na TIMELINE escreva APENAS um objeto JSON válido (sem markdown, sem texto antes ou depois do JSON).
- NUNCA deixe seções I–VI vazias. NUNCA corte no meio da frase. Pedidos VI devem ter i. até viii. completos.
- Pedido iii: use exatamente "averbação do período de atividade rural no CNIS" (NÃO diga "carência rural").
`
}

// Mantém referência para compatibilidade de imports acidentais
void _smValor

const PROMPT_SAL_MAT_RURAL = buildPromptSalMatRural(null, '', '', {
  juizoCompetente: '[Subseção]/[UF]',
  cidadeEscritorio: 'São Luís/MA',
  enderecoAutor: '',
  municipioAutor: '',
  ufAutor: '',
  bairroAutor: '',
  zonaAutor: '',
})
void PROMPT_SAL_MAT_RURAL
