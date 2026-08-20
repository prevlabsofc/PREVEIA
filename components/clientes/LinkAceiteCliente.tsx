'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Check,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldOff,
} from 'lucide-react'
import {
  linkWhatsAppAceite,
  telefoneParaWaMe,
} from '@/lib/aprovacao-cliente-shared'

type Props = {
  clientId: string
  isLight?: boolean
}

type LinkGerado = {
  id: string
  url: string
  expires_at: string | null
  telefone: string | null
  email: string | null
  nome: string | null
  escritorio?: string | null
}

type HistoricoItem = {
  id: string
  status: string
  created_at: string
  expires_at: string | null
  accepted_at: string | null
}

const STATUS_ROTULO: Record<string, string> = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  recusado: 'Recusado',
  expirado: 'Expirado',
  revogado: 'Revogado',
}

const STATUS_COR: Record<string, string> = {
  pendente: '#F59E0B',
  aceito: '#22C55E',
  recusado: '#EF4444',
  expirado: '#888',
  revogado: '#888',
}

/**
 * Bloco isolado da ficha do cliente: gera link público de revisão/aceite,
 * copia URL, abre WhatsApp (wa.me) e reenvia e-mail via Resend.
 * Não altera layout do dashboard — montagem cirúrgica em /clientes/[id].
 */
