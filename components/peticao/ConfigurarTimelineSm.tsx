'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Eye, Plus, Trash2, X } from 'lucide-react'
import {
  type TimelineData,
  type TimelineEstilo,
  type TimelineEvento,
  montarTimelineDataPadrao,
  renderTimelineHtml,
} from '@/lib/peticao-sm-rural'

type Props = {
  formData: Record<string, string>
  isLight?: boolean
  onConfirm: (data: TimelineData) => void
  onCancel: () => void
}

const ESTILOS: { id: TimelineEstilo; titulo: string; desc: string }[] = [
  {
    id: 'horizontal',
    titulo: 'Horizontal (Custódio)',
    desc: 'Pontos numerados numa linha, datas alternando acima/abaixo — SVG no PDF',
  },
  {
    id: 'vertical',
    titulo: 'Vertical',
    desc: 'Lista cronológica simples, mais estável na renderização',
  },
  {
    id: 'none',
    titulo: 'Sem linha do tempo',
    desc: 'Apenas o texto narrativo da síntese fática',
  },
]

/**
 * Etapa pré-geração: estilo da timeline, edição dos eventos e preview ao vivo.
 */
export function ConfigurarTimelineSm({
  formData,
  isLight = false,
  onConfirm,
  onCancel,
}: Props) {
  const inicial = useMemo(() => montarTimelineDataPadrao(formData, 'horizontal'), [formData])
  const [estilo, setEstilo] = useState<TimelineEstilo>(inicial.estilo || 'horizontal')
  const [nome, setNome] = useState(inicial.nome)
  const [atividade, setAtividade] = useState(inicial.atividade)
  const [local, setLocal] = useState(inicial.local)
  const [eventos, setEventos] = useState<TimelineEvento[]>(inicial.eventos)

  useEffect(() => {
    const next = montarTimelineDataPadrao(formData, estilo)
    setNome(next.nome)
    setAtividade(next.atividade)
    setLocal(next.local)
    setEventos(next.eventos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previewData: TimelineData = {
    nome,
    atividade,
    local,
    estilo,
    eventos: eventos.filter((e) => e.titulo.trim() || e.data.trim()),
  }

  const previewHtml = useMemo(() => {
    if (estilo === 'none') {
      return '<p style="color:#888;font-size:12px;padding:12px">Sem linha do tempo — apenas o texto narrativo será usado.</p>'
    }
    return renderTimelineHtml(previewData)
  }, [estilo, nome, atividade, local, eventos])

  function atualizarEvento(i: number, patch: Partial<TimelineEvento>) {
    setEventos((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  function adicionarEvento() {
    setEventos((prev) => [...prev, { data: '', titulo: '', detalhe: '' }])
  }

  function removerEvento(i: number) {
    setEventos((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  function confirmar() {
    const limpos = eventos
      .map((e) => ({
        data: e.data.trim() || '—',
        titulo: e.titulo.trim() || 'Evento',
        detalhe: (e.detalhe || '').trim(),
      }))
      .filter((e) => e.titulo !== 'Evento' || e.data !== '—')

    onConfirm({
      nome: nome.trim() || 'AUTORA',
      atividade: atividade.trim() || 'Agricultora',
      local: local.trim(),
      estilo,
      eventos: limpos.length ? limpos : eventos,
    })
  }

  const cardBg = isLight ? '#FFFFFF' : '#0A0800'
  const border = isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.25)'
  const texto = isLight ? '#1E1E1E' : '#eee'
  const muted = isLight ? '#6B7280' : '#888'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: isLight ? 'rgba(15,15,15,0.45)' : 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl"
        style={{ background: cardBg, border, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
      >
        <div
          className="flex items-start justify-between gap-3 p-5 border-b sticky top-0 z-10"
          style={{ borderColor: isLight ? '#EDEDED' : 'rgba(255,255,255,0.08)', background: cardBg }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: '#D4AF37' }}>
              Configurar linha do tempo
            </h2>
            <p className="text-xs mt-0.5" style={{ color: muted }}>
              Defina o estilo e os eventos antes de gerar a petição final
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg" style={{ color: muted }} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 1. Estilo */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(212,175,55,0.8)' }}>
              1. ESTILO VISUAL
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ESTILOS.map((op) => {
                const ativo = estilo === op.id
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setEstilo(op.id)}
                    className="text-left px-3 py-3 rounded-xl transition-all"
                    style={{
                      background: ativo
                        ? 'rgba(212,175,55,0.12)'
                        : isLight
                          ? '#F8F8F8'
                          : 'rgba(255,255,255,0.03)',
                      border: ativo
                        ? '1px solid rgba(212,175,55,0.45)'
                        : isLight
                          ? '1px solid #EDEDED'
                          : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-xs font-bold" style={{ color: ativo ? '#D4AF37' : texto }}>
                      {op.titulo}
                    </div>
                    <div className="text-[10px] mt-1 leading-snug" style={{ color: muted }}>
                      {op.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Meta da timeline */}
          {estilo !== 'none' && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] mb-1" style={{ color: muted }}>Nome na timeline</label>
                <input
                  className="input-glass w-full text-sm px-3"
                  style={{ height: 38 }}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  spellCheck={true}
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: muted }}>Atividade</label>
                <input
                  className="input-glass w-full text-sm px-3"
                  style={{ height: 38 }}
                  value={atividade}
                  onChange={(e) => setAtividade(e.target.value)}
                  spellCheck={true}
                />
              </div>
              <div>
                <label className="block text-[10px] mb-1" style={{ color: muted }}>Local</label>
                <input
                  className="input-glass w-full text-sm px-3"
                  style={{ height: 38 }}
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  placeholder="Cidade/UF"
                  spellCheck={true}
                />
              </div>
            </section>
          )}

          {/* 2. Eventos */}
          {estilo !== 'none' && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.8)' }}>
                  2. EVENTOS DA TIMELINE
                </h3>
                <button
                  type="button"
                  onClick={adicionarEvento}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg"
                  style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}
                >
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {eventos.map((ev, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-[28px_1fr_1fr_1fr_32px] gap-2 items-start"
                    style={{
                      background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)',
                      border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-1"
                      style={{ background: '#0A2540', color: '#fff' }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <label className="block text-[9px] mb-0.5" style={{ color: muted }}>Data</label>
                      <input
                        className="input-glass w-full text-xs px-2"
                        style={{ height: 34 }}
                        value={ev.data}
                        onChange={(e) => atualizarEvento(i, { data: e.target.value })}
                        placeholder="DD/MM/AAAA"
                        spellCheck={true}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] mb-0.5" style={{ color: muted }}>Título</label>
                      <input
                        className="input-glass w-full text-xs px-2"
                        style={{ height: 34 }}
                        value={ev.titulo}
                        onChange={(e) => atualizarEvento(i, { titulo: e.target.value })}
                        placeholder="Ex: Requerimento"
                        spellCheck={true}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] mb-0.5" style={{ color: muted }}>Subtítulo</label>
                      <input
                        className="input-glass w-full text-xs px-2"
                        style={{ height: 34 }}
                        value={ev.detalhe || ''}
                        onChange={(e) => atualizarEvento(i, { detalhe: e.target.value })}
                        placeholder="Detalhe opcional"
                        spellCheck={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removerEvento(i)}
                      disabled={eventos.length <= 1}
                      className="mt-4 p-1.5 rounded-lg disabled:opacity-30"
                      style={{ color: '#EF4444' }}
                      aria-label="Remover evento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. Preview */}
          <section>
            <h3 className="text-[10px] font-bold tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'rgba(212,175,55,0.8)' }}>
              <Eye size={12} /> 3. PREVIEW EM TEMPO REAL
            </h3>
            <div
              className="rounded-xl overflow-auto p-3"
              style={{
                background: '#fff',
                border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)',
                maxHeight: 280,
              }}
            >
              <style>{`
                .sm-timeline { margin: 8px 0; }
                .sm-timeline svg { display: block; width: 100%; height: auto; }
                .sm-timeline-vertical { background: #EEF1F5; border: 1px solid #D0D7E2; border-radius: 10px; padding: 12px 14px; }
                .sm-tl-title { font-weight: bold; font-size: 11.5px; color: #0A2540; margin-bottom: 10px; text-transform: uppercase; }
                .sm-tl-table { width: 100%; border-collapse: collapse; }
                .sm-tl-table td { padding: 8px 6px; vertical-align: top; border-bottom: 1px solid #d8dee8; }
                .sm-tl-num {
                  font-weight: bold; color: #fff; background: #0A2540;
                  text-align: center; border-radius: 50%; width: 22px; height: 22px;
                  line-height: 22px; display: inline-block; font-size: 11px;
                }
                .sm-tl-data { width: 110px; font-size: 10.5px; color: #555; white-space: nowrap; }
                .sm-tl-titulo { font-weight: bold; font-size: 11.5px; color: #0A2540; }
                .sm-tl-detalhe { font-size: 10px; color: #666; margin-top: 2px; }
              `}</style>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </section>
        </div>

        <div
          className="flex justify-end gap-2 p-5 border-t sticky bottom-0"
          style={{ borderColor: isLight ? '#EDEDED' : 'rgba(255,255,255,0.08)', background: cardBg }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs"
            style={{ border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.12)', color: muted }}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}
          >
            Continuar e gerar
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
