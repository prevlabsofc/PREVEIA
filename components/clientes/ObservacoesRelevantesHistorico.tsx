'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  FileText,
  History,
  MessageSquareText,
  ScrollText,
  Wallet,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { formatarDataBR } from '@/lib/formatar-data'
import { listarAnotacoesCliente } from '@/lib/client-notes'
import {
  montarHistoricoRelevante,
  type ItemHistoricoRelevante,
} from '@/lib/historico-relevante-cliente'

type DocHistorico = {
  id?: string
  title?: string | null
  agent_type?: string | null
  created_at?: string | null
  form_data?: Record<string, unknown> | null
  status?: string | null
}

interface Props {
  clientId: string
  documentos?: DocHistorico[]
  isLight?: boolean
}

function iconeDoTipo(tipo: ItemHistoricoRelevante['tipo']) {
  switch (tipo) {
    case 'indeferimento':
      return AlertTriangle
    case 'beneficio':
      return Wallet
    case 'documento':
      return FileText
    case 'extracao':
      return ScrollText
    case 'peticao':
      return History
    default:
      return MessageSquareText
  }
}

function corDoTipo(tipo: ItemHistoricoRelevante['tipo']): string {
  if (tipo === 'indeferimento') return '#EF4444'
  if (tipo === 'beneficio') return '#22C55E'
  return '#D4AF37'
}

/**
 * Bloco compacto com pontos importantes do histórico
 * (indeferimentos, tentativas, documentos, anotações).
 */
export function ObservacoesRelevantesHistorico({
  clientId,
  documentos = [],
  isLight = false,
}: Props) {
  const [notesLoading, setNotesLoading] = useState(true)
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof listarAnotacoesCliente>>['notes']>([])

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setNotesLoading(true)
      const { notes: lista } = await listarAnotacoesCliente(clientId)
      if (!ativo) return
      setNotes(lista)
      setNotesLoading(false)
    }
    void carregar()
    return () => {
      ativo = false
    }
  }, [clientId])

  const itens = useMemo(
    () => montarHistoricoRelevante({ notes, documentos, limite: 8 }),
    [notes, documentos]
  )

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
      <h3 className="font-bold flex items-center gap-2 mb-1" style={{ color: corTexto }}>
        <History size={18} color="#D4AF37" /> Observações relevantes do histórico
      </h3>
      <p className="text-xs mb-4" style={{ color: corMuted }}>
        Indeferimentos, benefícios, tentativas e documentos já apresentados.
      </p>

      {notesLoading ? (
        <p className="text-sm" style={{ color: corMuted }}>
          Carregando histórico…
        </p>
      ) : itens.length === 0 ? (
        <div className="text-center py-6 px-2">
          <History size={28} color="#444" className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: corMuted }}>
            Ainda não há histórico relevante. Quando houver indeferimentos, petições ou
            documentos anexados, eles aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => {
            const Icon = iconeDoTipo(item.tipo)
            const cor = corDoTipo(item.tipo)
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{
                  background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${cor}18` }}
                >
                  <Icon size={14} color={cor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: corTexto }}>
                    {item.texto}
                  </p>
                  {item.data && (
                    <p className="text-[11px] mt-1" style={{ color: corMuted }}>
                      {formatarDataBR(item.data)}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}
