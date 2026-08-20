'use client'

import { TAGS_NEWSLETTER_PRESET } from '@/lib/newsletter-tags'

interface Props {
  selecionadas: string[]
  onChange: (tags: string[]) => void
  /** Contagem de ativos por tag (opcional, para dica). */
  contagem?: Record<string, number>
  disabled?: boolean
}

export function FiltroTagsEnvio({ selecionadas, onChange, contagem, disabled }: Props) {
  function toggle(tag: string) {
    if (disabled) return
    if (selecionadas.includes(tag)) onChange(selecionadas.filter(t => t !== tag))
    else onChange([...selecionadas, tag])
  }

  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">
        Filtrar por tags {selecionadas.length > 0 ? `(${selecionadas.length})` : '(opcional)'}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {TAGS_NEWSLETTER_PRESET.map(tag => {
          const ativo = selecionadas.includes(tag)
          const n = contagem?.[tag]
          return (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tag)}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
              style={{
                background: ativo ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                border: ativo ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: ativo ? '#D4AF37' : '#888',
              }}
            >
              {tag}{typeof n === 'number' ? ` (${n})` : ''}
            </button>
          )
        })}
      </div>
      {selecionadas.length > 0 && (
        <p className="text-[10px] text-gray-600 mt-1.5">
          Só entram inscritos que tenham todas as tags selecionadas (e o segmento acima).
        </p>
      )}
    </div>
  )
}
