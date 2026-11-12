'use client'

import { AlertCircle, CheckCircle2, Loader2, Search, Sparkles } from 'lucide-react'

type Props = {
  variant: 'vazio' | 'carregando' | 'gerando' | 'concluido' | 'erro'
  titulo?: string
  mensagem?: string
  isLight?: boolean
  acao?: { label: string; onClick: () => void }
}

const ESTILOS: Record<
  Props['variant'],
  { border: string; bg: string; icon: string; Icon: typeof Loader2 }
> = {
  vazio: {
    border: 'rgba(255,255,255,0.08)',
    bg: 'rgba(255,255,255,0.02)',
    icon: '#888',
    Icon: Search,
  },
  carregando: {
    border: 'rgba(212,175,55,0.25)',
    bg: 'rgba(212,175,55,0.06)',
    icon: '#D4AF37',
    Icon: Loader2,
  },
  gerando: {
    border: 'rgba(212,175,55,0.35)',
    bg: 'rgba(212,175,55,0.08)',
    icon: '#D4AF37',
    Icon: Sparkles,
  },
  concluido: {
    border: 'rgba(34,197,94,0.3)',
    bg: 'rgba(34,197,94,0.08)',
    icon: '#22C55E',
    Icon: CheckCircle2,
  },
  erro: {
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.08)',
    icon: '#EF4444',
    Icon: AlertCircle,
  },
}

/**
 * Banner/estado visual reutilizável para a aba de agentes.
 */
export function AgentesEstado({
  variant,
  titulo,
  mensagem,
  isLight = false,
  acao,
}: Props) {
  const s = ESTILOS[variant]
  const Icon = s.Icon
  const text = isLight ? '#1E1E1E' : '#fff'
  const muted = isLight ? '#6B7280' : '#888'

  return (
    <div
      role={variant === 'erro' ? 'alert' : 'status'}
      className="rounded-2xl px-5 py-6 text-center"
      style={{
        border: `1px ${variant === 'vazio' ? 'dashed' : 'solid'} ${s.border}`,
        background: s.bg,
      }}
    >
      <Icon
        size={28}
        color={s.icon}
        className={`mx-auto mb-2 ${variant === 'carregando' || variant === 'gerando' ? 'animate-spin' : ''}`}
        aria-hidden
      />
      {titulo && (
        <p className="text-sm font-bold mb-1" style={{ color: text }}>
          {titulo}
        </p>
      )}
      {mensagem && (
        <p className="text-xs max-w-md mx-auto" style={{ color: muted }}>
          {mensagem}
        </p>
      )}
      {acao && (
        <button
          type="button"
          onClick={acao.onClick}
          className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors hover:opacity-90"
          style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
        >
          {acao.label}
        </button>
      )}
    </div>
  )
}
