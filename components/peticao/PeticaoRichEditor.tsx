'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
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
import {
  labelMarcador,
  remontarPeticao,
  segmentarPeticao,
  type SegmentoPeticao,
} from '@/lib/peticao-marcadores-ui'

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
 * Editor com barra de formatação markdown-compatível com export PDF/DOCX.
 * Marcadores <<<TAG>>> viram divisores visuais não editáveis / não selecionáveis.
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
  const segmentos = useMemo(() => segmentarPeticao(value), [value])
  const textoRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map())
  const [localSegs, setLocalSegs] = useState<SegmentoPeticao[]>(segmentos)
  const syncingFromProp = useRef(false)

  useEffect(() => {
    syncingFromProp.current = true
    setLocalSegs(segmentos)
    requestAnimationFrame(() => {
      syncingFromProp.current = false
    })
  }, [segmentos])

  const emitir = useCallback(
    (next: SegmentoPeticao[]) => {
      setLocalSegs(next)
      if (!syncingFromProp.current) onChange(remontarPeticao(next))
    },
    [onChange],
  )

  const btnStyle = {
    border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.1)',
    color: isLight ? '#374151' : '#aaa',
    background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
  }

  function indiceTextoAtivo(): number {
    const active = document.activeElement
    for (const [i, el] of textoRefs.current.entries()) {
      if (el === active) return i
    }
    // primeiro segmento de texto
    return localSegs.findIndex((s) => s.tipo === 'texto')
  }

  function wrapSelection(before: string, after: string = before) {
    if (readOnly) return
    const idx = indiceTextoAtivo()
    if (idx < 0) {
      onChange(value + before + after)
      return
    }
    const el = textoRefs.current.get(idx)
    const seg = localSegs[idx]
    if (!el || seg.tipo !== 'texto') return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = seg.texto.slice(start, end)
    const nextTexto =
      seg.texto.slice(0, start) + before + selected + after + seg.texto.slice(end)
    const next = localSegs.map((s, i) =>
      i === idx && s.tipo === 'texto' ? { ...s, texto: nextTexto } : s,
    )
    emitir(next)
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
    if (readOnly) return
    const idx = indiceTextoAtivo()
    const el = textoRefs.current.get(idx)
    const seg = localSegs[idx]
    if (!el || !seg || seg.tipo !== 'texto') return
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = seg.texto.slice(0, start)
    const selected = seg.texto.slice(start, end)
    const after = seg.texto.slice(end)
    const lineStart = before.lastIndexOf('\n') + 1
    const block = seg.texto.slice(lineStart, end || start)
    const lines = (selected || block || '').split('\n')
    const prefixed = lines
      .map((l) => {
        const t = l.trim()
        if (!t) return l
        if (l.startsWith(prefixo)) return l
        return `${prefixo}${l.replace(/^\s+/, '')}`
      })
      .join('\n')
    const nextTexto =
      seg.texto.slice(0, lineStart) +
      prefixed +
      (selected ? after : seg.texto.slice(Math.max(end, lineStart + block.length)))
    const next = localSegs.map((s, i) =>
      i === idx && s.tipo === 'texto' ? { ...s, texto: nextTexto } : s,
    )
    emitir(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = lineStart + prefixed.length
      el.setSelectionRange(lineStart, pos)
    })
  }

  function alinhar(modo: 'left' | 'center' | 'right') {
    if (readOnly) return
    const idx = indiceTextoAtivo()
    const el = textoRefs.current.get(idx)
    const seg = localSegs[idx]
    if (!el || !seg || seg.tipo !== 'texto') return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = seg.texto.slice(start, end).trim()
    if (!selected) {
      const marker =
        modo === 'center'
          ? ':::center\n\n:::'
          : modo === 'right'
            ? ':::right\n\n:::'
            : ''
      if (!marker) return
      const nextTexto = seg.texto.slice(0, start) + marker + seg.texto.slice(end)
      emitir(
        localSegs.map((s, i) =>
          i === idx && s.tipo === 'texto' ? { ...s, texto: nextTexto } : s,
        ),
      )
      return
    }
    if (modo === 'left') {
      const limpo = selected
        .replace(/^:::center\n?/i, '')
        .replace(/^:::right\n?/i, '')
        .replace(/\n?:::$/i, '')
      const nextTexto = seg.texto.slice(0, start) + limpo + seg.texto.slice(end)
      emitir(
        localSegs.map((s, i) =>
          i === idx && s.tipo === 'texto' ? { ...s, texto: nextTexto } : s,
        ),
      )
      return
    }
    const wrapped = `:::${modo}\n${selected}\n:::`
    const nextTexto = seg.texto.slice(0, start) + wrapped + seg.texto.slice(end)
    emitir(
      localSegs.map((s, i) =>
        i === idx && s.tipo === 'texto' ? { ...s, texto: nextTexto } : s,
      ),
    )
  }

  function inserirParagrafo() {
    if (readOnly) return
    const idx = indiceTextoAtivo()
    const el = textoRefs.current.get(idx)
    const seg = localSegs[idx]
    if (!el || !seg || seg.tipo !== 'texto') {
      onChange(value + '\n\n')
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const nextTexto = seg.texto.slice(0, start) + '\n\n' + seg.texto.slice(end)
    emitir(
      localSegs.map((s, i) =>
        i === idx && s.tipo === 'texto' ? { ...s, texto: nextTexto } : s,
      ),
    )
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + 2, start + 2)
    })
  }

  function onTextoChange(idx: number, texto: string) {
    emitir(
      localSegs.map((s, i) =>
        i === idx && s.tipo === 'texto' ? { ...s, texto } : s,
      ),
    )
  }

  function onKeyDownTexto(
    e: ReactKeyboardEvent<HTMLTextAreaElement>,
    idx: number,
  ) {
    const el = e.currentTarget
    const seg = localSegs[idx]
    if (!seg || seg.tipo !== 'texto') return

    // Impede Backspace/Delete de “pular” e apagar marcadores adjacentes
    // (marcadores estão fora do textarea — só bloqueamos merge acidental).
    if (e.key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0) {
      const prev = localSegs[idx - 1]
      if (prev?.tipo === 'marcador') {
        e.preventDefault()
        return
      }
    }
    if (
      e.key === 'Delete' &&
      el.selectionStart === seg.texto.length &&
      el.selectionEnd === seg.texto.length
    ) {
      const next = localSegs[idx + 1]
      if (next?.tipo === 'marcador') {
        e.preventDefault()
        return
      }
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.max(24, el.scrollHeight)}px`
  }

  useEffect(() => {
    for (const el of textoRefs.current.values()) {
      autoGrow(el)
    }
  }, [localSegs])

  const temMarcadores = localSegs.some((s) => s.tipo === 'marcador')

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

      <div
        className="w-full flex-1 min-h-[420px] max-h-[70vh] overflow-y-auto p-3"
        style={{ minHeight }}
        aria-label={ariaLabel}
        role="textbox"
        aria-multiline="true"
      >
        {!temMarcadores ? (
          <textarea
            ref={(el) => {
              if (el) textoRefs.current.set(0, el)
              else textoRefs.current.delete(0)
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={readOnly || streaming}
            className="w-full min-h-[380px] p-1 font-mono text-xs leading-relaxed resize-y outline-none bg-transparent"
            style={{
              color: isLight ? '#374151' : '#ccc',
              opacity: streaming ? 0.85 : 1,
            }}
            spellCheck={true}
          />
        ) : (
          localSegs.map((seg, idx) => {
            if (seg.tipo === 'marcador') {
              return (
                <div
                  key={`m-${idx}-${seg.tag}`}
                  contentEditable={false}
                  suppressContentEditableWarning
                  role="separator"
                  aria-label={labelMarcador(seg.tag)}
                  aria-hidden={false}
                  data-marcador={seg.tag}
                  className="select-none pointer-events-none my-2 flex items-center gap-2 user-select-none"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span
                    className="flex-1 h-px"
                    style={{
                      background: isLight
                        ? 'rgba(212,175,55,0.35)'
                        : 'rgba(212,175,55,0.28)',
                    }}
                  />
                  <span
                    className="text-[10px] tracking-wide whitespace-nowrap px-1"
                    style={{
                      color: isLight ? 'rgba(120,90,20,0.75)' : 'rgba(212,175,55,0.65)',
                    }}
                  >
                    — {labelMarcador(seg.tag)} —
                  </span>
                  <span
                    className="flex-1 h-px"
                    style={{
                      background: isLight
                        ? 'rgba(212,175,55,0.35)'
                        : 'rgba(212,175,55,0.28)',
                    }}
                  />
                </div>
              )
            }
            return (
              <textarea
                key={`t-${idx}`}
                ref={(el) => {
                  if (el) {
                    textoRefs.current.set(idx, el)
                    autoGrow(el)
                  } else {
                    textoRefs.current.delete(idx)
                  }
                }}
                value={seg.texto}
                onChange={(e) => {
                  onTextoChange(idx, e.target.value)
                  autoGrow(e.target)
                }}
                onKeyDown={(e) => onKeyDownTexto(e, idx)}
                readOnly={readOnly || streaming}
                className="w-full font-mono text-xs leading-relaxed resize-none outline-none bg-transparent overflow-hidden"
                style={{
                  color: isLight ? '#374151' : '#ccc',
                  opacity: streaming ? 0.85 : 1,
                  minHeight: seg.texto.trim() ? undefined : 8,
                }}
                spellCheck={true}
                rows={1}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
