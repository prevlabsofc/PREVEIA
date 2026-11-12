'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Braces,
  ChevronDown,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
} from 'lucide-react'
import {
  ROTULO_GRUPO,
  tokenVariavel,
  variaveisParaTipo,
  type GrupoVariavel,
  destacarVariaveisHtml,
  type TipoModeloDocumento,
} from '@/lib/modelos'

interface Props {
  value: string
  onChange: (v: string) => void
  tipo?: TipoModeloDocumento | null
  isLight?: boolean
  minHeight?: number
  placeholder?: string
}

const GRUPOS: GrupoVariavel[] = ['cliente', 'advogado', 'contrato', 'processo', 'sistema']

/**
 * Editor de modelo com formatação básica e inserção de {{variáveis}}.
 * Mantém texto plano compatível com PeticaoEditorComPreview / DownloadButtons.
 */
export function ModeloEditor({
  value,
  onChange,
  tipo = null,
  isLight = false,
  minHeight = 420,
  placeholder = 'Escreva o modelo… Use {{variaveis}} para campos dinâmicos.',
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [menuVars, setMenuVars] = useState(false)
  const [mostrarPreview, setMostrarPreview] = useState(false)

  const catalogo = variaveisParaTipo(tipo)

  useEffect(() => {
    function fechar(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (!t.closest?.('[data-vars-menu]')) setMenuVars(false)
    }
    if (menuVars) document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [menuVars])

  function wrapSelection(before: string, after: string = before) {
    const el = taRef.current
    if (!el) {
      onChange(value + before + after)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + before.length + selected.length + after.length
      el.setSelectionRange(
        selected ? start : start + before.length,
        selected ? pos : start + before.length
      )
    })
  }

  function prefixLines(prefix: string) {
    const el = taRef.current
    if (!el) {
      onChange(prefix + value)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = value.slice(0, start)
    const selected = value.slice(start, end) || ''
    const after = value.slice(end)
    const block = (selected || '').split('\n').map((l) => (l ? `${prefix}${l}` : prefix.trimEnd())).join('\n')
    const next = before + (selected ? block : prefix) + after
    onChange(next)
    requestAnimationFrame(() => el.focus())
  }

  function inserirVariavel(chave: string) {
    const token = tokenVariavel(chave)
    const el = taRef.current
    if (!el) {
      onChange(value + token)
      setMenuVars(false)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + token + value.slice(end)
    onChange(next)
    setMenuVars(false)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  const btnStyle = {
    border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.1)',
    color: isLight ? '#374151' : '#aaa',
    background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)',
        background: isLight ? '#fff' : '#0A0A0A',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 flex-wrap"
        style={{
          borderBottom: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)',
          background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.02)',
        }}
      >
        <button type="button" title="Negrito (**texto**)" onClick={() => wrapSelection('**', '**')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <Bold size={14} />
        </button>
        <button type="button" title="Itálico (*texto*)" onClick={() => wrapSelection('*', '*')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <Italic size={14} />
        </button>
        <button type="button" title="Sublinhado" onClick={() => wrapSelection('__', '__')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <Underline size={14} />
        </button>

        <div className="w-px h-5 mx-1" style={{ background: isLight ? '#E5E5E5' : 'rgba(255,255,255,0.1)' }} />

        <button type="button" title="Título" onClick={() => prefixLines('## ')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <Heading1 size={14} />
        </button>
        <button type="button" title="Subtítulo" onClick={() => prefixLines('### ')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <Heading2 size={14} />
        </button>
        <button type="button" title="Lista" onClick={() => prefixLines('- ')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <List size={14} />
        </button>
        <button type="button" title="Lista numerada" onClick={() => prefixLines('1. ')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <ListOrdered size={14} />
        </button>

        <div className="w-px h-5 mx-1" style={{ background: isLight ? '#E5E5E5' : 'rgba(255,255,255,0.1)' }} />

        <button type="button" title="Alinhar à esquerda" onClick={() => wrapSelection('\n[esquerda]\n', '\n[/esquerda]\n')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <AlignLeft size={14} />
        </button>
        <button type="button" title="Centralizar" onClick={() => wrapSelection('\n[centro]\n', '\n[/centro]\n')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <AlignCenter size={14} />
        </button>
        <button type="button" title="Alinhar à direita" onClick={() => wrapSelection('\n[direita]\n', '\n[/direita]\n')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={btnStyle}>
          <AlignRight size={14} />
        </button>

        <div className="w-px h-5 mx-1" style={{ background: isLight ? '#E5E5E5' : 'rgba(255,255,255,0.1)' }} />

        <div className="relative" data-vars-menu>
          <button
            type="button"
            onClick={() => setMenuVars((v) => !v)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.35)',
              color: '#D4AF37',
            }}
          >
            <Braces size={13} /> Inserir variável <ChevronDown size={12} />
          </button>
          {menuVars && (
            <div
              className="absolute left-0 top-10 z-40 w-80 max-h-72 overflow-auto rounded-xl p-2 shadow-xl"
              style={{
                background: isLight ? '#fff' : '#141410',
                border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.25)',
              }}
            >
              {GRUPOS.map((g) => {
                const vars = catalogo.filter((v) => v.grupo === g)
                if (!vars.length) return null
                return (
                  <div key={g} className="mb-2">
                    <div className="text-[9px] font-bold tracking-widest px-2 py-1" style={{ color: '#D4AF37' }}>
                      {ROTULO_GRUPO[g].toUpperCase()}
                    </div>
                    {vars.map((v) => (
                      <button
                        key={v.chave}
                        type="button"
                        onClick={() => inserirVariavel(v.chave)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-[rgba(212,175,55,0.1)]"
                        style={{ color: isLight ? '#1E1E1E' : '#ddd' }}
                      >
                        <span
                          className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold mr-1"
                          style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
                        >
                          {tokenVariavel(v.chave)}
                        </span>
                        <span style={{ color: isLight ? '#6B7280' : '#888' }}>{v.rotulo}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMostrarPreview((p) => !p)}
          className="ml-auto text-[10px] px-2.5 h-8 rounded-lg font-medium"
          style={btnStyle}
        >
          {mostrarPreview ? 'Editar texto' : 'Prévia (chips)'}
        </button>
      </div>

      {mostrarPreview ? (
        <div
          className="p-4 font-mono text-xs leading-relaxed overflow-auto whitespace-pre-wrap"
          style={{
            minHeight,
            maxHeight: '70vh',
            color: isLight ? '#374151' : '#ccc',
          }}
          dangerouslySetInnerHTML={{
            __html: destacarVariaveisHtml(value || ' ', { pendentesAmarelo: false }),
          }}
        />
      ) : (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 font-mono text-xs leading-relaxed outline-none resize-y"
          style={{
            minHeight,
            maxHeight: '70vh',
            background: 'transparent',
            color: isLight ? '#374151' : '#ccc',
          }}
          spellCheck
        />
      )}
    </div>
  )
}
