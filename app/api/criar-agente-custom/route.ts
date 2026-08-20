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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const instrucoes = formData.get('instrucoes') as string || ''

    if (!file || !name) return Response.json({ error: 'Arquivo e nome são obrigatórios' }, { status: 400 })

    // Converter PDF para base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Extrair texto e identificar campos com IA
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: `Analise este modelo de petição jurídica e faça o seguinte:

1. Extraia o texto completo do documento
2. Identifique TODOS os campos que precisam ser preenchidos pelo advogado (ex: nome do cliente, CPF, data, valor, etc)
3. Substitua cada campo variável por um placeholder no formato {{NOME_DO_CAMPO}} em MAIÚSCULAS

Responda APENAS em JSON válido, sem markdown, neste formato exato:
{
  "template": "texto completo com {{PLACEHOLDERS}} nos lugares corretos",
  "fields": [
    {"id": "NOME_DO_CAMPO", "label": "Nome do Campo", "type": "text", "required": true},
    ...
  ]
}`
          }
        ]
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Resposta inválida da IA')

    let clean = content.text.replace(/```json|```/g, '').trim()
    // Tenta encontrar o JSON dentro do texto
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) clean = jsonMatch[0]
    // Remove caracteres de controle que podem quebrar o JSON
    clean = clean.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\n/g, ' ').trim()
    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Se ainda falhar, cria uma estrutura básica
      parsed = {
        template: content.text,
        fields: [
          { id: 'NOME_CLIENTE', label: 'Nome do Cliente', type: 'text', required: true },
          { id: 'CPF_CLIENTE', label: 'CPF do Cliente', type: 'text', required: true },
          { id: 'DATA', label: 'Data', type: 'text', required: false },
        ]
      }
    }

    // Salvar o agente customizado no banco
    const { data, error: insertErr } = await supabaseAdmin.from('custom_agents').insert({
      lawyer_id: user.id,
      name,
      template_text: parsed.template,
      fields: parsed.fields,
      instrucoes: instrucoes,
    }).select().single()

    if (insertErr) throw new Error(insertErr.message)

    return Response.json({ ok: true, agent: data })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}