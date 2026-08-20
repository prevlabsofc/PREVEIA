'use client'

import { BookMarked, ExternalLink, Search } from 'lucide-react'
import type { FonteJuridica } from '@/lib/fontes-juridicas'

interface FontesReferenciasProps {
  fontes: FonteJuridica[]
  isLight?: boolean
  /** Versão reduzida, para uso dentro de bolhas de chat. */
  compact?: boolean
  className?: string
}

const GOLD = '#D4AF37'

export function FontesReferencias({ fontes, isLight = false, compact = false, className = '' }: FontesReferenciasProps) {
  if (!fontes || fontes.length === 0) return null

  return (
    <div
      className={`rounded-xl overflow-hidden ${compact ? 'mt-3' : 'mt-4'} ${className}`}
      style={{
        background: isLight ? 'linear-gradient(90deg, #FFF8E8, #FFFDF7)' : 'rgba(212,175,55,0.06)',
        border: `1px solid ${isLight ? '#F0D890' : 'rgba(212,175,55,0.25)'}`,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: `1px solid ${isLight ? 'rgba(212,175,55,0.25)' : 'rgba(212,175,55,0.15)'}` }}
      >
        <BookMarked size={13} color={GOLD} className="flex-shrink-0" />
        <span className="text-[10px] font-bold tracking-widest" style={{ color: GOLD }}>
          FONTES E REFERÊNCIAS
        </span>
        <span className="text-[10px] ml-auto" style={{ color: isLight ? '#8A7B4E' : '#6b6b6b' }}>
          {fontes.length}
        </span>
      </div>

      <ul className="p-2 space-y-1">
        {fontes.map(fonte => (
          <li key={fonte.id}>
            <a
              href={fonte.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors duration-200 hover:bg-[rgba(212,175,55,0.1)]"
            >
              {fonte.busca ? (
                <Search size={11} color={GOLD} className="flex-shrink-0 mt-[3px] opacity-70" />
              ) : (
                <ExternalLink size={11} color={GOLD} className="flex-shrink-0 mt-[3px] opacity-70" />
              )}
              <span className="flex-1 min-w-0">
                <span
                  className="text-xs font-medium underline decoration-transparent group-hover:decoration-[rgba(212,175,55,0.6)] underline-offset-2 transition-colors"
                  style={{ color: isLight ? '#1E1E1E' : '#e5e5e5' }}
                >
                  {fonte.label}
                </span>
                {fonte.descricao && (
                  <span className="block text-[10px] leading-snug mt-0.5" style={{ color: isLight ? '#6B6B6B' : '#8a8a8a' }}>
                    {fonte.descricao}
                  </span>
                )}
              </span>
              <span
                className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  color: GOLD,
                  background: isLight ? 'rgba(212,175,55,0.14)' : 'rgba(212,175,55,0.12)',
                  border: `1px solid ${isLight ? 'rgba(212,175,55,0.3)' : 'rgba(212,175,55,0.2)'}`,
                }}
              >
                {fonte.orgao.toUpperCase()}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="px-3 pb-2 text-[9px] leading-snug" style={{ color: isLight ? '#8A7B4E' : '#666' }}>
        Links para portais oficiais. Itens com lupa abrem a busca oficial do órgão — confira sempre o inteiro teor antes de citar.
      </p>
    </div>
  )
}
