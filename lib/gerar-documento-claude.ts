/**
 * Geração Claude com max_tokens alto, continuação se stop_reason=max_tokens,
 * e geração em blocos para SM rural.
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  ERRO_GERACAO_INTERROMPIDA,
  canonicalizarMarcadoresSm,
  validarCompletudeSmRural,
} from '@/lib/peticao-sm-rural'

/** Máximo de saída do Claude Sonnet 4.x */
export const MAX_TOKENS_MODELO = 64000

async function streamOnce(
  anthropic: Anthropic,
  opts: {
    system: string
    messages: Anthropic.MessageParam[]
    max_tokens: number
    onDelta?: (text: string) => void
  },
): Promise<{
  text: string
  stop_reason: string | null
  usage: { input_tokens: number; output_tokens: number }
}> {
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: opts.max_tokens,
    system: opts.system,
    messages: opts.messages,
  })

  let text = ''
  stream.on('text', (delta: string) => {
    text += delta
    opts.onDelta?.(delta)
  })

  const final = await stream.finalMessage()
  // Se o listener não capturou (API variante), usa content do final
  if (!text && Array.isArray(final.content)) {
    text = final.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    if (text) opts.onDelta?.(text)
  }

  const stop_reason = (final.stop_reason as string | null) ?? null
  const usage = {
    input_tokens: final.usage?.input_tokens ?? 0,
    output_tokens: final.usage?.output_tokens ?? 0,
  }
  console.log(
    `[GERAR_DOCUMENTO] stop_reason=${stop_reason} input_tokens=${usage.input_tokens} output_tokens=${usage.output_tokens}`,
  )
  return { text, stop_reason, usage }
}

/** Continua se a geração parou por max_tokens (até maxContinues vezes). */
async function gerarComContinuacao(
  anthropic: Anthropic,
  system: string,
  userContent: string,
  onDelta?: (text: string) => void,
  maxContinues = 2,
): Promise<string> {
  let full = ''
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userContent },
  ]

  for (let attempt = 0; attempt <= maxContinues; attempt++) {
    const { text, stop_reason } = await streamOnce(anthropic, {
      system,
      messages,
      max_tokens: MAX_TOKENS_MODELO,
      onDelta,
    })
    full += text

    if (stop_reason !== 'max_tokens') {
      return full
    }

    console.warn(
      `[GERAR_DOCUMENTO] Truncado por max_tokens (tentativa ${attempt + 1}). Continuando…`,
    )
    messages.push({ role: 'assistant', content: text })
    messages.push({
      role: 'user',
      content:
        'Continue EXATAMENTE de onde parou, sem repetir o que já escreveu. Mantenha os marcadores <<<SECAO>>> e feche todos os blocos abertos.',
    })
  }

  // Ainda truncado após continuações
  throw new Error(ERRO_GERACAO_INTERROMPIDA)
}

