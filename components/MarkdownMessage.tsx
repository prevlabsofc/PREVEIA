'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FontesReferencias } from '@/components/FontesReferencias'
import { ScrollFade } from '@/components/ScrollFade'
import { extrairFontes } from '@/lib/fontes-juridicas'

const GOLD = '#D4AF37'

/** react-markdown v10 não informa mais se um `code` é inline, então o `pre` sinaliza via contexto. */
const InsidePre = createContext(false)

interface Palette {
  text: string
  heading: string
  muted: string
  border: string
  surface: string
  goldSurface: string
}

function palette(isLight: boolean): Palette {
  return isLight
    ? {
        text: '#1E1E1E',
        heading: '#111111',
        muted: '#5E5E5E',
        border: 'rgba(0,0,0,0.09)',
        surface: 'rgba(0,0,0,0.035)',
        goldSurface: 'linear-gradient(90deg, #FFF4D6, #FFF8E8)',
      }
    : {
        text: '#DEDEDE',
        heading: '#FFFFFF',
        muted: '#9A9A9A',
        border: 'rgba(255,255,255,0.09)',
        surface: 'rgba(255,255,255,0.035)',
        goldSurface: 'rgba(212,175,55,0.08)',
      }
}

function makeCode(p: Palette) {
  return function Code({ children }: { children?: ReactNode }) {
    if (useContext(InsidePre)) return <code className="font-mono">{children}</code>
    return (
      <code
        className="font-mono text-[0.9em] px-1.5 py-0.5 rounded"
        style={{ background: p.surface, border: `1px solid ${p.border}`, color: GOLD }}
      >
        {children}
      </code>
    )
  }
}

function buildComponents(p: Palette, compact: boolean, isLight: boolean): Components {
  const gap = compact ? 'my-2' : 'my-3'

  return {
    h1: ({ children }) => (
      <h1
        className="text-[15px] font-black tracking-tight mt-5 mb-3 pb-2 first:mt-0"
        style={{ color: p.heading, borderBottom: `1px solid rgba(212,175,55,0.3)` }}
      >
        {children}
      </h1>
    ),

    /* Cabeçalho de seção em faixa — separa visualmente blocos como fundamentação, conclusão e precedentes. */
    h2: ({ children }) => (
      <h2
        className="text-[13px] font-bold tracking-wide mt-5 mb-2.5 px-3 py-2 rounded-lg first:mt-0"
        style={{
          color: p.heading,
          background: p.goldSurface,
          borderLeft: `3px solid ${GOLD}`,
        }}
      >
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 className="text-[12px] font-bold tracking-wide mt-4 mb-1.5 first:mt-0" style={{ color: GOLD }}>
        {children}
      </h3>
    ),

    h4: ({ children }) => (
      <h4 className="text-[12px] font-semibold mt-3 mb-1.5 first:mt-0" style={{ color: p.heading }}>
        {children}
      </h4>
    ),

    p: ({ children }) => (
      <p className={`${gap} leading-[1.75] first:mt-0 last:mb-0`} style={{ color: p.text }}>
        {children}
      </p>
    ),

    strong: ({ children }) => (
      <strong className="font-bold" style={{ color: p.heading }}>
        {children}
      </strong>
    ),

    em: ({ children }) => <em style={{ color: p.text }}>{children}</em>,

    ul: ({ children }) => (
      <ul
        className={`${gap} pl-5 space-y-1.5 list-disc marker:text-[#D4AF37] first:mt-0 last:mb-0`}
        style={{ color: p.text }}
      >
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol
        className={`${gap} pl-5 space-y-1.5 list-decimal marker:text-[#D4AF37] marker:font-bold first:mt-0 last:mb-0`}
        style={{ color: p.text }}
      >
        {children}
      </ol>
    ),

    li: ({ children }) => (
      <li className="leading-[1.7] pl-1" style={{ color: p.text }}>
        {children}
      </li>
    ),

    blockquote: ({ children }) => (
      <blockquote
        className={`${gap} px-4 py-2.5 rounded-r-lg italic`}
        style={{ borderLeft: `3px solid ${GOLD}`, background: p.surface, color: p.muted }}
      >
        {children}
      </blockquote>
    ),

    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 transition-opacity hover:opacity-80"
        style={{ color: GOLD }}
      >
        {children}
      </a>
    ),

    hr: () => <hr className="my-4" style={{ border: 'none', borderTop: `1px solid ${p.border}` }} />,

    pre: ({ children }) => (
      <InsidePre.Provider value>
        <pre
          className={`${gap} p-3 rounded-xl overflow-x-auto text-[11px] leading-relaxed`}
          style={{ background: p.surface, border: `1px solid ${p.border}`, color: p.text }}
        >
          {children}
        </pre>
      </InsidePre.Provider>
    ),

    code: makeCode(p),

    table: ({ children }) => (
      <ScrollFade
        orientation="horizontal"
        wrapperClassName={gap}
        wrapperStyle={{ border: `1px solid ${p.border}` }}
        radius={12}
        fadeSize={32}
        fadeRgb={isLight ? '255,255,255' : '14,14,14'}
      >
        <table className="w-full text-[11px] border-collapse">{children}</table>
      </ScrollFade>
    ),

    thead: ({ children }) => <thead style={{ background: p.goldSurface }}>{children}</thead>,

    th: ({ children }) => (
      <th
        className="text-left font-bold px-3 py-2"
        style={{ color: GOLD, borderBottom: `1px solid ${p.border}` }}
      >
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="px-3 py-2 align-top leading-relaxed" style={{ color: p.text, borderBottom: `1px solid ${p.border}` }}>
        {children}
      </td>
    ),
  }
}

interface MarkdownMessageProps {
  content: string
  isLight?: boolean
  /** Exibe um cursor pulsante ao final enquanto a resposta é transmitida. */
  streaming?: boolean
  /** Espaçamento vertical reduzido, para bolhas de chat e prévias. */
  compact?: boolean
  size?: 'xs' | 'sm'
  className?: string
  /**
   * Extrai a seção "Fontes e Referências" do conteúdo e a exibe como cartão
   * com links para os portais oficiais. Use em respostas jurídicas de IA.
   */
  fontes?: boolean
}

export function MarkdownMessage({
  content,
  isLight = false,
  streaming = false,
  compact = false,
  size = 'sm',
  className = '',
  fontes = false,
}: MarkdownMessageProps) {
  const p = useMemo(() => palette(isLight), [isLight])
  const components = useMemo(() => buildComponents(p, compact, isLight), [p, compact, isLight])

  const { corpo, fontesResolvidas } = useMemo(() => {
    // Durante o streaming a seção final ainda não chegou; varrer o corpo faria a lista "pular".
    if (!fontes) return { corpo: content, fontesResolvidas: [] }
    const extraido = extrairFontes(content, { varrerCorpo: !streaming })
    return { corpo: extraido.corpo, fontesResolvidas: extraido.fontes }
  }, [content, fontes, streaming])

  return (
    <div
      className={`markdown-message ${size === 'xs' ? 'text-xs' : 'text-sm'} ${className}`}
      style={{ color: p.text }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {corpo}
      </ReactMarkdown>
      {streaming && (
        <span
          className="inline-block w-2 h-4 ml-0.5 align-text-bottom animate-pulse"
          style={{ background: GOLD }}
        />
      )}
      <FontesReferencias fontes={fontesResolvidas} isLight={isLight} compact={compact} />
    </div>
  )
}
