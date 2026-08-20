import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { telefoneParaWaMe } from '@/lib/aprovacao-cliente-shared'
import { inscritoCasaComTags } from '@/lib/newsletter-tags'

const resend = new Resend(process.env.RESEND_API_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Segmento = 'cliente' | 'lead' | 'todos'

function normalizarTagsFiltro(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map(t => String(t || '').trim()).filter(Boolean).slice(0, 20)
}

function blocoWhatsAppCta(
  telefoneWa: string | null,
  assunto: string,
  nomeEscritorio: string
): string {
  if (!telefoneWa) return ''
  const msg = `Olá! Li a newsletter "${assunto}" do ${nomeEscritorio} e gostaria de falar com o escritório.`
  const href = `https://wa.me/${telefoneWa}?text=${encodeURIComponent(msg)}`
  return `
    <div style="text-align:center;margin-top:28px;">
      <a href="${href}"
         style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;padding:14px 28px;border-radius:10px;">
        Falar com o escritório no WhatsApp
      </a>
    </div>`
}

export async function POST(req: Request) {
  try {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json()
    const assunto = String(body?.assunto || '').trim()
    const conteudo = String(body?.conteudo || '').trim()
    const segmento: Segmento = body?.segmento === 'cliente' || body?.segmento === 'lead'
      ? body.segmento
      : 'todos'
    const tagsFiltro = normalizarTagsFiltro(body?.tags)

    if (!assunto || !conteudo) {
      return Response.json({ error: 'Assunto e conteúdo são obrigatórios' }, { status: 400 })
    }

    const { data: lawyer } = await supabaseAdmin
      .from('lawyers')
      .select('name, email, office_name, office_id, phone, whatsapp')
      .eq('id', user.id)
      .single()

    const telefoneWa = telefoneParaWaMe(lawyer?.whatsapp || lawyer?.phone)
    const nomeEscritorio = lawyer?.office_name || lawyer?.name || 'escritório'

    let query = supabaseAdmin
      .from('newsletter_subscribers')
      .select('id, email, nome, segmento, tags')
      .eq('lawyer_id', user.id)
      .eq('ativo', true)

    if (segmento !== 'todos') {
      query = query.eq('segmento', segmento)
    }

    const { data: rawSubs } = await query
    const subscribers = (rawSubs || []).filter(s =>
      inscritoCasaComTags(s.tags as string[] | null, tagsFiltro)
    )

    if (subscribers.length === 0) {
      return Response.json({ error: 'Nenhum inscrito ativo neste segmento/filtro' }, { status: 400 })
    }

    const payloadEnvio: Record<string, unknown> = {
      lawyer_id: user.id,
      assunto,
      conteudo,
      total_enviados: 0,
      segmento: segmento === 'todos' ? null : segmento,
    }
    if (tagsFiltro.length > 0) payloadEnvio.tags_filtro = tagsFiltro

    let { data: envio, error: envioErr } = await supabaseAdmin
      .from('newsletter_envios')
      .insert(payloadEnvio)
      .select('id')
      .single()

    // Fallback se a migration de tags ainda não foi aplicada.
    if (envioErr && payloadEnvio.tags_filtro) {
      delete payloadEnvio.tags_filtro
      const retry = await supabaseAdmin
        .from('newsletter_envios')
        .insert(payloadEnvio)
        .select('id')
        .single()
      envio = retry.data
      envioErr = retry.error
    }

    if (envioErr || !envio) {
      return Response.json({ error: 'Não foi possível registrar o envio' }, { status: 500 })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    let enviados = 0
    const ctaWhats = blocoWhatsAppCta(telefoneWa, assunto, nomeEscritorio)

    for (const sub of subscribers) {
      try {
        const utmBase = appUrl
          ? `${appUrl}?utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(assunto.slice(0, 40))}&utm_content=${sub.id}`
          : null

        const htmlConteudo = conteudo
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>')

        const { data: sent, error: sendErr } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'newsletter@marple.com.br',
          to: sub.email,
          subject: assunto,
          tags: [
            { name: 'envio_id', value: envio.id },
            { name: 'subscriber_id', value: sub.id },
            { name: 'segmento', value: sub.segmento || segmento },
          ],
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Georgia, serif; background: #0A0A0A; color: #fff; margin: 0; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="font-size: 24px; margin: 0;"><span style="color:#fff">Mar</span><span style="color:#D4AF37">ple</span></h1>
                  <p style="color:#888; font-size: 11px; margin: 4px 0 0;">Newsletter Jurídica · ${nomeEscritorio}</p>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; padding: 32px;">
                  <h2 style="color: #D4AF37; margin: 0 0 20px;">${assunto.replace(/</g, '&lt;')}</h2>
                  <div style="color: #ccc; line-height: 1.8;">${htmlConteudo}</div>
                  ${ctaWhats}
                  ${utmBase ? `<p style="margin-top:24px;"><a href="${utmBase}" style="color:#D4AF37;font-size:12px;">Acessar a Marple</a></p>` : ''}
                </div>
                <p style="color:#555; font-size:11px; text-align:center; margin-top:24px;">
                  Você recebe esta newsletter de ${lawyer?.name || 'seu advogado'}.<br/>
                  Para cancelar inscrição, responda este email com "cancelar".
                </p>
              </div>
            </body>
            </html>
          `,
        })

        if (sendErr) continue

        const resendId = sent?.id || null
        await supabaseAdmin.from('newsletter_envios_destinatarios').insert({
          envio_id: envio.id,
          subscriber_id: sub.id,
          lawyer_id: user.id,
          office_id: lawyer?.office_id || null,
          email: sub.email,
          resend_email_id: resendId,
        })
        enviados++
      } catch { /* continua mesmo se um email falhar */ }
    }

    await supabaseAdmin
      .from('newsletter_envios')
      .update({ total_enviados: enviados })
      .eq('id', envio.id)

    return Response.json({
      ok: true,
      enviados,
      envio_id: envio.id,
      segmento,
      tags: tagsFiltro,
      whatsapp_cta: !!telefoneWa,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro'
    return Response.json({ error: msg }, { status: 500 })
  }
}
