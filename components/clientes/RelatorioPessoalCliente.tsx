'use client'

import { useEffect, useState } from 'react'
import { Info, RefreshCw, UserRound } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import {
  montarRelatorioPessoal,
  type DadosRelatorioPessoal,
  type DocParaRelatorio,
} from '@/lib/relatorio-pessoal-cliente'

interface Props {
  cliente: DadosRelatorioPessoal
  documentos?: DocParaRelatorio[]
  isLight?: boolean
}

/**
 * Relatório em leitura corrida a partir do cadastro e do histórico.
 * Só para o advogado — NÃO entra na petição gerada pela IA.
 */
export function RelatorioPessoalCliente({
  cliente,
  documentos = [],
  isLight = false,
}: Props) {
  const [texto, setTexto] = useState(() => montarRelatorioPessoal(cliente, documentos))
  const [gerando, setGerando] = useState(false)

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'

  const chaveDados = [
    cliente.name,
    cliente.sexo,
    cliente.birth_date,
    cliente.data_nascimento,
    cliente.estado_civil,
    cliente.profession,
    cliente.zone,
    cliente.city,
    cliente.state,
    cliente.rua,
    cliente.numero,
    cliente.bairro,
    cliente.address,
    cliente.cpf_crianca,
    cliente.phone,
    cliente.whatsapp,
    cliente.email,
    cliente.notes,
    cliente.tipo_beneficio,
    documentos.length,
    documentos.map((d) => `${d.id || d.title}|${d.agent_type}|${d.created_at}`).join(','),
  ].join('|')

  useEffect(() => {
    setTexto(montarRelatorioPessoal(cliente, documentos))
    // Recalcula quando cadastro ou documentos relevantes mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDados])

  function regenerar() {
    setGerando(true)
    const novo = montarRelatorioPessoal(cliente, documentos)
    setTexto(novo)
    setTimeout(() => setGerando(false), 280)
  }

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <h3 className="font-bold flex items-center gap-2" style={{ color: corTexto }}>
          <UserRound size={18} color="#D4AF37" /> Relatório pessoal do cliente
        </h3>
        <button
          type="button"
          onClick={regenerar}
          disabled={gerando}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-yellow-500/15 disabled:opacity-60"
          style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
        >
          <RefreshCw size={13} className={gerando ? 'animate-spin' : ''} />
          Regenerar resumo
        </button>
      </div>
      <p className="text-xs mb-4 flex items-start gap-1.5" style={{ color: corMuted }}>
        <Info size={12} className="flex-shrink-0 mt-0.5" color="#D4AF37" />
        <span>
          Resumo a partir do cadastro e da história do caso — contexto para o advogado.{' '}
          <strong style={{ color: isLight ? '#8B6914' : '#D4AF37' }}>Não entra na petição</strong>{' '}
          gerada pela IA.
        </span>
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: corTexto, lineHeight: 1.65 }}
      >
        {texto}
      </p>
    </GlassCard>
  )
}
