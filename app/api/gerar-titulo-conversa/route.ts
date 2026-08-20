import Anthropic from '@anthropic-ai/sdk'
import { rateLimit } from '@/lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const runtime = 'nodejs'

const SYSTEM = `Você nomeia conversas de um assistente jurídico brasileiro.

Gere um título com NO MÁXIMO 6 palavras que resuma o tema central da conversa.

Regras:
- Português brasileiro, sem aspas, sem ponto final.
- Não escreva prefixos como "Título:" nem explicações.
- Prefira o termo jurídico específico (ex.: "Carência do BPC/LOAS", "Prova de atividade rural").
- Responda apenas com o título.`

const MAX_PALAVRAS = 6

function normalizarTitulo(bruto: string): string {
  const limpo = bruto
    .trim()
    .split('\n')[0]
    .replace(/^\s*t[íi]tulo\s*:\s*/i, '')
    .replace(/^["'“”‘’`*\s]+|["'“”‘’`*\s]+$/g, '')
    .replace(/[.:;,]+$/, '')
    .trim()

  if (!limpo) return ''

  const palavras = limpo.split(/\s+/).slice(0, MAX_PALAVRAS).join(' ')
  return palavras.length > 60 ? `${palavras.slice(0, 57).trimEnd()}...` : palavras
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip, 30, 60000)) {
      return Response.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })
    }

    const { pergunta, resposta } = await req.json()
    if (typeof pergunta !== 'string' || !pergunta.trim()) {
      return Response.json({ error: 'Pergunta obrigatória.' }, { status: 400 })
    }

    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 40,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Pergunta do advogado:\n${pergunta.slice(0, 1500)}\n\nResposta da IA:\n${(typeof resposta === 'string' ? resposta : '').slice(0, 1500)}\n\nGere o título.`,
      }],
    })

    const bruto = completion.content[0]?.type === 'text' ? completion.content[0].text : ''
    const titulo = normalizarTitulo(bruto)
    if (!titulo) return Response.json({ error: 'Não foi possível gerar o título.' }, { status: 502 })

    return Response.json({ titulo })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
