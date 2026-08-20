'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, LogIn, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

interface Props {
  isLight: boolean
}

/**
 * Aceita URL completa, host sem protocolo ou path relativo com ?invite=TOKEN
 * (ou ?convite=, formato legado dos links gerados em /equipe).
 * Exemplos válidos:
 * - https://marple.com.br/onboarding?invite=ABC123
 * - marple.com.br/onboarding?invite=ABC123
 * - /onboarding?invite=ABC123
 * - onboarding?invite=ABC123
 * - /registro?invite=ABC123
 * - /registro?convite=ABC123
 */
export function parseInviteLink(raw: string): { ok: true; token: string } | { ok: false; erro: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, erro: 'Cole o link de convite para continuar.' }
  }

  let candidate = trimmed
  // Path relativo sem barra inicial: onboarding?invite=...
  if (!/^https?:\/\//i.test(candidate) && !candidate.startsWith('/') && !candidate.includes('://')) {
    if (candidate.includes('?') || candidate.includes('/')) {
      // Host sem protocolo (marple.com.br/...) ou path relativo (onboarding?...)
      if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(candidate.split(/[/?#]/)[0] || '')) {
        candidate = `https://${candidate}`
      } else {
        candidate = `/${candidate}`
      }
    } else {
      return { ok: false, erro: 'Use um link com ?invite=TOKEN, como marple.com.br/onboarding?invite=SEU_CODIGO.' }
    }
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://marple.com.br'
    const parsed = new URL(candidate, base)
    const path = parsed.pathname.replace(/\/+$/, '').toLowerCase()
    const pathOk = path.endsWith('/onboarding') || path.endsWith('/registro') || path === '/onboarding' || path === '/registro'
    if (!pathOk) {
      return {
        ok: false,
        erro: 'O link deve ser de onboarding ou registro. Ex.: marple.com.br/onboarding?invite=TOKEN',
      }
    }
    const token = (parsed.searchParams.get('invite') || parsed.searchParams.get('convite') || '').trim()
    if (!token) {
      return {
        ok: false,
        erro: 'O link precisa ter o parâmetro invite. Ex.: marple.com.br/onboarding?invite=TOKEN',
      }
    }
    return { ok: true, token }
  } catch {
    return { ok: false, erro: 'Não foi possível ler esse link. Verifique se está completo e tente de novo.' }
  }
}

export function EntrarEscritorioCard({ isLight }: Props) {
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const title = isLight ? '#1E1E1E' : '#fff'
  const muted = isLight ? '#5E5E5E' : '#9ca3af'
  const inputBg = isLight ? '#F8F8F8' : 'rgba(255,255,255,0.04)'
  const inputBorder = isLight ? '#E0E0E0' : 'rgba(212,175,55,0.2)'

  async function entrar() {
    const result = parseInviteLink(link)
    if (!result.ok) {
      setErro(result.erro)
      return
    }

    setErro('')
    setLoading(true)
    try {
      const res = await fetch(`/api/validar-convite?codigo=${encodeURIComponent(result.token)}`)
      if (!res.ok) {
        setErro('Não foi possível validar o convite. Tente novamente em instantes.')
        return
      }
      const data = await res.json() as { valido?: boolean }
      if (!data.valido) {
        setErro('Este convite é inválido, expirou ou já foi utilizado.')
        return
      }
      window.location.assign(`/onboarding?invite=${encodeURIComponent(result.token)}`)
    } catch {
      setErro('Falha ao validar o convite. Verifique sua conexão e tente de novo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <GlassCard gold intensity={0.5} style={{ padding: 24 }}>
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={18} color="#D4AF37"/>
          <h3 className="font-bold" style={{ color: title }}>
            Você ainda não faz parte de um escritório
          </h3>
        </div>
        <p className="text-sm mb-4" style={{ color: muted }}>
          Cole o link de convite recebido para entrar no escritório e completar o cadastro.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <label htmlFor="link-convite-equipe" className="sr-only">
              Cole aqui o link de convite recebido
            </label>
            <input
              id="link-convite-equipe"
              type="text"
              value={link}
              onChange={e => { setLink(e.target.value); if (erro) setErro('') }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!loading) void entrar() } }}
              placeholder="Cole aqui o link de convite recebido"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: inputBg,
                border: `1px solid ${erro ? '#EF4444' : inputBorder}`,
                color: title,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void entrar()}
            disabled={loading}
            className="btn-gold flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm flex-shrink-0 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin"/> : <LogIn size={16}/>}
            {loading ? 'Validando...' : 'Entrar no escritório'}
          </button>
        </div>

        {erro ? (
          <p className="text-xs mt-2" style={{ color: '#EF4444' }} role="alert">{erro}</p>
        ) : (
          <p className="text-xs mt-2" style={{ color: muted }}>
            Aceita links de onboarding ou registro com ?invite= (ou ?convite=)
          </p>
        )}
      </GlassCard>
    </motion.div>
  )
}
