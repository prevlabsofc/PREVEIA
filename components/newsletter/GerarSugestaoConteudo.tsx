'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Sparkles } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DiasPeriodo = 7 | 30
type ModoFonte = 'periodo' | 'selecionadas' | 'tese'
type Segmento = 'cliente' | 'lead' | 'todos'

interface Props {
  onSugestao: (rascunho: { assunto: string; conteudo: string }) => void
  disabled?: boolean
  /** Segmento do envio — influencia o tom (Clientes = contextual). */
  segmento?: Segmento
  /** Tags do filtro atual (contexto para Clientes). */
  tagsContexto?: string[]
  /** IDs de jurisprudências selecionadas no hub. */
  jurisIdsSelecionados?: string[]
  /** Tese pré-carregada (ex.: extração de PDF). */
  teseInicial?: string
}

export function GerarSugestaoConteudo({
  onSugestao,
  disabled,
  segmento = 'lead',
  tagsContexto = [],
  jurisIdsSelecionados = [],
  teseInicial = '',
}: Props) {
  const [dias, setDias] = useState<DiasPeriodo>(30)
  const [modo, setModo] = useState<ModoFonte>(teseInicial ? 'tese' : 'periodo')
  const [tese, setTese] = useState(teseInicial)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!teseInicial?.trim()) return
    setTese(teseInicial)
    setModo('tese')
  }, [teseInicial])

  async function gerar() {
    setGerando(true)
    setErro(null)
    setInfo(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setErro('Sessão expirada. Faça login novamente.')
        return
      }

      const modoEfetivo: ModoFonte =
        modo === 'selecionadas' && jurisIdsSelecionados.length === 0
          ? 'periodo'
          : modo

      if (modoEfetivo === 'tese' && !tese.trim()) {
        setErro('Digite uma tese jurídica curta para gerar o rascunho.')
        return
      }
      if (modo === 'selecionadas' && jurisIdsSelecionados.length === 0) {
        setErro('Selecione pelo menos uma jurisprudência na aba Atualizações.')
        return
      }

      const res = await fetch('/api/gerar-sugestao-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dias,
          modo: modoEfetivo,
          tese: modoEfetivo === 'tese' ? tese.trim() : undefined,
          juris_ids: modoEfetivo === 'selecionadas' ? jurisIdsSelecionados : undefined,
          segmento,
          tags: tagsContexto,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.empty || !data.ok) {
        setErro(
          data.error ||
            'Não foi possível gerar a sugestão. Tente novamente.'
        )
        return
      }
      onSugestao({ assunto: data.assunto, conteudo: data.conteudo })
      const nJ = data.fontes?.jurisprudencias ?? 0
      const nA = data.fontes?.artigos ?? 0
      const origem =
        data.modo === 'tese'
          ? 'a partir da tese informada'
          : data.modo === 'selecionadas'
            ? `a partir de ${nJ} jurisprudência(s) selecionada(s)`
            : `com ${nJ} jurisprudência(s) e ${nA} artigo(s) dos últimos ${data.dias ?? dias} dias`
      setInfo(`Rascunho gerado ${origem}. Revise antes de enviar.`)
    } catch {
      setErro('Não foi possível gerar a sugestão. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {([
          { id: 'periodo' as const, label: 'Fontes recentes' },
          { id: 'selecionadas' as const, label: 'Juris selecionadas' },
          { id: 'tese' as const, label: 'Tese jurídica' },
        ]).map(op => {
          const ativo = modo === op.id
          return (
            <button
              key={op.id}
              type="button"
              disabled={gerando}
              onClick={() => { setModo(op.id); setErro(null); setInfo(null) }}
              className="text-[10px] px-2.5 py-1 rounded-lg transition-colors"
              style={{
                border: ativo ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.1)',
                color: ativo ? '#D4AF37' : '#888',
                background: ativo ? 'rgba(212,175,55,0.12)' : 'transparent',
              }}
            >
              {op.label}
              {op.id === 'selecionadas' && jurisIdsSelecionados.length > 0
                ? ` (${jurisIdsSelecionados.length})`
                : ''}
            </button>
          )
        })}
      </div>

      {modo === 'periodo' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-gray-500">Período:</span>
          {([7, 30] as DiasPeriodo[]).map(d => (
            <button
              key={d}
              type="button"
              disabled={gerando}
              onClick={() => { setDias(d); setErro(null); setInfo(null) }}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors"
              style={{
                border: dias === d ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.1)',
                color: dias === d ? '#D4AF37' : '#888',
                background: dias === d ? 'rgba(212,175,55,0.12)' : 'transparent',
              }}
            >
              {d} dias
            </button>
          ))}
        </div>
      )}

      {modo === 'tese' && (
        <textarea
          value={tese}
          onChange={e => setTese(e.target.value)}
          disabled={gerando || disabled}
          placeholder="Ex.: STJ reforçou que a prova testemunhal basta para comprovar atividade rural quando não há documentos contemporâneos..."
          className="input-glass w-full px-3 text-sm"
          style={{ height: 72, resize: 'none', paddingTop: 10 }} spellCheck={true} />
      )}

      {modo === 'selecionadas' && jurisIdsSelecionados.length === 0 && (
        <p className="text-[10px] text-gray-600">
          Marque jurisprudências na aba Atualizações e volte aqui, ou use “Usar como fonte”.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-gray-600 flex-1 min-w-[180px]">
          Gera assunto + corpo completo. Segmento atual:{' '}
          <span style={{ color: '#aaa' }}>
            {segmento === 'cliente' ? 'Clientes (tom contextual)' : segmento === 'lead' ? 'Leads' : 'Todos'}
          </span>
          {segmento === 'cliente' && tagsContexto.length > 0
            ? ` · tags: ${tagsContexto.join(', ')}`
            : ''}
        </p>
        <button
          type="button"
          onClick={gerar}
          disabled={gerando || disabled}
          className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            border: '1px solid rgba(212,175,55,0.35)',
            color: '#D4AF37',
            background: 'rgba(212,175,55,0.08)',
          }}
        >
          {gerando
            ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
            : <><Sparkles size={13} /> Gerar assunto e conteúdo</>}
        </button>
      </div>

      {erro && (
        <div
          role="alert"
          className="text-xs px-3 py-2 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}
        >
          {erro}
        </div>
      )}
      {info && !erro && (
        <div
          className="text-xs px-3 py-2 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E' }}
        >
          {info}
        </div>
      )}
    </div>
  )
}
