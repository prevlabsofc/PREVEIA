import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const { to, name, subject, html, convidado, escritorio } = await req.json()

    const nomeEscritorio = typeof escritorio === 'string' && escritorio.trim() ? escritorio.trim() : null
    const intro = convidado
      ? `Sua conta no <strong style="color: #fff;">Marple</strong> foi criada com sucesso. Ela já está <strong style="color: #D4AF37;">incluída no plano ${nomeEscritorio ? `de ${nomeEscritorio}` : 'do escritório que convidou você'}</strong> — não é preciso contratar nada.`
      : `Sua conta no <strong style="color: #fff;">Marple</strong> foi criada com sucesso. Você tem <strong style="color: #D4AF37;">7 dias de trial gratuito</strong> com 5 petições para explorar a plataforma.`

    const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"/></head>
        <body style="font-family: Georgia, serif; background: #0A0A0A; color: #fff; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 32px; font-weight: bold; margin: 0;">
                <span style="color: #fff;">Mar</span><span style="color: #D4AF37;">ple</span>
              </h1>
              <p style="color: #888; font-size: 12px; letter-spacing: 3px; margin: 4px 0 0;">INTELIGÊNCIA JURÍDICA COM IA</p>
            </div>

            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; padding: 32px;">
              <h2 style="color: #D4AF37; font-size: 22px; margin: 0 0 16px;">Bem-vindo, Dr. ${name}! 👋</h2>
              <p style="color: #ccc; line-height: 1.7; margin: 0 0 16px;">${intro}</p>

              <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="color: #D4AF37; font-weight: bold; margin: 0 0 12px; font-size: 13px;">O QUE VOCÊ PODE FAZER AGORA:</p>
                <ul style="color: #ccc; margin: 0; padding-left: 20px; line-height: 2;">
                  <li>Gerar petições previdenciárias com IA</li>
                  <li>Cadastrar seus clientes</li>
                  <li>Consultar jurisprudências</li>
                  <li>Usar a IA Consultora Jurídica</li>
                  <li>Analisar casos previdenciários</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #F0D060); color: #000; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px;">
                  Acessar a Plataforma →
                </a>
              </div>
            </div>

            <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
              © 2026 Marple · Inteligência Jurídica com IA · Todos os direitos reservados
            </p>
          </div>
        </body>
        </html>
      `

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@marple.com.br',
      to,
      subject: subject || 'Bem-vindo ao Marple! 🎉',
      html: html || welcomeHtml,
    })

    return Response.json({ ok: true })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}