'use client'

import { useCallback, useEffect, useRef, useState, CSSProperties, ReactNode, RefObject } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

type Orientation = 'vertical' | 'horizontal'

interface ScrollAffordance {
  /** Há conteúdo além da área visível (em qualquer direção). */
  scrollable: boolean
  /** Está no início (topo / extrema esquerda). */
  atStart: boolean
  /** Está no fim (base / extrema direita). */
  atEnd: boolean
  /** Remede o container — útil após inserir conteúdo de forma imperativa. */
  measure: () => void
}

/**
 * Observa o estado real de rolagem de um container: se ele de fato rola e se
 * está no início/fim. Serve para só exibir indicadores quando fazem sentido —
 * um degradê fixo em container que não rola é pior do que degradê nenhum.
 */
export function useScrollAffordance<T extends HTMLElement>(
  ref: RefObject<T | null>,
  orientation: Orientation = 'vertical'
): ScrollAffordance {
  const [state, setState] = useState({ scrollable: false, atStart: true, atEnd: true })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const horizontal = orientation === 'horizontal'
    const size = horizontal ? el.clientWidth : el.clientHeight
    const total = horizontal ? el.scrollWidth : el.scrollHeight
    const pos = horizontal ? Math.abs(el.scrollLeft) : el.scrollTop
    const overflow = total - size

    setState(prev => {
      const next = {
        scrollable: overflow > 2,
        atStart: pos <= 2,
        atEnd: pos >= overflow - 2,
      }
      return prev.scrollable === next.scrollable && prev.atStart === next.atStart && prev.atEnd === next.atEnd
        ? prev
        : next
    })
  }, [ref, orientation])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    measure()
    el.addEventListener('scroll', measure, { passive: true })

    // Conteúdo assíncrono (listas do Supabase, acordeões) muda o scrollHeight
    // sem gerar evento de scroll — daí o Resize + Mutation observer.
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)
    Array.from(el.children).forEach(child => resizeObserver.observe(child))

    const mutationObserver = new MutationObserver(() => {
      measure()
      Array.from(el.children).forEach(child => resizeObserver.observe(child))
    })
    mutationObserver.observe(el, { childList: true, subtree: true, characterData: true })

    window.addEventListener('resize', measure)

    return () => {
      el.removeEventListener('scroll', measure)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, measure])

  return { ...state, measure }
}

interface ScrollFadeProps {
  children: ReactNode
  /** Eixo de rolagem. Padrão: vertical. */
  orientation?: Orientation
  /** Classes do elemento que rola (o overflow já é aplicado). */
  className?: string
  /** Estilo do elemento que rola — use para maxHeight/height. */
  style?: CSSProperties
  /** Classes do wrapper posicionado (relative). */
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  /** Cor do degradê em "r,g,b". Padrão: fundo do tema. */
  fadeRgb?: string
  /** Espessura do degradê em px. Padrão: 44 (vertical) / 36 (horizontal). */
  fadeSize?: number
  /** Seta pulsante indicando que há mais conteúdo. Padrão: true. */
  chevron?: boolean
  /** Arredondamento do wrapper, para o degradê não vazar do card. */
  radius?: number | string
}

/**
 * Container rolável com degradê nas bordas indicando que há mais conteúdo.
 * O degradê aparece só quando existe conteúdo naquela direção e nunca bloqueia
 * cliques (pointer-events-none).
 */
export function ScrollFade({
  children,
  orientation = 'vertical',
  className = '',
  style,
  wrapperClassName = '',
  wrapperStyle,
  fadeRgb,
  fadeSize,
  chevron = true,
  radius,
}: ScrollFadeProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollable, atStart, atEnd } = useScrollAffordance(ref, orientation)
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const horizontal = orientation === 'horizontal'
  const rgb = fadeRgb ?? (isLight ? '255,255,255' : '10,10,10')
  const size = fadeSize ?? (horizontal ? 36 : 44)

  const gradient = (to: string) =>
    `linear-gradient(${to}, rgba(${rgb},0.96) 0%, rgba(${rgb},0.72) 40%, rgba(${rgb},0) 100%)`

  const showStart = scrollable && !atStart
  const showEnd = scrollable && !atEnd

  return (
    <div
      className={`relative min-h-0 ${wrapperClassName}`}
      style={{ borderRadius: radius, overflow: radius ? 'hidden' : undefined, ...wrapperStyle }}
    >
      {/*
        O elemento que rola precisa ser o que recebe hit-test. Overlays (degradê /
        chevron) ficam acima só visualmente, com pointer-events:none em cascata
        (inline) para nenhum “fantasma” no rodapé bloquear scroll/clique.
      */}
      <div
        ref={ref}
        className={`scroll-area relative z-0 min-h-0 ${horizontal ? 'overflow-x-auto' : 'overflow-y-auto'} overscroll-contain ${className}`}
        style={style}
      >
        {children}
      </div>

      <div
        aria-hidden
        className={`pointer-events-none absolute z-[1] transition-opacity duration-200 ${
          horizontal ? 'inset-y-0 left-0' : 'inset-x-0 top-0'
        } ${showStart ? 'opacity-100' : 'opacity-0'}`}
        style={{
          pointerEvents: 'none',
          width: horizontal ? size : undefined,
          height: horizontal ? undefined : size,
          background: gradient(horizontal ? 'to right' : 'to bottom'),
        }}
      />

      <div
        aria-hidden
        className={`pointer-events-none absolute z-[1] transition-opacity duration-200 ${
          horizontal ? 'inset-y-0 right-0' : 'inset-x-0 bottom-0'
        } ${showEnd ? 'opacity-100' : 'opacity-0'}`}
        style={{
          pointerEvents: 'none',
          width: horizontal ? size : undefined,
          height: horizontal ? undefined : size,
          background: gradient(horizontal ? 'to left' : 'to top'),
        }}
      />

      {chevron && (
        <div
          aria-hidden
          className={`pointer-events-none absolute z-[1] transition-opacity duration-200 ${
            horizontal ? 'right-1.5 top-1/2 -translate-y-1/2' : 'bottom-1.5 left-1/2 -translate-x-1/2'
          } ${showEnd ? 'opacity-100' : 'opacity-0'}`}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`pointer-events-none flex items-center justify-center rounded-full ${
              horizontal ? 'animate-scroll-hint-x' : 'animate-scroll-hint-y'
            }`}
            style={{
              pointerEvents: 'none',
              width: 22,
              height: 22,
              background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(20,18,10,0.92)',
              border: '1px solid rgba(212,175,55,0.45)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            }}
          >
            {horizontal ? <ChevronRight size={13} color="#D4AF37" /> : <ChevronDown size={13} color="#D4AF37" />}
          </div>
        </div>
      )}
    </div>
  )
}
