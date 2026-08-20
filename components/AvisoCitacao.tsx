'use client'

import { useMemo } from 'react'
import { temCitacaoJuridica } from '@/lib/detectar-citacoes'

export const TEXTO_AVISO_CITACAO =
  '⚠️ Verifique esta citação na fonte oficial antes de usar — IAs podem cometer erros em referências jurídicas específicas.'

interface AvisoCitacaoProps {
  /** Conteúdo gerado por IA que será inspecionado em busca de citações jurídicas. */
  text: string
  isLight?: boolean
  className?: string
}

export function AvisoCitacao({ text, isLight = false, className = '' }: AvisoCitacaoProps) {
  const mostrar = useMemo(() => temCitacaoJuridica(text), [text])

  if (!mostrar) return null

  return (
    <div
      role="note"
      title={TEXTO_AVISO_CITACAO}
      className={`rounded-lg px-2.5 py-1.5 text-[10px] leading-snug whitespace-normal ${className}`}
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.2)',
        color: isLight ? '#B45309' : '#F59E0B',
      }}
    >
      {TEXTO_AVISO_CITACAO}
    </div>
  )
}
