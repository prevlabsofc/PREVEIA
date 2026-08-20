import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    const { agentId, formData } = await req.json()

    const { data: agent } = await supabaseAdmin.from('custom_agents').select('*').eq('id', agentId).eq('lawyer_id', user.id).single()
    if (!agent) return Response.json({ error: 'Agente não encontrado' }, { status: 404 })

    // Substituir os placeholders pelos valores fornecidos
    let peticao = agent.template_text
    for (const [key, value] of Object.entries(formData)) {
      peticao = peticao.replace(new RegExp(`{{${key}}}`, 'g'), value as string)
    }

    // Se tiver instruções, usa a IA pra refinar o texto
    if (agent.instrucoes) {
      const refined = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        system: `Você é um assistente jurídico. Instruções do escritório: ${agent.instrucoes}`,
        messages: [{ role: 'user', content: `Revise e melhore esta petição seguindo as instruções do escritório:\n\n${peticao}` }],
      })
      peticao = refined.content[0].type === 'text' ? refined.content[0].text : peticao
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(peticao))
        controller.close()
      }
    })

    return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}