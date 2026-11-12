'use client'

import { type LucideIcon, ArrowRight } from 'lucide-react'

export type AgenteCatalogItem = {
  key: string
  nome: string
  desc: string
  tags: string[]
}

type Props = {
  agent: AgenteCatalogItem
  color: string
  Icon: LucideIcon
  isLight?: boolean
  onStart: () => void
}

/**
 * Card de catálogo: nome, descrição curta e CTA principal visível.
 */
export function AgenteCatalogCard({
  agent,
  color,
  Icon,
  isLight = false,
  onStart,
}: Props) {
  const titleColor = isLight ? '#1E1E1E' : '#fff'
  const muted = isLight ? '#6B7280' : '#888'
  const surface = isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)'
  const border = isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'

  return (
    <article
      className="group flex flex-col h-full p-4 rounded-xl transition-all cursor-pointer hover:scale-[1.01]"
      style={{
        background: surface,
        border: `1px solid ${border}`,
      }}
      onClick={onStart}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onStart()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Iniciar agente ${agent.nome}`}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}28` }}
          aria-hidden
        >
          <Icon size={17} color={color} />
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          Pronto
        </span>
      </div>

      <h3 className="text-sm font-bold mb-1.5 leading-snug" style={{ color: titleColor }}>
        {agent.nome}
      </h3>
      <p className="text-xs mb-3 leading-relaxed flex-1" style={{ color: muted }}>
        {agent.desc}
      </p>

      {agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: `${color}10`,
                color,
                border: `1px solid ${color}22`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="mt-auto w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity group-hover:opacity-100"
        style={{
          border: `1px solid ${color}45`,
          color,
          background: `${color}10`,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onStart()
        }}
      >
        Gerar petição
        <ArrowRight size={12} aria-hidden />
      </button>
    </article>
  )
}
