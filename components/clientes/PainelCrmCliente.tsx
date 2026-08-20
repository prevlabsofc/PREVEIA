'use client'

import { useState } from 'react'
import { CalendarClock, UserCheck, Check, Loader2, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import {
  corDeAtraso,
  deInputDate,
  formatarDataHoraBR,
  paraInputDate,
  tempoRelativo,
} from '@/lib/formatar-data'
import { ROTULO_SEM_RESPONSAVEL, rotuloResponsavel, type MembroEquipe } from '@/lib/equipe'
import { definirResponsavel, definirUltimoContato } from '@/lib/registrar-contato'

interface Props {
  clientId: string
  ultimoContato?: string | null
  responsavelId?: string | null
  membros: MembroEquipe[]
  nomesExtras?: Record<string, string>
  isLight?: boolean
  /** Sincroniza o estado do pai depois da escrita otimista. */
  onAtualizar: (patch: { last_contact_at?: string | null; assigned_lawyer_id?: string | null }) => void
}

const campoStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 10,
  color: '#fff',
  width: '100%',
  height: 40,
  padding: '0 12px',
  fontSize: 13,
  outline: 'none',
}

/**
 * Painel de CRM da ficha do cliente: edição manual do último contato realizado
 * e do responsável pelo atendimento. As duas escritas são otimistas e revertem
 * o estado do pai quando o banco recusa.
 */
export function PainelCrmCliente({
  clientId,
  ultimoContato,
  responsavelId,
  membros,
  nomesExtras = {},
  isLight = false,
  onAtualizar,
}: Props) {
  const [salvandoContato, setSalvandoContato] = useState(false)
  const [salvandoResponsavel, setSalvandoResponsavel] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmacao, setConfirmacao] = useState('')

  const responsavel = rotuloResponsavel(responsavelId, membros, nomesExtras)
  const corAtraso = corDeAtraso(ultimoContato)
  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const naEquipe = membros.some(m => m.id === responsavelId)

  function avisar(mensagem: string) {
    setConfirmacao(mensagem)
    setTimeout(() => setConfirmacao(''), 2500)
  }

  async function salvarContato(novoValor: string | null) {
    const anterior = ultimoContato ?? null
    setErro('')
    setSalvandoContato(true)
    onAtualizar({ last_contact_at: novoValor })

    const { ok, erro: msg } = await definirUltimoContato(clientId, novoValor)
    if (ok) avisar('Último contato atualizado.')
    else {
      onAtualizar({ last_contact_at: anterior })
      setErro(msg || 'Não foi possível salvar o último contato.')
    }
    setSalvandoContato(false)
  }

  async function salvarResponsavel(novoId: string | null) {
    const anterior = responsavelId ?? null
    setErro('')
    setSalvandoResponsavel(true)
    onAtualizar({ assigned_lawyer_id: novoId })

    const { ok, erro: msg } = await definirResponsavel(clientId, novoId)
    if (ok) avisar(novoId ? 'Responsável atualizado.' : 'Cliente ficou sem responsável.')
    else {
      onAtualizar({ assigned_lawyer_id: anterior })
      setErro(msg || 'Não foi possível salvar o responsável.')
    }
    setSalvandoResponsavel(false)
  }

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
      <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: corTexto }}>
        <UserCheck size={18} color="#D4AF37" /> Acompanhamento
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ÚLTIMO CONTATO REALIZADO */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>
            ÚLTIMO CONTATO REALIZADO
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={paraInputDate(ultimoContato)}
              disabled={salvandoContato}
              onChange={e => salvarContato(deInputDate(e.target.value))}
              style={campoStyle}
            />
            <button
              type="button"
              onClick={() => salvarContato(new Date().toISOString())}
              disabled={salvandoContato}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold transition-colors hover:bg-yellow-500/15"
              style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', height: 40 }}
            >
              {salvandoContato ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Agora
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <CalendarClock size={13} color={corAtraso} />
            {ultimoContato ? (
              <span style={{ color: '#888' }}>
                {formatarDataHoraBR(ultimoContato)} · <span style={{ color: corAtraso }}>{tempoRelativo(ultimoContato)}</span>
              </span>
            ) : (
              <span style={{ color: '#777' }}>Nunca contatado</span>
            )}
          </div>
          {ultimoContato && (
            <button
              type="button"
              onClick={() => salvarContato(null)}
              disabled={salvandoContato}
              className="mt-1.5 text-[10px] transition-colors hover:text-red-400"
              style={{ color: '#666' }}
            >
              Limpar registro
            </button>
          )}
        </div>

        {/* RESPONSÁVEL PELO ATENDIMENTO */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>
            RESPONSÁVEL PELO ATENDIMENTO
          </label>
          <select
            value={responsavelId || ''}
            disabled={salvandoResponsavel}
            onChange={e => salvarResponsavel(e.target.value || null)}
            style={{ ...campoStyle, cursor: 'pointer' }}
          >
            <option value="" style={{ background: '#111' }}>{ROTULO_SEM_RESPONSAVEL}</option>
            {membros.map(m => (
              <option key={m.id} value={m.id} style={{ background: '#111' }}>
                {m.name?.trim() || 'Membro sem nome'}
              </option>
            ))}
            {/* Responsável que saiu do escritório: mantém a opção visível para não
                trocar a atribuição sozinho ao abrir a ficha. */}
            {responsavelId && !naEquipe && (
              <option value={responsavelId} style={{ background: '#111' }}>{responsavel.texto}</option>
            )}
          </select>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <UserCheck size={13} color={responsavel.atribuido ? '#D4AF37' : '#666'} />
            <span style={{ color: responsavel.foraDaEquipe ? '#F59E0B' : '#888' }}>
              {responsavel.atribuido ? responsavel.texto : 'Nenhum membro atribuído'}
            </span>
            {salvandoResponsavel && <Loader2 size={12} className="animate-spin" color="#D4AF37" />}
          </div>
          {responsavel.foraDaEquipe && (
            <p className="text-[10px] mt-1.5" style={{ color: '#F59E0B' }}>
              Esse membro não está mais no escritório. Escolha outro responsável.
            </p>
          )}
        </div>
      </div>

      {erro && (
        <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
          <AlertCircle size={12} /> {erro}
        </p>
      )}
      {confirmacao && !erro && (
        <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: '#22C55E' }}>
          <Check size={12} /> {confirmacao}
        </p>
      )}
    </GlassCard>
  )
}
