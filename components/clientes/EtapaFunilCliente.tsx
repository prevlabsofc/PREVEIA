'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  STAGES,
  STAGE_IDS,
  type ClientStage,
  getStageMeta,
  isFinalStage,
  normalizeStage,
  stageIndex,
} from '@/lib/client-stages'
import { patchPorTransicaoEtapa, updateEtapaPayload } from '@/lib/client-archive'
import { supabaseBrowser, useFeedback } from './clientes-shared'
import FeedbackToast from './FeedbackToast'

type Props = {
  clientId: string
  stage: unknown
  isLight?: boolean
  /** Quando false, o controle fica somente leitura (RBAC). */
  podeEditar?: boolean
  onAtualizar: (patch: { stage: ClientStage; status?: string; status_final?: string | null }) => void
}

/**
 * Controle de etapa do funil na ficha do cliente.
 * Stepper + select (acessível sem drag) com escrita otimista em `clients.stage`.
 * Etapas finais (Concluído / Protocolado) disparam auto-arquivamento via trigger.
 */
export default function EtapaFunilCliente({
  clientId,
  stage,
  isLight = false,
  podeEditar = true,
  onAtualizar,
}: Props) {
  const atual = normalizeStage(stage)
  const meta = getStageMeta(atual)
  const idx = stageIndex(atual)
  const [salvando, setSalvando] = useState(false)
  const [feedback, mostrarFeedback] = useFeedback()
  const corTexto = isLight ? '#1E1E1E' : '#fff'

  async function mudar(destino: ClientStage) {
    if (!podeEditar || salvando) return
    if (destino === atual) return

    const destinoLabel = getStageMeta(destino).label
    const origem = atual
    const patch = patchPorTransicaoEtapa(destino)
    setSalvando(true)
    onAtualizar(patch)

    const { error } = await supabaseBrowser
      .from('clients')
      .update(updateEtapaPayload(destino))
      .eq('id', clientId)

    setSalvando(false)

    if (error) {
      onAtualizar({ stage: origem })
      mostrarFeedback('erro', `Não foi possível atualizar a etapa: ${error.message}`)
      return
    }

    const extra = isFinalStage(destino)
      ? ' Cliente movido para Arquivados.'
      : isFinalStage(origem)
        ? ' Cliente reaberto na lista ativa.'
        : ''
    mostrarFeedback('sucesso', `Etapa atualizada para "${destinoLabel}".${extra}`)
  }

  function avancar(direcao: -1 | 1) {
    const alvo = idx + direcao
    if (alvo < 0 || alvo >= STAGE_IDS.length) return
    mudar(STAGE_IDS[alvo])
  }

  return (
    <section
      aria-label="Etapa do funil"
      className="rounded-xl p-4"
      style={{
        background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: '#666' }}>
            Etapa do funil
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{
                background: `rgba(${meta.rgb},0.12)`,
                color: meta.color,
                border: `1px solid rgba(${meta.rgb},0.35)`,
              }}
            >
              {meta.label}
            </span>
            {isFinalStage(atual) && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(136,136,136,0.15)', color: '#888' }}
              >
                Arquivado
              </span>
            )}
            {salvando && <Loader2 size={12} className="animate-spin" color="#D4AF37" aria-hidden />}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Etapa anterior"
            disabled={!podeEditar || salvando || idx === 0}
            onClick={() => avancar(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
            style={{
              border: `1px solid ${isLight ? '#E4E4E4' : 'rgba(255,255,255,0.1)'}`,
              color: podeEditar && idx > 0 ? corTexto : '#555',
              cursor: podeEditar && idx > 0 ? 'pointer' : 'not-allowed',
              background: 'transparent',
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Próxima etapa"
            disabled={!podeEditar || salvando || idx === STAGE_IDS.length - 1}
            onClick={() => avancar(1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
            style={{
              border: `1px solid ${isLight ? '#E4E4E4' : 'rgba(255,255,255,0.1)'}`,
              color: podeEditar && idx < STAGE_IDS.length - 1 ? corTexto : '#555',
              cursor: podeEditar && idx < STAGE_IDS.length - 1 ? 'pointer' : 'not-allowed',
              background: 'transparent',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Stepper visual — cliques nas bolinhas também avançam (não-drag). */}
      <ol className="flex items-center gap-1 mb-3" aria-hidden>
        {STAGES.map((s, i) => {
          const ativo = i === idx
          const passado = i < idx
          return (
            <li key={s.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                disabled={!podeEditar || salvando}
                title={s.label}
                aria-label={`Ir para ${s.label}`}
                aria-current={ativo ? 'step' : undefined}
                onClick={() => mudar(s.id)}
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-200"
                style={{
                  background: ativo || passado ? s.color : isLight ? '#DDD' : '#333',
                  outline: ativo ? `2px solid rgba(${s.rgb},0.45)` : 'none',
                  outlineOffset: 2,
                  cursor: podeEditar ? 'pointer' : 'default',
                }}
              />
              {i < STAGES.length - 1 && (
                <span
                  className="flex-1 h-px mx-1"
                  style={{
                    background: passado ? `rgba(${s.rgb},0.5)` : isLight ? '#E8E8E8' : 'rgba(255,255,255,0.08)',
                  }}
                />
              )}
            </li>
          )
        })}
      </ol>

      <label className="sr-only" htmlFor={`etapa-funil-${clientId}`}>
        Selecionar etapa do funil
      </label>
      <select
        id={`etapa-funil-${clientId}`}
        value={atual}
        disabled={!podeEditar || salvando}
        onChange={(e) => mudar(e.target.value as ClientStage)}
        className="w-full h-9 px-3 rounded-lg text-xs outline-none transition-colors duration-200"
        style={{
          background: isLight ? '#FFF' : 'rgba(0,0,0,0.35)',
          border: `1px solid ${isLight ? '#E4E4E4' : 'rgba(255,255,255,0.1)'}`,
          color: podeEditar ? corTexto : '#666',
          cursor: podeEditar ? 'pointer' : 'not-allowed',
        }}
      >
        {STAGES.map((s) => (
          <option key={s.id} value={s.id} style={{ background: isLight ? '#FFF' : '#111' }}>
            {s.label}
          </option>
        ))}
      </select>

      {!podeEditar && (
        <p className="text-[10px] mt-2" style={{ color: '#555' }}>
          Seu perfil não pode alterar a etapa deste cliente.
        </p>
      )}

      <FeedbackToast feedback={feedback} />
    </section>
  )
}
