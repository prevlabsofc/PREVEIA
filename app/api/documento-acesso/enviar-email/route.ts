import { Resend } from 'resend'
import { sessaoDaRequisicao } from '@/lib/permissions/sessao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * POST — envia o link público do documento por e-mail (Resend).
 * Body: { to, url, title?, escritorio? }
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req)
  if (!sessao) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'body_invalido' }, { status: 400 })
  }

  const to = String(body.to || '').trim().toLowerCase()
  const url = String(body.url || '').trim()
  const title = String(body.title || 'Documento jurídico').slice(0, 200)
  const escritorio = String(body.escritorio || '').trim() || 'Marple'

  if (!EMAIL_RE.test(to)) {
    return Response.json({ error: 'email_invalido' }, { status: 400 })
  }
  if (!url.includes('/documento/')) {
    return Response.json({ error: 'url_invalida' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'resend_nao_configurado' }, { status: 500 })
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: Georgia, serif; background: #0A0A0A; color: #fff; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 32px; font-weight: bold; margin: 0;">
        <span style="color: #fff;">Mar</span><span style="color: #D4AF37;">ple</span>
      </h1>
      <p style="color: #888; font-size: 12px; letter-spacing: 3px; margin: 4px 0 0;">ACESSO AO DOCUMENTO</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; padding: 32px;">
      <h2 style="color: #D4AF37; font-size: 20px; margin: 0 0 16px;">Seu documento está pronto</h2>
      <p style="color: #ccc; line-height: 1.7; margin: 0 0 12px;">
        <strong style="color:#fff;">${escapeHtml(escritorio)}</strong> compartilhou o documento
        <strong style="color:#fff;">${escapeHtml(title)}</strong> com você.
      </p>
      <p style="color: #aaa; line-height: 1.6; margin: 0 0 24px; font-size: 14px;">
        Use o link abaixo para visualizar e baixar (PDF/DOCX/TXT) sem necessidade de login.
      </p>
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${escapeHtml(url)}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #F0D060); color: #000; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          Abrir documento →
        </a>
      </div>
      <p style="color: #666; font-size: 11px; word-break: break-all; line-height: 1.5;">
        ${escapeHtml(url)}
      </p>
    </div>
    <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
      © ${new Date().getFullYear()} Marple · Inteligência Jurídica com IA
    </p>
  </div>
</body>
</html>`

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@marple.com.br',
      to,
      subject: `Acesso ao documento — ${title}`,
      html,
    })
    return Response.json({ ok: true })
  } catch (e) {
    console.error('[documento-acesso/enviar-email]', e)
    return Response.json({ error: 'falha_email' }, { status: 500 })
  }
}
