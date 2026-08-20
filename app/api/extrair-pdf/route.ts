import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const fd = await req.formData()
  const file = fd.get('pdf') as File
  if (!file) return Response.json({ error: 'no_file' }, { status: 400 })

  const buf = Buffer.from(await file.arrayBuffer())
  const pdfParse = (await import('pdf-parse')).default
  const { text } = await pdfParse(buf)

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Extraia dados deste PDF do INSS. Retorne APENAS JSON vÃ¡lido sem texto extra:
{"nome":"","cpf":"","nb":"","data_requerimento":"","data_indeferimento":"",
"motivo_inss":"","rg":"","endereco":"","cidade":"","estado":"",
"nome_crianca":"","data_nascimento_crianca":"","profissao":"","periodo_segurado":""}
Use null para campos nÃ£o encontrados.
Texto: ${text.slice(0, 3000)}`
    }]
  })

  try {
    const raw = (res.content[0] as any).text.replace(/```json|```/g, '').trim()
    return Response.json(JSON.parse(raw))
  } catch {
    return Response.json({ error: 'extracao_falhou' }, { status: 422 })
  }
}