const BLOCOS_SM: { id: string; instrucao: string; maxTokens: number }[] = [
  {
    id: 'cabecalho_preliminares',
    maxTokens: 12000,
    instrucao: `Gere APENAS, nesta ordem, os blocos:
<<<SM_RURAL_V2>>> … <<<META>>>…<<<END_META>>> … <<<ENDERECO>>>…<<<END_ENDERECO>>> …
<<<QUALIFICACAO>>>…<<<END_QUALIFICACAO>>> … <<<TITULO>>>/<<<SUBTITULO>>>…<<<END_TITULO>>> …
<<<EM_FACE>>>…<<<END_EM_FACE>>> … <<<I_PRELIMINARES>>>…<<<END_I>>>
Inclua TODOS os subtítulos "DA …:" necessários em I (gratuidade, prioridade etc.).
NÃO gere seções II–VI ainda. Feche cada marcador aberto.`,
  },
  {
    id: 'quadro_sintese',
    maxTokens: 12000,
    instrucao: `Continue a petição. Gere APENAS:
<<<II_QUADRO>>>…<<<END_II>>>
<<<III_SINTESE_ANTES>>>…<<<END_III_ANTES>>>
<<<TIMELINE>>>…<<<END_TIMELINE>>>
<<<III_SINTESE_DEPOIS>>>…<<<END_III_DEPOIS>>>
NÃO gere IV–VI. Não repita o que já foi gerado.`,
  },
  {
    id: 'provas',
    maxTokens: 8000,
    instrucao: `Continue. Gere APENAS:
<<<IV_PROVAS>>>…<<<END_IV>>>
<<<IV_FECHO>>>…<<<END_IV_FECHO>>>

Em <<<IV_PROVAS>>> liste CADA prova em linha própria, formato obrigatório:
✓ Nome do documento — explicação breve
NUNCA parágrafos corridos de provas. Mínimo 4 itens com ✓.
NÃO gere V–VI.`,
  },
  {
    id: 'fundamentacao',
    maxTokens: 12000,
    instrucao: `Continue. Gere APENAS:
<<<V_FUNDAMENTACAO>>>…<<<END_V>>>
Inclua os trechos fixos de ADI e Tema 533 exigidos no system prompt.
NÃO gere VI ainda.`,
  },
  {
    id: 'pedidos_fecho',
    maxTokens: 12000,
    instrucao: `Continue e FINALIZE. Gere APENAS:
<<<VI_PEDIDOS>>>…<<<END_VI>>>
<<<FECHAMENTO>>>…<<<END_FECHAMENTO>>>
<<<PLANILHA>>>…<<<END_PLANILHA>>>

Em VI obrigatório itens i. até viii. (romanos), cada um completo.
Feche todos os marcadores.`,
  },
]

/**
 * Gera petição SM rural em blocos (cada seção com chamada própria) + validação.
 * Emite deltas via onDelta para o stream HTTP.
 */
export async function gerarPeticaoSmRuralEmBlocos(
  anthropic: Anthropic,
  systemPrompt: string,
  formDataJson: string,
  onDelta?: (text: string) => void,
): Promise<string> {
  let acumulado = ''

  for (const bloco of BLOCOS_SM) {
    const messages: Anthropic.MessageParam[] = acumulado
      ? [
          { role: 'user', content: formDataJson },
          { role: 'assistant', content: acumulado },
          { role: 'user', content: bloco.instrucao },
        ]
      : [{ role: 'user', content: `${formDataJson}\n\n---\n${bloco.instrucao}` }]

    console.log(`[GERAR_DOCUMENTO][SM] Bloco: ${bloco.id}`)
    let parte = ''
    let stop: string | null = null
    const msgsBase = messages

    for (let cont = 0; cont <= 1; cont++) {
      const msgs: Anthropic.MessageParam[] =
        cont === 0
          ? msgsBase
          : [
              ...msgsBase,
              { role: 'assistant', content: parte },
              {
                role: 'user',
                content:
                  'Continue EXATAMENTE de onde parou neste bloco, sem repetir. Feche marcadores abertos.',
              },
            ]

      const result = await streamOnce(anthropic, {
        system: systemPrompt,
        messages: msgs,
        max_tokens: Math.min(bloco.maxTokens, MAX_TOKENS_MODELO),
        onDelta,
      })
      parte += result.text
      stop = result.stop_reason
      if (stop !== 'max_tokens') break
      console.warn(`[GERAR_DOCUMENTO][SM] Bloco ${bloco.id} truncado — continuando`)
    }

    if (stop === 'max_tokens') {
      throw new Error(ERRO_GERACAO_INTERROMPIDA)
    }

    acumulado = acumulado ? `${acumulado.trim()}\n\n${parte.trim()}` : parte.trim()
  }

  acumulado = canonicalizarMarcadoresSm(acumulado)
  const validacao = validarCompletudeSmRural(acumulado)
  if (!validacao.ok) {
    throw new Error(validacao.motivo)
  }
  return acumulado
}

/** Geração genérica (não SM) com continuação automática. */
export async function gerarDocumentoComContinuacao(
  anthropic: Anthropic,
  systemPrompt: string,
  formDataJson: string,
  onDelta?: (text: string) => void,
): Promise<string> {
  return gerarComContinuacao(anthropic, systemPrompt, formDataJson, onDelta)
}
