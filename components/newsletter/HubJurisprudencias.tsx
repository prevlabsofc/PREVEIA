'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { BookOpen, Loader2, Scale } from 'lucide-react'
import { SECOES, diaCivilBrasil, secaoDaJurisprudencia } from '@/lib/jurisprudencia-secoes'
import { InserirNaPeticao } from '@/components/jurisprudencia/InserirNaPeticao'
import { OrigemBadge } from '@/components/jurisprudencia/OrigemBadge'
import FeedbackToast from '@/components/clientes/FeedbackToast'
import type { Feedback } from '@/components/clientes/clientes-shared'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const tribunalColor: Record<string, { bg: string; color: string }> = {
  STF: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  STJ: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  TNU: { bg: 'rgba(212,175,55,0.12)', color: '#D4AF37' },
  TRF: { bg: 'rgba(168,85,247,0.12)', color: '#A855F7' },
}

type Item = Record<string, unknown> & {
  id: string
  tribunal?: string | null
  tipo?: string | null
  numero?: string | null
  assunto?: string | null
  ementa?: string | null
  data_julgamento?: string | null
  origem?: string | null
  importado_em?: string | null
  created_at?: string
}

interface Props {
  isLight?: boolean
  /** IDs selecionados para gerar newsletter (fonte da IA). */
  selecionados: Set<string>
  onToggleSelecionado: (id: string) => void
  onUsarComoFonte?: (itens: Item[]) => void
  limite?: number
}

export function HubJurisprudencias({
  isLight = false,
  selecionados,
  onToggleSelecionado,
  onUsarComoFonte,
  limite = 40,
}: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(t)
  }, [feedback])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('jurisprudencias')
        .select('id, tribunal, tipo, numero, assunto, ementa, data_julgamento, relevancia, origem, importado_em, created_at')
        .order('created_at', { ascending: false })
        .order('relevancia', { ascending: false })
        .limit(limite)
      if (!cancelled) {
        setItems((data as Item[]) || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [limite])

  const secoes = useMemo(() => {
    const hoje = diaCivilBrasil()
    return SECOES.map(s => {
      const itens = items.filter(it => secaoDaJurisprudencia(it, hoje) === s.id)
      return { ...s, itens }
    }).filter(s => s.itens.length > 0)
  }, [items])

  const selecionadosItens = useMemo(
    () => items.filter(it => selecionados.has(it.id)),
    [items, selecionados]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Carregando jurisprudências...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500">
        Nenhuma jurisprudência recente no catálogo.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>
          Novidades do catálogo. Importe para a petição ativa ou selecione para gerar a newsletter.
        </p>
        {onUsarComoFonte && selecionados.size > 0 && (
          <button
            type="button"
            onClick={() => onUsarComoFonte(selecionadosItens)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
            style={{
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#D4AF37',
              background: 'rgba(212,175,55,0.1)',
            }}
          >
            <Scale size={13} />
            Usar {selecionados.size} como fonte da newsletter
          </button>
        )}
      </div>

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
          </div>
          <div className="space-y-3">
            {secao.itens.map(item => {
              const tc = tribunalColor[item.tribunal || ''] || { bg: 'rgba(255,255,255,0.05)', color: '#888' }
              const sel = selecionados.has(item.id)
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl"
                  style={{
                    background: sel ? 'rgba(212,175,55,0.06)' : isLight ? '#fff' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${sel ? 'rgba(212,175,55,0.35)' : isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => onToggleSelecionado(item.id)}
                      className="mt-2 flex-shrink-0"
                      aria-label={`Selecionar ${item.assunto || item.numero || 'jurisprudência'}`}
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
                        {item.numero && (
                          <span className="text-[10px]" style={{ color: '#555' }}>
                            · {item.tipo} {item.numero}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                        {item.assunto}
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#666' }}>
                        {item.ementa}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <InserirNaPeticao
                          item={item}
                          rotulo="Importar para petição"
                          className="h-9 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50"
                          onFeedback={(texto, tipo) => setFeedback({ texto, tipo: tipo || 'sucesso' })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <FeedbackToast feedback={feedback} />
    </div>
  )
}
