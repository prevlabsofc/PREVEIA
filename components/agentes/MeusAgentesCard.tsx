'use client'

import { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Plus, Trash2, Upload } from 'lucide-react'

export interface AgenteCardItem {
  id: string
  nome: string
  /** Linha compacta exibida abaixo do nome (ex.: "8 campos identificados"). */
  resumo?: string
  /** Metadado discreto exibido no painel expandido (ex.: data de criação). */
  meta?: string
  /** Etiquetas curtas exibidas no painel expandido. */
  tags?: string[]
  /**
   * Reservado para a hierarquia "Agente Principal" › "Tipos de Documento":
   * quando presente, os filhos são listados dentro do painel expandido.
   */
  subItens?: AgenteCardItem[]
}

interface MeusAgentesCardProps {
  itens: AgenteCardItem[]
  /** Id do item expandido, ou null quando o card está todo recolhido. */
  expandidoId: string | null
  onToggle: (item: AgenteCardItem) => void
  onCriar: () => void
  onExcluir?: (id: string, e: React.MouseEvent) => void
  subItemAtivoId?: string | null
  onSelecionarSubItem?: (pai: AgenteCardItem, sub: AgenteCardItem) => void
  /** Conteúdo completo do item (formulário, resultado, downloads) no estado expandido. */
  renderDetalhes?: (item: AgenteCardItem) => ReactNode
  isLight?: boolean
}

export function MeusAgentesCard({
  itens,
  expandidoId,
  onToggle,
  onCriar,
  onExcluir,
  subItemAtivoId,
  onSelecionarSubItem,
  renderDetalhes,
  isLight = false,
}: MeusAgentesCardProps) {
  const textColor = isLight ? '#1E1E1E' : '#fff'
  const mutedColor = isLight ? '#5E5E5E' : '#777'
  const divider = isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)'

  if (itens.length === 0) {
    return (
      <div
        className="p-6 rounded-2xl text-center"
        style={{ border: '1px dashed rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.03)' }}
      >
        <Upload size={28} color="#D4AF37" className="mx-auto mb-2" aria-hidden />
        <p className="text-sm mb-3" style={{ color: mutedColor }}>
          Suba seu modelo de petição em PDF e crie um agente personalizado
        </p>
        <button type="button" onClick={onCriar} className="btn-gold px-5 py-2 rounded-xl text-sm">
          Criar meu primeiro agente
        </button>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isLight ? '#EDEDED' : 'rgba(212,175,55,0.18)'}`,
      }}
    >
      {itens.map((item, i) => {
        const aberto = expandidoId === item.id
        const painelId = `agente-painel-${item.id}`
        const tituloId = `agente-titulo-${item.id}`
        return (
          <div
            key={item.id}
            className="transition-colors"
            style={{
              borderTop: i > 0 ? `1px solid ${divider}` : undefined,
              background: aberto ? 'rgba(212,175,55,0.06)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-1 pr-2 sm:pr-3">
              <button
                type="button"
                onClick={() => onToggle(item)}
                aria-expanded={aberto}
                aria-controls={painelId}
                className="flex-1 min-w-0 flex items-center gap-3 px-3 sm:px-4 py-3 text-left transition-colors hover:bg-[rgba(212,175,55,0.06)]"
              >
                <span
                  aria-hidden
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.25)' }}
                >
                  ⭐
                </span>
                <span className="flex-1 min-w-0">
                  <span id={tituloId} className="block text-sm font-bold truncate" style={{ color: textColor }}>
                    {item.nome}
                  </span>
                  {item.resumo && (
                    <span className="block text-[11px] truncate" style={{ color: mutedColor }}>
                      {item.resumo}
                    </span>
                  )}
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden
                  style={{
                    color: '#D4AF37',
                    flexShrink: 0,
                    transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>
              {onExcluir && (
                <button
                  type="button"
                  onClick={e => onExcluir(item.id, e)}
                  aria-label={`Excluir agente ${item.nome}`}
                  title="Excluir agente"
                  className="p-2 rounded-lg flex-shrink-0 transition-colors hover:text-red-400"
                  style={{ color: mutedColor }}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {aberto && (
                <motion.div
                  id={painelId}
                  role="region"
                  aria-labelledby={tituloId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 sm:px-4 pb-4 pt-1">
                    {(item.meta || (item.tags && item.tags.length > 0)) && (
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {item.tags?.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(212,175,55,0.1)',
                              color: '#D4AF37',
                              border: '1px solid rgba(212,175,55,0.2)',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {item.meta && (
                          <span className="text-[10px]" style={{ color: mutedColor }}>
                            {item.meta}
                          </span>
                        )}
                      </div>
                    )}

                    {item.subItens && item.subItens.length > 0 && (
                      <ul className="mb-3 space-y-1">
                        {item.subItens.map(sub => {
                          const ativo = subItemAtivoId === sub.id
                          return (
                            <li key={sub.id}>
                              <button
                                type="button"
                                onClick={() => onSelecionarSubItem?.(item, sub)}
                                aria-current={ativo || undefined}
                                className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                                style={{
                                  background: ativo ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
                                  border: `1px solid ${ativo ? 'rgba(212,175,55,0.35)' : divider}`,
                                }}
                              >
                                <span className="block text-xs font-semibold" style={{ color: textColor }}>
                                  {sub.nome}
                                </span>
                                {sub.resumo && (
                                  <span className="block text-[10px]" style={{ color: mutedColor }}>
                                    {sub.resumo}
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    {renderDetalhes?.(item)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      <button
        type="button"
        onClick={onCriar}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition-colors hover:bg-[rgba(212,175,55,0.06)]"
        style={{ borderTop: `1px solid ${divider}`, color: '#D4AF37' }}
      >
        <Plus size={14} aria-hidden /> Novo agente personalizado
      </button>
    </div>
  )
}
