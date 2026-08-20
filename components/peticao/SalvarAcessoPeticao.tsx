'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Check, Copy, Link2, Loader2, Mail, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG as QRCode } from 'qrcode.react'

type Props = {
  text: string
  fileName?: string
  agentType?: string | null
  clientId?: string | null
  clientName?: string | null
  /** Enquanto true, não gera o link (geração em andamento). */
  streaming?: boolean
  isLight?: boolean
}

type AcessoState = {
  documentId: string
  token: string
  url: string
}

/**
 * Seção "Salvar acesso": gera link único (token) para recuperar a petição
 * depois, mesmo fora do site — conceito "copia e cola", sem pagamento.
 */
export function SalvarAcessoPeticao({
  text,
  fileName = 'peticao',
  agentType = null,
  clientId = null,
  clientName = null,
  streaming = false,
  isLight = false,
}: Props) {
  const [acesso, setAcesso] = useState<AcessoState | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [mostrarQr, setMostrarQr] = useState(false)
  const [emailDestino, setEmailDestino] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailOk, setEmailOk] = useState(false)
  const autoFeito = useRef(false)
  const ultimoConteudoSalvo = useRef('')

  const muted = '#888'
  const texto = isLight ? '#1E1E1E' : '#eee'

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }, [])

  const salvar = useCallback(
    async (opts?: { regenerar?: boolean }) => {
      const content = text.trim()
      if (content.length < 20) return
      setGerando(true)
      setErro(null)
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/documento-acesso', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content,
            title: fileName.replace(/-/g, ' '),
            agent_type: agentType,
            client_id: clientId,
            client_name: clientName,
            document_id: acesso?.documentId || null,
            regenerar: Boolean(opts?.regenerar),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setErro(
            data.detalhe ||
              (data.error === 'unauthorized'
                ? 'Faça login para gerar o link de acesso.'
                : 'Não foi possível salvar o link de acesso.'),
          )
          return
        }
        ultimoConteudoSalvo.current = content
        if (data.token && data.url) {
          setAcesso({
            documentId: data.document_id,
            token: data.token,
            url: data.url,
          })
        } else if (data.document_id && acesso) {
          setAcesso((a) => (a ? { ...a, documentId: data.document_id } : a))
        } else if (data.document_id && !acesso) {
          // Conteúdo atualizado sem novo token — mantém estado se já tínhamos URL
          setAcesso((a) =>
            a
              ? { ...a, documentId: data.document_id }
              : null,
          )
        }
      } catch {
        setErro('Falha de rede ao gerar o link de acesso.')
      } finally {
        setGerando(false)
      }
    },
    [text, fileName, agentType, clientId, clientName, acesso, authHeaders],
  )

  // Auto-gera o link assim que a petição fica pronta (sem streaming)
  useEffect(() => {
    if (streaming) {
      autoFeito.current = false
      return
    }
    if (autoFeito.current) return
    if (text.trim().length < 40) return
    autoFeito.current = true
    void salvar({ regenerar: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, text])

  // Atualiza o conteúdo no banco (mesmo token) quando o usuário edita
  useEffect(() => {
    if (!acesso?.documentId || streaming) return
    const content = text.trim()
    if (content.length < 40) return
    if (content === ultimoConteudoSalvo.current) return
    const t = setTimeout(() => {
      void salvar({ regenerar: false })
    }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, acesso?.documentId, streaming])

  async function copiar() {
    if (!acesso?.url) return
    try {
      await navigator.clipboard.writeText(acesso.url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Selecione o link e copie manualmente.')
    }
  }

  async function enviarEmail() {
    if (!acesso?.url) return
    const to = emailDestino.trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setErro('Informe um e-mail válido para enviar o link.')
      return
    }
    setEnviandoEmail(true)
    setErro(null)
    setEmailOk(false)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/documento-acesso/enviar-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to,
          url: acesso.url,
          title: fileName.replace(/-/g, ' '),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(
          data.error === 'resend_nao_configurado'
            ? 'Envio de e-mail ainda não configurado (RESEND_API_KEY).'
            : data.error === 'email_invalido'
              ? 'E-mail inválido.'
              : 'Não foi possível enviar o e-mail.',
        )
        return
      }
      setEmailOk(true)
      setTimeout(() => setEmailOk(false), 4000)
    } catch {
      setErro('Falha de rede ao enviar o e-mail.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  return (
    <div
      className="mt-4 rounded-xl p-4"
      style={{
        background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(212,175,55,0.2)',
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link2 size={15} color="#D4AF37" />
            <span className="text-sm font-bold" style={{ color: texto }}>
              Salvar acesso
            </span>
          </div>
          <p className="text-[11px]" style={{ color: muted }}>
            Link único para recuperar este documento depois — mesmo saindo do site
            (sem login). Guarde como um &quot;copia e cola&quot;.
          </p>
        </div>
        {acesso && (
          <button
            type="button"
            onClick={() => void salvar({ regenerar: true })}
            disabled={gerando}
            className="px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1 disabled:opacity-50"
            style={{ border: '1px solid rgba(255,255,255,0.12)', color: muted }}
            title="Invalida o link anterior e gera um novo"
          >
            <RefreshCw size={12} className={gerando ? 'animate-spin' : ''} />
            Novo link
          </button>
        )}
      </div>

      {gerando && !acesso && (
        <div className="flex items-center gap-2 text-xs py-2" style={{ color: muted }}>
          <Loader2 size={14} className="animate-spin" color="#D4AF37" />
          Gerando link de acesso…
        </div>
      )}

      {erro && (
        <p className="text-xs mb-2" style={{ color: '#EF4444' }}>
          {erro}
        </p>
      )}

      {acesso?.url && (
        <div className="space-y-3">
          <div className="flex gap-2 items-stretch">
            <input
              readOnly
              value={acesso.url}
              className="flex-1 min-w-0 px-3 text-xs rounded-lg"
              style={{
                height: 40,
                background: isLight ? '#fff' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: texto,
              }}
              spellCheck={false}
              onFocus={(e) => e.target.select()}
              aria-label="Link de acesso ao documento"
            />
            <button
              type="button"
              onClick={() => void copiar()}
              className="px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0"
              style={{
                background: copiado
                  ? 'rgba(34,197,94,0.15)'
                  : 'linear-gradient(135deg,#D4AF37,#F0D060)',
                color: copiado ? '#22C55E' : '#000',
                border: copiado ? '1px solid rgba(34,197,94,0.3)' : 'none',
              }}
            >
              {copiado ? <Check size={13} /> : <Copy size={13} />}
              {copiado ? 'Copiado' : 'Copiar link'}
            </button>
          </div>

          <div className="flex gap-2 items-stretch flex-wrap">
            <input
              type="email"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              placeholder="E-mail do destinatário (opcional)"
              className="flex-1 min-w-[180px] px-3 text-xs rounded-lg"
              style={{
                height: 40,
                background: isLight ? '#fff' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: texto,
              }}
              aria-label="E-mail para enviar o link"
            />
            <button
              type="button"
              onClick={() => void enviarEmail()}
              disabled={enviandoEmail || !emailDestino.trim()}
              className="px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
              style={{
                background: emailOk
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(212,175,55,0.12)',
                color: emailOk ? '#22C55E' : '#D4AF37',
                border: emailOk
                  ? '1px solid rgba(34,197,94,0.3)'
                  : '1px solid rgba(212,175,55,0.35)',
                height: 40,
              }}
            >
              {enviandoEmail ? (
                <Loader2 size={13} className="animate-spin" />
              ) : emailOk ? (
                <Check size={13} />
              ) : (
                <Mail size={13} />
              )}
              {enviandoEmail ? 'Enviando…' : emailOk ? 'Enviado' : 'Enviar por e-mail'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMostrarQr((v) => !v)}
            className="text-[11px] flex items-center gap-1.5 transition-colors"
            style={{ color: mostrarQr ? '#D4AF37' : muted }}
          >
            <QrCode size={13} />
            {mostrarQr ? 'Ocultar QR code' : 'Mostrar QR code (opcional)'}
          </button>

          {mostrarQr && (
            <div
              className="inline-flex p-3 rounded-xl"
              style={{ background: '#fff' }}
            >
              <QRCode value={acesso.url} size={140} fgColor="#000" bgColor="#fff" />
            </div>
          )}
        </div>
      )}

      {!gerando && !acesso && !erro && text.trim().length >= 40 && !streaming && (
        <button
          type="button"
          onClick={() => {
            autoFeito.current = true
            void salvar({ regenerar: true })
          }}
          className="px-3 py-2 rounded-lg text-xs font-medium"
          style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
        >
          Gerar link de acesso
        </button>
      )}
    </div>
  )
}
