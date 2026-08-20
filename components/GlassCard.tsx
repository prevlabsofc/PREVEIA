'use client'

import { useState, useEffect, ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  gold?: boolean
  intensity?: number
  style?: React.CSSProperties
  onClick?: () => void
  /** Aplicado ao wrapper interno do conteúdo. Necessário quando o card é um
   *  container flex, pois o conteúdo não é filho direto do card. */
  contentClassName?: string
  contentStyle?: React.CSSProperties
}

export function GlassCard({ children, className = '', gold = false, intensity = 1, style = {}, onClick, contentClassName = '', contentStyle }: GlassCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const c = gold ? '212,175,55' : '255,255,255'
  const blurPx = Math.round(32 * intensity)
  const borderAlpha = isHovered ? (gold ? 0.4 : 0.28) : (gold ? 0.25 : 0.14)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative overflow-hidden transition-[border-color,box-shadow] duration-300 ${className}`}
      style={{
        background: isLight
          ? (gold ? 'linear-gradient(90deg, #FFF4D6, #FFF8E8)' : '#FFFFFF')
          : (gold
            ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.03) 45%, rgba(255,255,255,0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.015) 100%)'),
        backdropFilter: `blur(${blurPx}px) saturate(200%) brightness(1.08) contrast(1.05)`,
        WebkitBackdropFilter: `blur(${blurPx}px) saturate(200%) brightness(1.08) contrast(1.05)`,
        border: isLight
          ? `1px solid ${gold ? '#F0D890' : '#EDEDED'}`
          : `1px solid rgba(${c}, ${borderAlpha})`,
        borderRadius: 24,
        boxShadow: isLight
          ? '0 1px 2px rgba(0,0,0,0.03)'
          : isHovered
            ? `0 20px 60px rgba(0,0,0,0.45), 0 0 20px rgba(212,175,55,0.08), inset 0 1.5px 1px rgba(255,255,255,0.3), inset 0 -1.5px 3px rgba(0,0,0,0.35)`
            : `0 20px 60px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.35), inset 0 1.5px 1px rgba(255,255,255,0.3), inset 0 -1.5px 3px rgba(0,0,0,0.35), inset 1.5px 0 1px rgba(255,255,255,0.1), inset -1.5px 0 1px rgba(255,255,255,0.1)`,
        ...style,
      }}
    >
      {/* Highlight estático no topo — sem blur dinâmico */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 18%, transparent 100%)',
        borderRadius: 'inherit',
      }}/>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, rgba(${c},0.6), transparent)`,
      }}/>

      <div className={`relative z-10 ${contentClassName}`} style={contentStyle}>
        {children}
      </div>
    </div>
  )
}
