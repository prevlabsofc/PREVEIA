'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { MarkdownMessage } from '@/components/MarkdownMessage'
import { AvisoCitacao } from '@/components/AvisoCitacao'
import { FontesReferencias } from '@/components/FontesReferencias'
import { extrairFontes } from '@/lib/fontes-juridicas'

interface Section {
  id: string
  title: string
  content: string
}

interface ParsedParecer {
  summary: string
  sections: Section[]
}

const SECTION_HEADER =
  /^\s*(?:#{1,3}\s*)?(\d+\.\s*(?:[A-ZÁÉÍÓÚÃÕÇ0-9][A-ZÁÉÍÓÚÃÕÇ0-9\s/\-—().]+))\s*:?\s*$/

function slugify(title: string, index: number) {
  return `${index}-${title.slice(0, 40).replace(/\W+/g, '-').toLowerCase()}`
}

/** Remove marcadores de Markdown de trechos exibidos como texto puro (títulos e prévias). */
function stripMarkdown(text: string) {
  return text
    .replace(/`+/g, '')
    .replace(/\*\*|__|\*|_/g, '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-•]\s+/, '')
    .trim()
}

export function parseParecer(text: string): ParsedParecer {
  const trimmed = text.trim()
  if (!trimmed) return { summary: '', sections: [] }

  const lines = trimmed.split('\n')
  const sections: Section[] = []
  const preamble: string[] = []
  let currentTitle = ''
  let currentLines: string[] = []

  function flush(index: number) {
    if (!currentTitle) return
    sections.push({
      id: slugify(currentTitle, index),
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    })
  }

  for (const line of lines) {
    const match = line.match(SECTION_HEADER)
    const looksLikeHeader = match && match[1].length >= 8 && /[A-ZÁÉÍÓÚ]/.test(match[1])

    if (looksLikeHeader) {
      flush(sections.length)
      currentTitle = match![1].trim()
      currentLines = []
    } else if (currentTitle) {
      currentLines.push(line)
    } else {
      preamble.push(line)
    }
  }
  flush(sections.length)

  if (sections.length === 0) {
    const plainLines = lines.map(l => l.trim()).filter(Boolean)
    return {
      summary: plainLines.slice(0, 5).join('\n'),
      sections: [{ id: 'completo', title: 'Detalhamento completo', content: trimmed }],
    }
  }

  const conclusao = sections.find(s => /CONCLUSÃO|CHANCE DE ÊXITO|RESUMO EXECUTIVO/i.test(s.title))
  const elegibilidade = sections.find(s => /ELEGIBILIDADE|PERFIL PREVIDENCIÁRIO/i.test(s.title))
  const estrategia = sections.find(s => /ESTRATÉGIA RECOMENDADA/i.test(s.title))

  const summarySource =
    conclusao?.content ||
    elegibilidade?.content ||
    estrategia?.content ||
    preamble.join('\n').trim() ||
    sections[0]?.content ||
    trimmed

  const summary = summarySource
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n')

  return { summary, sections }
}

interface ParecerAccordionProps {
  text: string
  isLight?: boolean
  streaming?: boolean
}

export function ParecerAccordion({ text, isLight = false, streaming = false }: ParecerAccordionProps) {
  // A seção "Fontes e Referências" sai do acordeão e vira um cartão de links oficiais.
  const { corpo, fontes } = useMemo(() => extrairFontes(text, { varrerCorpo: !streaming }), [text, streaming])
  const { summary, sections } = useMemo(() => parseParecer(corpo), [corpo])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const mutedColor = isLight ? '#5E5E5E' : '#888'

  if (!text.trim()) return null

  return (
    <div className="space-y-4">
      {summary && (
        <div
          className="rounded-xl p-4"
          style={{
            background: isLight ? 'linear-gradient(90deg, #FFF4D6, #FFF8E8)' : 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.28)',
          }}
        >
          <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#D4AF37' }}>
            RESUMO EXECUTIVO
          </p>
          <MarkdownMessage content={summary} isLight={isLight} streaming={streaming} compact />
        </div>
      )}

      <AvisoCitacao text={text} isLight={isLight} />

      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-widest px-1" style={{ color: mutedColor }}>
          SEÇÕES DETALHADAS — CLIQUE PARA EXPANDIR
        </p>
        {sections.map(section => {
          const isOpen = openIds.has(section.id)
          const preview = section.content.split('\n').map(l => stripMarkdown(l)).filter(Boolean)[0]
          return (
            <div
              key={section.id}
              className="rounded-xl overflow-hidden transition-colors"
              style={{
                border: `1px solid ${isOpen ? 'rgba(212,175,55,0.35)' : isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}`,
                background: isLight ? '#fff' : 'rgba(255,255,255,0.02)',
              }}
            >
              <button
                type="button"
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(212,175,55,0.04)]"
              >
                <ChevronDown
                  size={16}
                  style={{
                    color: '#D4AF37',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                    {stripMarkdown(section.title)}
                  </div>
                  {!isOpen && preview && (
                    <div className="text-[11px] truncate mt-0.5" style={{ color: mutedColor }}>
                      {preview}
                    </div>
                  )}
                </div>
              </button>
              {isOpen && (
                <div
                  className="px-4 pb-4 pt-3 border-t"
                  style={{ borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' }}
                >
                  {section.content ? (
                    <MarkdownMessage content={section.content} isLight={isLight} streaming={streaming} />
                  ) : (
                    <span className="text-sm" style={{ color: mutedColor }}>{streaming ? 'Gerando...' : '—'}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <FontesReferencias fontes={fontes} isLight={isLight} />
    </div>
  )
}
