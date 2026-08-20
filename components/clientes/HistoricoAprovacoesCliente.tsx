'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { CheckCircle2, ChevronDown, ChevronRight, Clock, ShieldCheck, XCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { formatarDataHoraBR } from '@/lib/formatar-data'

type StatusAprovacao = 'pendente' | 'aceito' | 'recusado' | 'expirado' | 'revogado'

type SnapshotAceite = {
  nome?: string | null
  cpf_mascarado?: string | null
  profissao?: string | null
  zona?: string | null
  cidade?: string | null
  estado?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  escritorio_nome?: string | null
  advogado_nome?: string | null
  resumo_caso?: string | null
  gerado_em?: string | null
  [key: string]: unknown
}

type LinhaAprovacao = {
  id: string
  status: StatusAprovacao
  snapshot: SnapshotAceite | null
  created_at: string
  expires_at: string | null
  accepted_at: string | null
  accepted_ip: string | null
  declined_at: string | null
  revoked_at: string | null
}

const ROTULO: Record<StatusAprovacao, string> = {
  pendente: 'Pendente',
  aceito: 'Aceito',
  recusado: 'Recusado',
  expirado: 'Expirado',
  revogado: 'Revogado',
}

const COR: Record<StatusAprovacao, string> = {
  pendente: '#F59E0B',
  aceito: '#22C55E',
  recusado: '#EF4444',
  expirado: '#888',
  revogado: '#888',
}

function statusEfetivo(a: LinhaAprovacao): StatusAprovacao {
  if (
    a.status === 'pendente' &&
    a.expires_at &&
    new Date(a.expires_at).getTime() < Date.now()
  ) {
    return 'expirado'
  }
  return a.status
}

function dataPrincipal(a: LinhaAprovacao, status: StatusAprovacao): string | null {
  if (status === 'aceito') return a.accepted_at
  if (status === 'recusado') return a.declined_at
  if (status === 'revogado') return a.revoked_at
  return a.created_at
}

function IconeStatus({ status }: { status: StatusAprovacao }) {
  const cor = COR[status]
  if (status === 'aceito') return <CheckCircle2 size={15} color={cor} />
  if (status === 'recusado') return <XCircle size={15} color={cor} />
  if (status === 'pendente') return <Clock size={15} color={cor} />
  return <ShieldCheck size={15} color={cor} />
}

const CAMPOS_SNAPSHOT: { key: keyof SnapshotAceite; label: string }[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cpf_mascarado', label: 'CPF' },
  { key: 'profissao', label: 'Profissão' },
  { key: 'zona', label: 'Zona' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'escritorio_nome', label: 'Escritório' },
  { key: 'advogado_nome', label: 'Advogado' },
  { key: 'resumo_caso', label: 'Resumo do caso' },
  { key: 'gerado_em', label: 'Gerado em' },
]

interface Props {
  clientId: string
  isLight?: boolean
}

/**
 * Linha do tempo de aceites formais do cliente (auditoria do Loumi Link).
 * Só leitura — o fluxo público de aceite vive em outra rota.
 */
export default function HistoricoAprovacoesCliente({ clientId, isLight = false }: Props) {
  const [itens, setItens] = useState<LinhaAprovacao[]>([])
  const [loading, setLoading] = useState(true)
  const [aberto, setAberto] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      setLoading(true)
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { data } = await supabase
        .from('aprovacoes_cliente')
        .select(
          'id, status, snapshot, created_at, expires_at, accepted_at, accepted_ip, declined_at, revoked_at'
        )
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (!cancelado) {
        setItens((data as LinhaAprovacao[]) || [])
        setLoading(false)
      }
    }
    if (clientId) carregar()
    return () => {
      cancelado = true
    }
  }, [clientId])

  const corTexto = isLight ? '#1E1E1E' : '#fff'

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginTop: 20 }}>
      <h3 className="font-bold flex items-center gap-2 mb-3" style={{ color: corTexto }}>
        <ShieldCheck size={18} color="#D4AF37" /> Histórico de Aprovações
      </h3>

      {loading ? (
        <div className="flex justify-center py-8">
          <div
            className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
          />
        </div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Nenhuma aprovação registrada ainda.
        </p>
      ) : (
        <ol className="relative space-y-0 pl-1">
          {itens.map((a, i) => {
            const status = statusEfetivo(a)
            const cor = COR[status]
            const dataEvt = dataPrincipal(a, status)
            const expandido = aberto === a.id
            const snap = (a.snapshot || {}) as SnapshotAceite

            return (
              <li key={a.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < itens.length - 1 && (
                  <span
                    className="absolute left-[11px] top-7 bottom-0 w-px"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    aria-hidden
                  />
                )}
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-[1]"
                  style={{ background: `${cor}18`, border: `1px solid ${cor}55` }}
                >
                  <IconeStatus status={status} />
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setAberto(expandido ? null : a.id)}
                    className="w-full text-left p-3 rounded-xl transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${cor}18`, color: cor }}
                          >
                            {ROTULO[status]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatarDataHoraBR(dataEvt) || '—'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                          {a.accepted_ip ? (
                            <span>
                              IP: <span style={{ color: corTexto }}>{a.accepted_ip}</span>
                            </span>
                          ) : (
                            <span>IP: —</span>
                          )}
                        </div>
                      </div>
                      {expandido ? (
                        <ChevronDown size={14} color="#888" className="flex-shrink-0 mt-1" />
                      ) : (
                        <ChevronRight size={14} color="#888" className="flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>

                  {expandido && (
                    <div
                      className="mt-2 p-3 rounded-xl text-xs space-y-1.5"
                      style={{
                        background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(212,175,55,0.12)',
                      }}
                    >
                      <div
                        className="text-[10px] font-bold tracking-wide mb-2"
                        style={{ color: '#D4AF37' }}
                      >
                        SNAPSHOT APROVADO
                      </div>
                      {CAMPOS_SNAPSHOT.map(({ key, label }) => {
                        const valor = snap[key]
                        if (valor == null || valor === '') return null
                        const texto =
                          key === 'gerado_em'
                            ? formatarDataHoraBR(String(valor)) || String(valor)
                            : String(valor)
                        return (
                          <div key={String(key)} className="flex gap-2">
                            <span className="text-gray-500 w-28 flex-shrink-0">{label}</span>
                            <span className="break-words" style={{ color: corTexto }}>
                              {texto}
                            </span>
                          </div>
                        )
                      })}
                      {Object.keys(snap).length === 0 && (
                        <p className="text-gray-500">Snapshot vazio.</p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </GlassCard>
  )
}