export default function LinkAceiteCliente({ clientId, isLight = false }: Props) {
  const [aberto, setAberto] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [revogando, setRevogando] = useState(false)
  const [link, setLink] = useState<LinkGerado | null>(null)
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const texto = isLight ? '#1E1E1E' : '#fff'
  const muted = '#888'

  useEffect(() => {
    if (!aberto) return
    void carregarHistorico()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, clientId])

  async function authHeaders(): Promise<HeadersInit> {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }

  async function carregarHistorico() {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/aprovacoes-cliente?client_id=${encodeURIComponent(clientId)}`, {
        headers,
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setHistorico(Array.isArray(data.aprovacoes) ? data.aprovacoes : [])
    } catch {
      /* silencioso */
    }
  }

  async function gerarLink(enviarEmail = false) {
    setGerando(true)
    setErro(null)
    setFeedback(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/aprovacoes-cliente', {
        method: 'POST',
        headers,
        body: JSON.stringify({ client_id: clientId, enviar_email: enviarEmail }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro('Não foi possível gerar o link. Verifique permissões e tente de novo.')
        return
      }
      setLink({
        id: data.id,
        url: data.url,
        expires_at: data.expires_at,
        telefone: data.telefone,
        email: data.email,
        nome: data.nome,
        escritorio: data.snapshot?.escritorio_nome || null,
      })
      setFeedback(
        enviarEmail && data.email_enviado
          ? 'Link gerado e e-mail enviado.'
          : enviarEmail && data.email
            ? 'Link gerado. Não foi possível enviar o e-mail automaticamente.'
            : 'Link gerado. Envie por WhatsApp ou e-mail.'
      )
      void carregarHistorico()
    } catch {
      setErro('Falha de rede ao gerar o link.')
    } finally {
      setGerando(false)
    }
  }

  async function copiar() {
    if (!link?.url) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Selecione o link manualmente.')
    }
  }

  function abrirWhatsApp() {
    if (!link?.url) return
    const wa = telefoneParaWaMe(link.telefone)
    if (!wa) {
      setErro('Cliente sem telefone/WhatsApp cadastrado.')
      return
    }
    window.open(linkWhatsAppAceite(wa, link.url, link.nome), '_blank', 'noopener,noreferrer')
  }

  async function enviarEmail() {
    if (!link?.url) return
    if (!link.email) {
      setErro('Cliente sem e-mail cadastrado.')
      return
    }
    setEnviandoEmail(true)
    setErro(null)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/aprovacoes-cliente/enviar-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: link.email,
          url: link.url,
          nome: link.nome,
          escritorio: link.escritorio,
        }),
      })
      if (!res.ok) {
        setErro('Não foi possível enviar o e-mail.')
        return
      }
      setFeedback('E-mail enviado ao cliente.')
    } catch {
      setErro('Falha de rede ao enviar e-mail.')
    } finally {
      setEnviandoEmail(false)
    }
  }

  async function revogar() {
    if (!link?.id || revogando) return
    setRevogando(true)
    setErro(null)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/aprovacoes-cliente/${link.id}/revogar`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) {
        setErro('Não foi possível revogar o link.')
        return
      }
      setLink(null)
      setFeedback('Link revogado. Gere um novo se precisar.')
      void carregarHistorico()
    } catch {
      setErro('Falha de rede ao revogar.')
    } finally {
      setRevogando(false)
    }
  }

  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: isLight ? '#fff' : 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(212,175,55,0.2)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: texto }}>
            <Link2 size={16} color="#D4AF37" />
            Aceite formal do cliente
          </h3>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: muted }}>
            Gere um link seguro para o cliente revisar os dados do caso e confirmar antes do protocolo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg shrink-0"
          style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
        >
          {aberto ? 'Fechar' : 'Abrir'}
        </button>
      </div>

      {aberto && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={gerando}
              onClick={() => void gerarLink(false)}
              className="btn-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw size={13} className={gerando ? 'animate-spin' : ''} />
              {gerando ? 'Gerando…' : link ? 'Regenerar link' : 'Gerar link de aceite'}
            </button>
            <button
              type="button"
              disabled={gerando}
              onClick={() => void gerarLink(true)}
              className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: muted }}
            >
              <Mail size={13} />
              Gerar e enviar e-mail
            </button>
          </div>

          {link && (
            <div
              className="rounded-xl p-3 space-y-3"
              style={{ background: isLight ? '#F8F8F8' : 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-[10px] uppercase tracking-wider" style={{ color: muted }}>
                Link público (mostre só uma vez — o token não fica salvo)
              </div>
              <div className="flex gap-2 items-stretch">
                <input
                  readOnly
                  value={link.url}
                  className="flex-1 min-w-0 px-3 text-xs rounded-lg"
                  style={{
                    height: 38,
                    background: isLight ? '#fff' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: texto,
                  }} spellCheck={true}
                />
                <button
                  type="button"
                  onClick={() => void copiar()}
                  className="px-3 rounded-lg text-xs flex items-center gap-1"
                  style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                >
                  {copiado ? <Check size={13} /> : <Copy size={13} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              {link.expires_at && (
                <p className="text-[11px]" style={{ color: muted }}>
                  Expira em {new Date(link.expires_at).toLocaleString('pt-BR')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={abrirWhatsApp}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}
                >
                  <MessageCircle size={13} /> Enviar WhatsApp
                </button>
                <button
                  type="button"
                  disabled={enviandoEmail}
                  onClick={() => void enviarEmail()}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: muted }}
                >
                  <Mail size={13} /> {enviandoEmail ? 'Enviando…' : 'Enviar e-mail'}
                </button>
                <button
                  type="button"
                  disabled={revogando}
                  onClick={() => void revogar()}
                  className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
                >
                  <ShieldOff size={13} /> {revogando ? 'Revogando…' : 'Revogar'}
                </button>
              </div>
            </div>
          )}

          {feedback && (
            <p className="text-xs" style={{ color: '#86EFAC' }}>{feedback}</p>
          )}
          {erro && (
            <p className="text-xs" style={{ color: '#FCA5A5' }}>{erro}</p>
          )}

          {historico.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: muted }}>
                Histórico recente
              </div>
              <ul className="space-y-1.5">
                {historico.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)' }}
                  >
                    <span style={{ color: muted }}>
                      {new Date(h.created_at).toLocaleString('pt-BR')}
                    </span>
                    <span
                      className="font-bold text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        color: STATUS_COR[h.status] || muted,
                        background: `${STATUS_COR[h.status] || muted}18`,
                      }}
                    >
                      {STATUS_ROTULO[h.status] || h.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
