'use client'

import { useState } from 'react'
import { CalendarClock, UserCheck, Check, Loader2 } from 'lucide-react'
import { corDeAtraso, formatarDataBR, tempoRelativo } from '@/lib/formatar-data'
import { rotuloResponsavel, type MembroEquipe } from '@/lib/equipe'
import { definirUltimoContato } from '@/lib/registrar-contato'

interface Props {
  clientId: string
  ultimoContato?: string | null
  responsavelId?: string | null
  membros: MembroEquipe[]
  nomesExtras?: Record<string, string>
  isLight?: boolean
  /** Sincroniza o estado do pai depois da escrita otimista. */
  onAtualizar?: (patch: { last_contact_at?: string | null }) => void
}

/**
 * Bloco compacto de CRM exibido no card do cliente na carteira: último contato
 * (com o quanto tempo faz) e responsável pelo atendimento.
 */
export function ResumoCrmCliente({
  clientId,
  ultimoContato,
  responsavelId,
  membros,
  nomesExtras = {},
  isLight = false,
  onAtualizar,
}: Props) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const responsavel = rotuloResponsavel(responsavelId, membros, nomesExtras)
  const corAtraso = corDeAtraso(ultimoContato)
  const corTexto = isLight ? '#1E1E1E' : '#fff'

  async function registrarHoje(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (salvando) return

    const anterior = ultimoContato ?? null
    const agora = new Date().toISOString()
    setErro('')
    setSalvando(true)
    onAtualizar?.({ last_contact_at: agora })

    const { ok, erro: msg } = await definirUltimoContato(clientId, agora)
    if (!ok) {
      onAtualizar?.({ last_contact_at: anterior })
      setErro(msg || 'Não foi possível registrar o contato.')
    }
    setSalvando(false)
  }

  return (
    <div className="space-y-2 mb-4">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: isLight ? '#F4F4F4' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <CalendarClock size={14} color={corAtraso} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px]" style={{ color: '#666' }}>Último contato</div>
          {ultimoContato ? (
            <div className="text-xs font-medium truncate" style={{ color: corTexto }}>
              {formatarDataBR(ultimoContato)}{' '}
              <span style={{ color: corAtraso }}>· {tempoRelativo(ultimoContato)}</span>
            </div>
          ) : (
            <div className="text-xs font-medium" style={{ color: '#777' }}>Nunca contatado</div>
          )}
        </div>
        <button
          type="button"
          onClick={registrarHoje}
          disabled={salvando}
          title="Registrar contato agora"
          aria-label="Registrar contato agora"
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-yellow-500/15"
          style={{ border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37' }}
        >
          {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
        </button>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: isLight ? '#F4F4F4' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <UserCheck size={14} color={responsavel.atribuido ? '#D4AF37' : '#666'} className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px]" style={{ color: '#666' }}>Responsável</div>
          <div
            className="text-xs font-medium truncate"
            style={{ color: !responsavel.atribuido ? '#777' : responsavel.foraDaEquipe ? '#F59E0B' : corTexto }}
          >
            {responsavel.texto}
          </div>
        </div>
      </div>

      {erro && <p className="text-[10px] px-1" style={{ color: '#EF4444' }}>{erro}</p>}
    </div>
  )
}
