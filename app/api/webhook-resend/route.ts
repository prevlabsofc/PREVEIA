import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Webhook Resend (Svix) para open/click de newsletter.
 * Configurar no painel Resend → Webhooks:
 *   URL: https://<dominio>/api/webhook-resend
 *   Eventos: email.opened, email.clicked
 *   Secret → RESEND_WEBHOOK_SECRET
 */

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verificarAssinaturaSvix(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const msgId = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signature = headers.get('svix-signature')
  if (!msgId || !timestamp || !signature) return false

  // Proteção anti-replay (~5 min)
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const signedContent = `${msgId}.${timestamp}.${rawBody}`
  // Secret Svix vem como "whsec_..." em base64
  const key = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8')

  const expected = createHmac('sha256', key).update(signedContent).digest('base64')
  const candidatos = signature.split(' ').map(p => p.replace(/^v1,/, '').trim()).filter(Boolean)

  return candidatos.some(cand => {
    try {
      const a = Buffer.from(expected)
      const b = Buffer.from(cand)
      return a.length === b.length && timingSafeEqual(a, b)
    } catch {
      return false
    }
  })
}

type ResendEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    created_at?: string
    click?: { link?: string }
    tags?: Array<{ name: string; value: string }> | Record<string, string>
  }
}

function tagValue(
  tags: Array<{ name: string; value: string }> | Record<string, string> | undefined | null,
  name: string
): string | null {
  if (!tags) return null
  if (Array.isArray(tags)) {
    const found = tags.find((t: { name: string; value: string }) => t.name === name)
    return found?.value ?? null
  }
  if (typeof tags === 'object') {
    const v = (tags as Record<string, string>)[name]
    return v ?? null
  }
  return null
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return Response.json(
      { error: 'RESEND_WEBHOOK_SECRET não configurado' },
      { status: 503 }
    )
  }

  const rawBody = await req.text()
  if (!verificarAssinaturaSvix(rawBody, req.headers, secret)) {
    return Response.json({ error: 'assinatura inválida' }, { status: 401 })
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return Response.json({ error: 'json inválido' }, { status: 400 })
  }

  const tipoEvento = event.type || ''
  let tipo: 'open' | 'click' | null = null
  if (tipoEvento === 'email.opened') tipo = 'open'
  else if (tipoEvento === 'email.clicked') tipo = 'click'
  else return Response.json({ ok: true, ignored: tipoEvento })

  const emailId = event.data?.email_id
  if (!emailId) return Response.json({ ok: true, ignored: 'sem email_id' })

  const resendEventId = req.headers.get('svix-id') || `${emailId}:${tipo}:${event.created_at || ''}`
  const url = tipo === 'click' ? (event.data?.click?.link || null) : null

  const supabase = admin()

  // Idempotência
  const { data: ja } = await supabase
    .from('newsletter_eventos')
    .select('id')
    .eq('resend_event_id', resendEventId)
    .maybeSingle()
  if (ja) return Response.json({ ok: true, duplicate: true })

  const { data: dest } = await supabase
    .from('newsletter_envios_destinatarios')
    .select('id, envio_id, subscriber_id, lawyer_id, office_id')
    .eq('resend_email_id', emailId)
    .maybeSingle()

  // Fallback por tags (caso o insert do destinatário tenha falhado no id)
  let envioId = dest?.envio_id as string | null
  let subscriberId = dest?.subscriber_id as string | null
  let lawyerId = dest?.lawyer_id as string | null
  let officeId = dest?.office_id as string | null
  const destId = dest?.id as string | null

  if (!dest) {
    const tagEnvio = tagValue(event.data?.tags, 'envio_id')
    const tagSub = tagValue(event.data?.tags, 'subscriber_id')
    if (tagEnvio) envioId = tagEnvio
    if (tagSub) subscriberId = tagSub
  }

  const { error } = await supabase.from('newsletter_eventos').insert({
    envio_id: envioId,
    destinatario_id: destId,
    subscriber_id: subscriberId,
    lawyer_id: lawyerId,
    office_id: officeId,
    tipo,
    url,
    resend_event_id: resendEventId,
  })

  if (error) {
    if (error.code === '23505') return Response.json({ ok: true, duplicate: true })
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, tipo })
}
