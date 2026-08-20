'use client'

import { BookOpen, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import type { SecaoId } from '@/lib/jurisprudencia-secoes'
import { OrigemBadge } from '@/components/jurisprudencia/OrigemBadge'

const tribunalColor: Record<string, { bg: string; color: string }> = {
  STF: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  STJ: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  TNU: { bg: 'rgba(212,175,55,0.12)', color: '#D4AF37' },
  TRF: { bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
  'CF/88': { bg: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  'Lei 8.213/91': { bg: 'rgba(249,115,22,0.12)', color: '#F97316' },
}

type Item = Record<string, any>

type SecaoRender = {
  id: SecaoId
  titulo: string
  descricao: string
  cor: string
  itens: Item[]
  naoLidas: number
}

export function JurisprudenciaLista({
  secoes,
  lidas,
  selecionados,
  isLight,
  onToggleSelecionado,
  onAbrir,
}: {
  secoes: SecaoRender[]
  lidas: Set<string>
  selecionados: Set<string>
  isLight: boolean
  onToggleSelecionado: (id: string) => void
  onAbrir: (item: Item) => void
}) {
  return (
    <div className="space-y-6">
      {secoes.map(secao => (
        <section key={secao.id}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: secao.cor }} />
            <h3 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              {secao.titulo}
            </h3>
            <span className="text-[10px]" style={{ color: '#666' }}>
              {secao.descricao} · {secao.itens.length}
            </span>
            {secao.naoLidas > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}
              >
                {secao.naoLidas} não lida{secao.naoLidas > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {secao.itens.map((item, i) => {
              const tc = tribunalColor[item.tribunal] || { bg: 'rgba(255,255,255,0.05)', color: '#888' }
              const lida = lidas.has(item.id)
              const sel = selecionados.has(item.id)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="flex items-start justify-between p-4 rounded-xl transition-colors"
                  style={{
                    background: sel ? 'rgba(212,175,55,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${sel ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    opacity: lida ? 0.72 : 1,
                  }}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => onToggleSelecionado(item.id)}
                      className="mt-2 flex-shrink-0"
                      aria-label={`Selecionar ${item.assunto}`}
                    />
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: tc.bg }}
                    >
                      <BookOpen size={14} color={tc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: tc.bg, color: tc.color }}
                        >
                          {item.tribunal}
                        </span>
                        <OrigemBadge
                          origem={item.origem}
                          importadoEm={item.importado_em}
                          createdAt={item.created_at}
                        />
                        {!lida && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}
                          >
                            Nova
                          </span>
                        )}
                        {item.numero && (
                          <span className="text-[10px]" style={{ color: '#555' }}>
                            · {item.tipo} {item.numero}
                          </span>
                        )}
                        {item.data_julgamento && (
                          <span className="text-[10px]" style={{ color: '#555' }}>
                            · {new Date(item.data_julgamento).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                        {item.assunto}
                      </div>
                      <div className="text-xs leading-relaxed line-clamp-2" style={{ color: '#666' }}>
                        {item.ementa}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            size={10}
                            fill={j < item.relevancia ? '#D4AF37' : 'transparent'}
                            color={j < item.relevancia ? '#D4AF37' : '#333'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAbrir(item)}
                    className="ml-3 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
                    style={{ color: '#888' }}
                    title="Ver ementa"
                  >
                    {lida ? <EyeOff size={15} /> : <Eye size={15} />}
                    <ChevronRight size={12} className="sr-only" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
