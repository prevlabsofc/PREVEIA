import Anthropic from '@anthropic-ai/sdk'
import { rateLimit } from '@/lib/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM = `Você é o assistente de edição de petições da plataforma Marple (advogados previdenciaristas no Brasil).

O advogado pede alterações no texto da petição em linguagem natural. Você NUNCA altera o texto final sozinho — apenas PROPÕE trechos.

Responda SEMPRE em JSON válido (sem markdown, sem cercas \`\`\`), neste formato:
{
  "mensagem": "explicação curta em português do que propõe",
  "alteracoes": [
    {
      "titulo": "rótulo curto da alteração",
      "atual": "trecho EXATO do texto atual a substituir (copie literalmente do documento)",
      "proposto": "trecho proposto no lugar"
    }
  ]
}

Regras:
- "atual" deve ser cópia literal de um trecho existente no documento (para o cliente fazer replace).
- Se não conseguir localizar o trecho, devolva alteracoes: [] e explique em "mensagem".
- Pode devolver 1 a 5 alterações.
- Preserve marcadores <<<TAG>>> se estiverem no trecho — nunca os remova nem invente.
- Mantenha o tom jurídico adequado; cite lei/súmula só se o advogado pedir ou se for seguro.
- Não invente fatos do caso. Use só o que está no texto e nos dados do caso.
- Capacidades: reescrever parágrafo, deixar mais sucinto/detalhado, acrescentar fundamentação, trocar o tom, corrigir concordância.`

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip, 20, 60000)) {
      return Response.json(
        { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const mensagem = String(body.mensagem || '').trim()
    const textoPeticao = String(body.textoPeticao || '')
    const dadosCaso = body.dadosCaso || {}
    const historico = Array.isArray(body.historico) ? body.historico : []

    if (!mensagem) {
      return Response.json({ error: 'Mensagem vazia' }, { status: 400 })
    }
    if (!textoPeticao.trim()) {
      return Response.json({ error: 'Texto da petição ausente' }, { status: 400 })
    }

    // Limita tamanho para caber no contexto
    const textoCtx =
      textoPeticao.length > 48000
        ? `${textoPeticao.slice(0, 48000)}\n\n[…texto truncado…]`
        : textoPeticao

    const userContent = `DADOS DO CASO (JSON):
${JSON.stringify(dadosCaso, null, 0)}

TEXTO ATUAL DA PETIÇÃO:
${textoCtx}

PEDIDO DO ADVOGADO:
${mensagem}`

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (const h of historico.slice(-6)) {
      if (h?.role === 'user' || h?.role === 'assistant') {
        messages.push({ role: h.role, content: String(h.content || '').slice(0, 4000) })
      }
    }
    messages.push({ role: 'user', content: userContent })

    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: SYSTEM,
      messages,
    })

    const raw = result.content
      .filter((b) => b.type === 'text')
      .map((b) => ('text' in b ? b.text : ''))
      .join('')
      .trim()

    const parsed = parseJsonResposta(raw)
    return Response.json(parsed)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro no assistente'
    return Response.json({ error: msg }, { status: 500 })
  }
}

function parseJsonResposta(raw: string): {
  mensagem: string
  alteracoes: Array<{ titulo: string; atual: string; proposto: string }>
} {
  const limpo = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    const obj = JSON.parse(limpo) as {
      mensagem?: string
      alteracoes?: Array<{ titulo?: string; atual?: string; proposto?: string }>
    }
    return {
      mensagem: String(obj.mensagem || '').trim() || 'Proposta pronta.',
      alteracoes: Array.isArray(obj.alteracoes)
        ? obj.alteracoes
            .map((a) => ({
              titulo: String(a.titulo || 'Alteração').trim(),
              atual: String(a.atual || ''),
              proposto: String(a.proposto || ''),
            }))
            .filter((a) => a.atual && a.proposto && a.atual !== a.proposto)
        : [],
    }
  } catch {
    return {
      mensagem: limpo || 'Não foi possível interpretar a resposta da IA.',
      alteracoes: [],
    }
  }
}
