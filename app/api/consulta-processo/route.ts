import { consultarProcesso } from '@/lib/datajud'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(ip, 20, 60000)) {
    return Response.json(
      { ok: false, erro: 'limite_excedido', mensagem: 'Muitas consultas seguidas. Tente novamente em 1 minuto.' },
      { status: 429 },
    )
  }

  let numeroProcesso = ''
  try {
    const body = await req.json()
    numeroProcesso = String(body?.numeroProcesso ?? '')
  } catch {
    return Response.json(
      { ok: false, erro: 'numero_invalido', mensagem: 'Requisição inválida.' },
      { status: 400 },
    )
  }

  const resultado = await consultarProcesso(numeroProcesso)

  if (!resultado.ok) {
    const status = resultado.erro === 'numero_invalido' || resultado.erro === 'tribunal_nao_suportado' ? 400 : 502
    return Response.json(resultado, { status })
  }

  return Response.json(resultado)
}
