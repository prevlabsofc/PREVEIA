'use client'

import { useRef } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
} from 'lucide-react'

type Props = {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  isLight?: boolean
  minHeight?: number
  streaming?: boolean
  'aria-label'?: string
}

/**
 * Editor com barra de formatação markdown-compatível com export PDF/DOCX
 * (negrito, itálico, listas, parágrafos, alinhamento via marcadores).
 */
export function PeticaoRichEditor({
  value,
  onChange,
  readOnly = false,
  isLight = false,
  minHeight = 420,
  streaming = false,
  'aria-label': ariaLabel = 'Editar conteúdo do documento',
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  const btnStyle = {
    border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.1)',
    color: isLight ? '#374151' : '#aaa',
    background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
  }

  function wrapSelection(before: string, after: string = before) {
    const el = taRef.current
    if (!el || readOnly) {
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
        selected ? pos : start + before.length,
      )
    })
  }

  function prefixarLinhas(prefixo: string) {
    const el = taRef.current
    if (!el || readOnly) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = value.slice(0, start)
    const selected = value.slice(start, end) || ''
    const after = value.slice(end)

    const lineStart = before.lastIndexOf('\n') + 1
    const block = value.slice(lineStart, end || start)
    const lines = (selected || block || '').split('\n')
    const prefixed = lines
      .map((l) => {
        const t = l.trim()
        if (!t) return l
        if (l.startsWith(prefixo)) return l
        return `${prefixo}${l.replace(/^\s+/, '')}`
      })
      .join('\n')

    const next =
      value.slice(0, lineStart) +
      prefixed +
      (selected ? after : value.slice(Math.max(end, lineStart + block.length)))
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = lineStart + prefixed.length
      el.setSelectionRange(lineStart, pos)
    })
  }

  function alinhar(modo: 'left' | 'center' | 'right') {
    const el = taRef.current
    if (!el || readOnly) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end).trim()
    if (!selected) {
      const marker =
        modo === 'center'
          ? ':::center\n\n:::'
          : modo === 'right'
            ? ':::right\n\n:::'
            : ''
      if (!marker) return
      const next = value.slice(0, start) + marker + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        const caret = start + (modo === 'left' ? 0 : `:::${modo}\n`.length)
        el.setSelectionRange(caret, caret)
      })
      return
    }
    if (modo === 'left') {
      const limpo = selected
        .replace(/^:::center\n?/i, '')
        .replace(/^:::right\n?/i, '')
        .replace(/\n?:::$/i, '')
      const next = value.slice(0, start) + limpo + value.slice(end)
      onChange(next)
      return
    }
    const wrapped = `:::${modo}\n${selected}\n:::`
    const next = value.slice(0, start) + wrapped + value.slice(end)
    onChange(next)
  }

  function inserirParagrafo() {
    const el = taRef.current
    if (!el || readOnly) {
      onChange(value + '\n\n')
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = value.slice(0, start) + '\n\n' + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + 2
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {!readOnly && !streaming && (
        <div
          className="flex items-center gap-1 px-2 py-1.5 flex-wrap flex-shrink-0"
          style={{
            borderBottom: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)',
            background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.02)',
          }}
          role="toolbar"
          aria-label="Formatação do documento"
        >
          <button
            type="button"
            title="Negrito"
            onClick={() => wrapSelection('**', '**')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            title="Itálico"
            onClick={() => wrapSelection('*', '*')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <Italic size={14} />
          </button>
          <div
            className="w-px h-5 mx-0.5"
            style={{ background: isLight ? '#E5E5E5' : 'rgba(255,255,255,0.1)' }}
          />
          <button
            type="button"
            title="Novo parágrafo"
            onClick={inserirParagrafo}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <Pilcrow size={14} />
          </button>
          <button
            type="button"
            title="Lista com marcadores"
            onClick={() => prefixarLinhas('- ')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <List size={14} />
          </button>
          <button
            type="button"
            title="Lista numerada"
            onClick={() => prefixarLinhas('1. ')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <ListOrdered size={14} />
          </button>
          <div
            className="w-px h-5 mx-0.5"
            style={{ background: isLight ? '#E5E5E5' : 'rgba(255,255,255,0.1)' }}
          />
          <button
            type="button"
            title="Alinhar à esquerda"
            onClick={() => alinhar('left')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            title="Centralizar"
            onClick={() => alinhar('center')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            title="Alinhar à direita"
            onClick={() => alinhar('right')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5"
            style={btnStyle}
          >
            <AlignRight size={14} />
          </button>
        </div>
      )}

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly || streaming}
        aria-label={ariaLabel}
        className="w-full flex-1 min-h-[420px] max-h-[70vh] p-4 font-mono text-xs leading-relaxed resize-y outline-none"
        style={{
          minHeight,
          background: 'transparent',
          color: isLight ? '#374151' : '#ccc',
          opacity: streaming ? 0.85 : 1,
        }}
        spellCheck={true}
      />
    </div>
  )
}
