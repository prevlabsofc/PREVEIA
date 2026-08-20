'use client'

import { X } from 'lucide-react'
import { TAGS_NEWSLETTER_PRESET } from '@/lib/newsletter-tags'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
  /** Compacto para lista de inscritos. */
  compact?: boolean
}

export function EditorTagsInscrito({ tags, onChange, disabled, compact }: Props) {
  function toggle(tag: string) {
    if (disabled) return
    if (tags.includes(tag)) onChange(tags.filter(t => t !== tag))
    else onChange([...tags, tag])
  }

  function remover(tag: string) {
    if (disabled) return
    onChange(tags.filter(t => t !== tag))
  }

  const extras = tags.filter(t => !(TAGS_NEWSLETTER_PRESET as readonly string[]).includes(t))

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex flex-wrap gap-1.5">
        {TAGS_NEWSLETTER_PRESET.map(tag => {
          const ativo = tags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tag)}
              className="text-[10px] px-2 py-0.5 rounded-lg transition-colors disabled:opacity-50"
              style={{
                background: ativo ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.04)',
                border: ativo ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.1)',
                color: ativo ? '#D4AF37' : '#888',
              }}
            >
              {tag}
            </button>
          )
        })}
        {extras.map(tag => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-lg inline-flex items-center gap-1"
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.35)',
              color: '#60A5FA',
            }}
          >
            {tag}
            {!disabled && (
              <button type="button" onClick={() => remover(tag)} aria-label={`Remover ${tag}`}>
                <X size={10} />
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
