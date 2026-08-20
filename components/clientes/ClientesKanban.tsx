'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { GripVertical, Loader2, MapPin, Users } from 'lucide-react'
import {
  CAMPOS_CLIENTE,
  type Cliente,
  type PermissoesClientes,
  camposPresentes,
  cpfMascarado,
  iniciais,
  podeEditarCampo,
  supabaseBrowser,
  useFeedback,
} from './clientes-shared'
import FeedbackToast from './FeedbackToast'
import { STAGES, STAGE_IDS, type ClientStage, isFinalStage, normalizeStage, stageIndex } from '@/lib/client-stages'
import { isClienteArquivado, patchPorTransicaoEtapa, updateEtapaPayload } from '@/lib/client-archive'

type Props = {
  clients: Cliente[]
  /** Aplica um patch otimista na lista da página (e também o rollback). */
  onPatch: (id: string, patch: Record<string, unknown>) => void
  isLight?: boolean
  permissoes?: PermissoesClientes
  busca?: string
  onNovoCliente?: () => void
}

const CAMPO_STAGE = CAMPOS_CLIENTE.find((c) => c.key === 'stage')!

export default function ClientesKanban({
  clients,
  onPatch,
  isLight = false,
  permissoes,
  busca,
  onNovoCliente,
}: Props) {
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [colunaAlvo, setColunaAlvo] = useState<ClientStage | null>(null)
  const [movendo, setMovendo] = useState<Record<string, boolean>>({})
  const [feedback, mostrarFeedback] = useFeedback()

  const podeMover = podeEditarCampo(CAMPO_STAGE, permissoes)
  const presentes = useMemo(() => camposPresentes(clients), [clients])

  const porEtapa = useMemo(() => {
    const mapa = new Map<ClientStage, Cliente[]>(STAGE_IDS.map((id) => [id, [] as Cliente[]]))
    for (const c of clients) mapa.get(normalizeStage(c.stage))!.push(c)
    return mapa
  }, [clients])

  const corTexto = isLight ? '#1E1E1E' : '#fff'

  async function mover(id: string, destino: ClientStage) {
    const cliente = clients.find((c) => c.id === id)
    if (!cliente) return

    const origem = normalizeStage(cliente.stage)
    if (origem === destino) return

    if (!podeMover) {
      mostrarFeedback('erro', 'Seu perfil de acesso não permite alterar a etapa do cliente.')
      return
    }

    const destinoLabel = STAGES.find((s) => s.id === destino)!.label

    setMovendo((p) => ({ ...p, [id]: true }))
    onPatch(id, patchPorTransicaoEtapa(destino))

    const { error } = await supabaseBrowser.from('clients').update(updateEtapaPayload(destino)).eq('id', id)

    setMovendo((p) => {
      const n = { ...p }
      delete n[id]
      return n
    })

    if (error) {
      onPatch(id, {
        stage: origem,
        status: cliente.status,
        status_final: cliente.status_final ?? null,
      })
      mostrarFeedback('erro', `Não foi possível mover ${cliente.name}: ${error.message}. Etapa restaurada.`)
      return
    }

    const extra = isFinalStage(destino)
      ? ' Movido para Arquivados.'
      : isFinalStage(origem)
        ? ' Reaberto na lista ativa.'
        : ''
    mostrarFeedback('sucesso', `${cliente.name} movido para "${destinoLabel}".${extra}`)
  }

  function moverPorTeclado(cliente: Cliente, direcao: -1 | 1) {
    const alvo = stageIndex(cliente.stage) + direcao
    if (alvo < 0 || alvo >= STAGE_IDS.length) return
    mover(cliente.id, STAGE_IDS[alvo])
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-20">
        <Users size={48} color={isLight ? '#D8D8D8' : '#2A2A2A'} className="mx-auto mb-4" />
        <p className="font-bold mb-2" style={{ color: corTexto }}>
          Funil vazio
        </p>
        <p style={{ color: '#555', fontSize: 13 }}>
          {busca
            ? 'Nenhum cliente corresponde à busca atual.'
            : 'Cadastre um cliente para acompanhá-lo pelas etapas do atendimento.'}
        </p>
        {!busca && onNovoCliente && (
          <button
            onClick={onNovoCliente}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}
          >
            + Novo Cliente
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-[11px] mb-3" style={{ color: '#666' }}>
        Arraste os cards entre as colunas ou, com o card em foco, use{' '}
        <span style={{ color: '#D4AF37' }}>Alt + ← / →</span> para avançar e retroceder a etapa. O seletor
        &quot;Mover para&quot; dentro do card funciona no celular e com leitor de tela.
      </p>

      <div
        className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {STAGES.map((etapa) => {
          const itens = porEtapa.get(etapa.id) ?? []
          const alvo = colunaAlvo === etapa.id && arrastando !== null

          return (
            <section
              key={etapa.id}
              aria-label={`${etapa.label} — ${itens.length} cliente(s)`}
              onDragOver={(e) => {
                if (!podeMover) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (colunaAlvo !== etapa.id) setColunaAlvo(etapa.id)
              }}
              onDragLeave={() => setColunaAlvo((c) => (c === etapa.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain') || arrastando
                setColunaAlvo(null)
                setArrastando(null)
                if (id) mover(id, etapa.id)
              }}
              className="flex-shrink-0 rounded-2xl p-3 transition-colors duration-200"
              style={{
                width: 288,
                minHeight: 320,
                scrollSnapAlign: 'start',
                background: alvo
                  ? `rgba(${etapa.rgb},0.10)`
                  : isLight
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.025)',
                border: `1px solid ${alvo ? `rgba(${etapa.rgb},0.55)` : isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <header className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: etapa.color }}
                    aria-hidden
                  />
                  <h3 className="text-xs font-bold truncate" style={{ color: corTexto }}>
                    {etapa.label}
                  </h3>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: `rgba(${etapa.rgb},0.12)`,
                    color: etapa.color,
                    border: `1px solid rgba(${etapa.rgb},0.3)`,
                  }}
                >
                  {itens.length}
                </span>
              </header>

              <div className="flex flex-col gap-2">
                {itens.length === 0 && (
                  <p
                    className="text-[11px] text-center py-8 rounded-xl"
                    style={{
                      color: '#555',
                      border: `1px dashed ${isLight ? '#E4E4E4' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    Nenhum cliente nesta etapa
                  </p>
                )}

                {itens.map((cliente) => {
                  const emMovimento = Boolean(movendo[cliente.id])
                  return (
                    <article
                      key={cliente.id}
                      tabIndex={0}
                      draggable={podeMover}
                      aria-roledescription="Card de cliente no funil"
                      aria-label={`${cliente.name} — etapa ${etapa.label}`}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', cliente.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setArrastando(cliente.id)
                      }}
                      onDragEnd={() => {
                        setArrastando(null)
                        setColunaAlvo(null)
                      }}
                      onKeyDown={(e) => {
                        if (!e.altKey) return
                        if (e.key === 'ArrowRight') {
                          e.preventDefault()
                          moverPorTeclado(cliente, 1)
                        }
                        if (e.key === 'ArrowLeft') {
                          e.preventDefault()
                          moverPorTeclado(cliente, -1)
                        }
                      }}
                      className="rounded-xl p-3 transition-colors duration-200 focus:outline-none"
                      style={{
                        background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isLight ? '#E8E8E8' : 'rgba(255,255,255,0.08)'}`,
                        opacity: arrastando === cliente.id ? 0.45 : 1,
                        cursor: podeMover ? 'grab' : 'default',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isLight ? '#E8E8E8' : 'rgba(255,255,255,0.08)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isLight ? '#E8E8E8' : 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {podeMover && (
                          <GripVertical size={13} className="mt-1 flex-shrink-0" color="#666" aria-hidden />
                        )}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                          style={{ background: '#D4AF37', color: '#000' }}
                        >
                          {iniciais(cliente.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="text-xs font-bold truncate" style={{ color: corTexto }}>
                              {cliente.name}
                            </div>
                            {isClienteArquivado(cliente) && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ background: 'rgba(136,136,136,0.18)', color: '#888' }}
                              >
                                Arquivado
                              </span>
                            )}
                          </div>
                          {presentes.has('cpf') && (
                            <div className="text-[10px]" style={{ color: '#666' }}>
                              CPF {cpfMascarado(cliente.cpf)}
                            </div>
                          )}
                        </div>
                        {emMovimento && (
                          <Loader2 size={12} className="animate-spin flex-shrink-0 mt-1" color="#D4AF37" />
                        )}
                      </div>

                      {(cliente.city || cliente.zone) && (
                        <div
                          className="flex items-center gap-1.5 mt-2 text-[10px] truncate"
                          style={{ color: '#777' }}
                        >
                          <MapPin size={10} className="flex-shrink-0" aria-hidden />
                          <span className="truncate">
                            {[cliente.city, cliente.state].filter(Boolean).join(' - ') || 'Sem cidade'}
                            {cliente.zone ? ` · ${cliente.zone === 'rural' ? 'Rural' : 'Urbano'}` : ''}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <label className="sr-only" htmlFor={`mover-${cliente.id}`}>
                          Mover {cliente.name} para outra etapa
                        </label>
                        <select
                          id={`mover-${cliente.id}`}
                          value={etapa.id}
                          disabled={!podeMover || emMovimento}
                          onChange={(e) => mover(cliente.id, e.target.value as ClientStage)}
                          className="flex-1 h-7 px-2 rounded-lg text-[10px] outline-none transition-colors duration-200"
                          style={{
                            background: isLight ? '#FFF' : 'rgba(0,0,0,0.35)',
                            border: `1px solid ${isLight ? '#E4E4E4' : 'rgba(255,255,255,0.1)'}`,
                            color: podeMover ? corTexto : '#666',
                            cursor: podeMover ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id} style={{ background: isLight ? '#FFF' : '#111' }}>
                              Mover para: {s.label}
                            </option>
                          ))}
                        </select>
                        <Link
                          href={`/clientes/${cliente.id}`}
                          className="text-[10px] font-bold whitespace-nowrap transition-colors duration-200"
                          style={{ color: '#D4AF37' }}
                        >
                          Detalhes →
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {!podeMover && (
        <p className="text-[10px] mt-1" style={{ color: '#555' }}>
          Visualização somente leitura: seu perfil de acesso não pode alterar a etapa dos clientes.
        </p>
      )}

      <FeedbackToast feedback={feedback} />
    </div>
  )
}
