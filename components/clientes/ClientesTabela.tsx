'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Check, ExternalLink, Loader2, Lock, Users } from 'lucide-react'
import {
  CAMPOS_CLIENTE,
  type CampoCliente,
  type Cliente,
  type PermissoesClientes,
  colunasVisiveis,
  iniciais,
  podeEditarCampo,
  supabaseBrowser,
  useFeedback,
  valorExibicao,
} from './clientes-shared'
import FeedbackToast from './FeedbackToast'
import { getStageMeta } from '@/lib/client-stages'
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

type Edicao = { id: string; key: string; valor: string }

export default function ClientesTabela({
  clients,
  onPatch,
  isLight = false,
  permissoes,
  busca,
  onNovoCliente,
}: Props) {
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [salvos, setSalvos] = useState<Record<string, boolean>>({})
  const [erros, setErros] = useState<Record<string, string>>({})
  const [feedback, mostrarFeedback] = useFeedback()
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const colunas = useMemo(() => colunasVisiveis(clients), [clients])

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corBorda = isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'

  function limparErro(ck: string) {
    setErros((p) => {
      if (!(ck in p)) return p
      const n = { ...p }
      delete n[ck]
      return n
    })
  }

  function marcarSalvo(ck: string) {
    setSalvos((p) => ({ ...p, [ck]: true }))
    if (timers.current[ck]) clearTimeout(timers.current[ck])
    timers.current[ck] = setTimeout(() => {
      setSalvos((p) => {
        const n = { ...p }
        delete n[ck]
        return n
      })
    }, 2000)
  }

  async function salvar(cliente: Cliente, campo: CampoCliente, bruto: string) {
    const ck = `${cliente.id}:${campo.key}`
    const anterior = cliente[campo.key] ?? ''
    const valor = campo.tipo === 'uf' ? bruto.trim().toUpperCase() : bruto.trim()

    if (String(anterior) === valor) {
      setEdicao(null)
      limparErro(ck)
      return
    }

    const erroValidacao = campo.validar?.(valor)
    if (erroValidacao) {
      setErros((p) => ({ ...p, [ck]: erroValidacao }))
      return
    }

    setEdicao(null)
    limparErro(ck)
    setSalvando((p) => ({ ...p, [ck]: true }))

    const patch =
      campo.key === 'stage'
        ? patchPorTransicaoEtapa(valor)
        : ({ [campo.key]: valor } as Record<string, unknown>)
    onPatch(cliente.id, patch)

    const payload =
      campo.key === 'stage' ? updateEtapaPayload(valor) : { [campo.key]: valor }

    const { error } = await supabaseBrowser
      .from('clients')
      .update(payload)
      .eq('id', cliente.id)

    setSalvando((p) => {
      const n = { ...p }
      delete n[ck]
      return n
    })

    if (error) {
      onPatch(cliente.id, {
        [campo.key]: anterior,
        ...(campo.key === 'stage'
          ? { status: cliente.status, status_final: cliente.status_final ?? null }
          : {}),
      })
      setErros((p) => ({ ...p, [ck]: 'Não salvo — alteração desfeita.' }))
      mostrarFeedback('erro', `Falha ao salvar "${campo.label}" de ${cliente.name}: ${error.message}`)
      return
    }

    marcarSalvo(ck)
    mostrarFeedback('sucesso', `${campo.label} de ${cliente.name} atualizado.`)
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-20">
        <Users size={48} color={isLight ? '#D8D8D8' : '#2A2A2A'} className="mx-auto mb-4" />
        <p className="font-bold mb-2" style={{ color: corTexto }}>
          Nenhum cliente para listar
        </p>
        <p style={{ color: '#555', fontSize: 13 }}>
          {busca
            ? 'Nenhum resultado para a busca atual.'
            : 'Cadastre um cliente para começar a editar em lote.'}
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
      <p className="text-[11px] mb-2" style={{ color: '#666' }}>
        Clique em uma célula para editar. Enter salva, Esc cancela.
      </p>

      <div
        className="overflow-x-auto rounded-2xl"
        style={{
          background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.025)',
          border: `1px solid ${corBorda}`,
        }}
      >
        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 900 }}>
          <thead>
            <tr>
              {colunas.map((campo) => {
                const editavel = podeEditarCampo(campo, permissoes)
                return (
                  <th
                    key={campo.key}
                    scope="col"
                    className="text-left text-[10px] font-bold tracking-widest px-3 py-2.5 whitespace-nowrap"
                    style={{
                      color: 'rgba(212,175,55,0.75)',
                      borderBottom: `1px solid ${corBorda}`,
                      minWidth: campo.largura,
                      background: isLight ? '#FAFAFA' : 'rgba(0,0,0,0.2)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {campo.label.toUpperCase()}
                      {!editavel && <Lock size={9} aria-label="Somente leitura" />}
                    </span>
                  </th>
                )
              })}
              <th
                scope="col"
                className="px-3 py-2.5"
                style={{
                  borderBottom: `1px solid ${corBorda}`,
                  background: isLight ? '#FAFAFA' : 'rgba(0,0,0,0.2)',
                  width: 50,
                }}
              >
                <span className="sr-only">Abrir cliente</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((cliente) => (
              <tr key={cliente.id} className="transition-colors duration-200 hover:bg-white/[0.03]">
                {colunas.map((campo) => {
                  const ck = `${cliente.id}:${campo.key}`
                  const editavel = podeEditarCampo(campo, permissoes)
                  const emEdicao =
                    edicao && edicao.id === cliente.id && edicao.key === campo.key ? edicao : null
                  const erro = erros[ck]
                  const stage = campo.key === 'stage' ? getStageMeta(cliente.stage) : null

                  return (
                    <td
                      key={campo.key}
                      className="px-3 py-1.5 align-middle text-xs"
                      style={{ borderBottom: `1px solid ${corBorda}`, color: corTexto }}
                    >
                      {emEdicao && editavel ? (
                        campo.opcoes ? (
                          <select
                            autoFocus
                            aria-label={`${campo.label} de ${cliente.name}`}
                            value={emEdicao.valor}
                            onChange={(e) => salvar(cliente, campo, e.target.value)}
                            onBlur={() => setEdicao(null)}
                            className="w-full h-7 px-2 rounded-md text-xs outline-none"
                            style={{
                              background: isLight ? '#FFF' : 'rgba(0,0,0,0.6)',
                              border: '1px solid rgba(212,175,55,0.5)',
                              color: corTexto,
                            }}
                          >
                            {campo.opcoes.map((o) => (
                              <option
                                key={o.value}
                                value={o.value}
                                style={{ background: isLight ? '#FFF' : '#111' }}
                              >
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            autoFocus
                            aria-label={`${campo.label} de ${cliente.name}`}
                            aria-invalid={Boolean(erro)}
                            value={emEdicao.valor}
                            maxLength={campo.tipo === 'uf' ? 2 : undefined}
                            onChange={(e) =>
                              setEdicao({ id: cliente.id, key: campo.key, valor: e.target.value })
                            }
                            onBlur={(e) => salvar(cliente, campo, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                salvar(cliente, campo, e.currentTarget.value)
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault()
                                limparErro(ck)
                                setEdicao(null)
                              }
                            }}
                            className="w-full h-7 px-2 rounded-md text-xs outline-none"
                            style={{
                              background: isLight ? '#FFF' : 'rgba(0,0,0,0.6)',
                              border: `1px solid ${erro ? '#EF4444' : 'rgba(212,175,55,0.5)'}`,
                              color: corTexto,
                            }} spellCheck={true} />
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={!editavel}
                          onClick={() =>
                            setEdicao({
                              id: cliente.id,
                              key: campo.key,
                              valor: String(cliente[campo.key] ?? ''),
                            })
                          }
                          title={editavel ? `Editar ${campo.label}` : `${campo.label} — somente leitura`}
                          className="w-full text-left truncate rounded-md px-1.5 py-1 transition-colors duration-200"
                          style={{
                            color: campo.sensivel ? '#8A8A8A' : corTexto,
                            cursor: editavel ? 'text' : 'default',
                            border: '1px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (editavel) e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent'
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5 max-w-full">
                            {campo.key === 'name' && (
                              <span
                                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
                                style={{ background: '#D4AF37', color: '#000' }}
                              >
                                {iniciais(cliente.name)}
                              </span>
                            )}
                            {stage ? (
                              <span className="inline-flex items-center gap-1.5 max-w-full">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                                  style={{
                                    background: `rgba(${stage.rgb},0.12)`,
                                    color: stage.color,
                                    border: `1px solid rgba(${stage.rgb},0.3)`,
                                  }}
                                >
                                  {stage.label}
                                </span>
                                {isClienteArquivado(cliente) && (
                                  <span
                                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                                    style={{ background: 'rgba(136,136,136,0.18)', color: '#888' }}
                                  >
                                    Arquivado
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="truncate">{valorExibicao(cliente, campo)}</span>
                            )}
                            {campo.key === 'name' && isClienteArquivado(cliente) && !stage && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                                style={{ background: 'rgba(136,136,136,0.18)', color: '#888' }}
                              >
                                Arquivado
                              </span>
                            )}
                            {salvando[ck] && (
                              <Loader2 size={11} className="animate-spin flex-shrink-0" color="#D4AF37" />
                            )}
                            {salvos[ck] && <Check size={11} className="flex-shrink-0" color="#22C55E" />}
                          </span>
                        </button>
                      )}
                      {erro && (
                        <span
                          className="flex items-center gap-1 text-[10px] mt-0.5"
                          style={{ color: '#EF4444' }}
                        >
                          <AlertCircle size={9} /> {erro}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className="px-3 py-1.5 text-center" style={{ borderBottom: `1px solid ${corBorda}` }}>
                  <Link
                    href={`/clientes/${cliente.id}`}
                    title={`Abrir ficha de ${cliente.name}`}
                    className="inline-flex transition-colors duration-200"
                    style={{ color: '#D4AF37' }}
                  >
                    <ExternalLink size={14} />
                    <span className="sr-only">Ver detalhes de {cliente.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {colunas.length < CAMPOS_CLIENTE.length && (
        <p className="text-[10px] mt-2" style={{ color: '#555' }}>
          Algumas colunas não aparecem porque seu perfil de acesso não recebe esses dados.
        </p>
      )}

      <FeedbackToast feedback={feedback} />
    </div>
  )
}
