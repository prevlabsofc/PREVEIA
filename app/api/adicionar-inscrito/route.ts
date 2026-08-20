import { createClient } from '@supabase/supabase-js'
import { validarEmail } from '@/lib/validar-email'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const runtime = 'nodejs'

type Segmento = 'cliente' | 'lead'

function normalizarSegmento(v: unknown): Segmento {
  return v === 'cliente' ? 'cliente' : 'lead'
}

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return Response.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { valido, email, erro } = validarEmail(body?.email)
    if (!valido) return Response.json({ error: erro }, { status: 400 })

    const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
    const segmento = normalizarSegmento(body?.segmento)
    const tags = Array.isArray(body?.tags)
      ? body.tags.map((t: unknown) => String(t || '').trim()).filter(Boolean).slice(0, 20)
      : []
    const clientId = typeof body?.client_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.client_id)
      ? body.client_id
      : null

    const { data: existente } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('id')
      .eq('lawyer_id', user.id)
      .eq('email', email)
      .maybeSingle()

    if (existente) return Response.json({ error: 'Este e-mail já está inscrito' }, { status: 409 })

    const { data, error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert({
        lawyer_id: user.id,
        email,
        nome: nome || null,
        segmento,
        tags,
        client_id: clientId,
      })
      .select()
      .single()

    if (error?.code === '23505') return Response.json({ error: 'Este e-mail já está inscrito' }, { status: 409 })
    if (error || !data) return Response.json({ error: 'Não foi possível adicionar o inscrito' }, { status: 500 })

    return Response.json({ ok: true, inscrito: data })
  } catch {
    return Response.json({ error: 'Não foi possível adicionar o inscrito' }, { status: 500 })
  }
}
