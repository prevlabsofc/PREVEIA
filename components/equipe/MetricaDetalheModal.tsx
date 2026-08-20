'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown } from 'lucide-react'

export type MetricaTipo = 'membros' | 'peticoes' | 'clientes' | 'produtividade'

export interface MembroDetalhe {
  id: string
  name: string
  email: string
  office_role: string
  plan: string
  status: string
  created_at: string
  docs: number
  docs30d: number
  clients: number
  docs_trial_used: number
  docs_limit: number
}

interface Props {
  tipo: MetricaTipo | null
  membros: MembroDetalhe[]
  onClose: () => void
}

const CONFIG: Record<MetricaTipo, { titulo: string; subtitulo: string; cor: string }> = {
  membros: {
    titulo: 'Membros do escritório',
    subtitulo: 'Perfil, plano e consumo de cada advogado',
    cor: '#D4AF37',
  },
  peticoes: {
    titulo: 'Petições por advogado',
    subtitulo: 'Total gerado na plataforma e volume dos últimos 30 dias',
    cor: '#3B82F6',
  },
  clientes: {
    titulo: 'Clientes por advogado',
    subtitulo: 'Carteira de clientes cadastrados e petições por cliente',
    cor: '#22C55E',
  },
  produtividade: {
    titulo: 'Produtividade por advogado',
    subtitulo: 'Petições acumuladas de cada membro comparadas à média do escritório',
    cor: '#A855F7',
  },
}

function iniciais(nome: string) {
  return (nome || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function dataCurta(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

export function MetricaDetalheModal({ tipo, membros, onClose }: Props) {
  const config = tipo ? CONFIG[tipo] : null

  const totalDocs = membros.reduce((s, m) => s + m.docs, 0)
  const totalClients = membros.reduce((s, m) => s + m.clients, 0)
  const media = membros.length > 0 ? totalDocs / membros.length : 0

  const ordenados = [...membros].sort((a, b) => {
    if (tipo === 'membros') {
      if (a.office_role !== b.office_role) return a.office_role === 'owner' ? -1 : 1
      return a.name.localeCompare(b.name, 'pt-BR')
    }
    if (tipo === 'clientes') return b.clients - a.clients
    return b.docs - a.docs
  })

  // Valor destacado de cada linha + o que a barra de proporção representa.
  function valorLinha(m: MembroDetalhe): { valor: string; legenda: string; proporcao: number } {
    if (tipo === 'clientes') {
      const porCliente = m.clients > 0 ? (m.docs / m.clients).toFixed(1) : '—'
      return {
        valor: `${m.clients}`,
        legenda: m.clients > 0 ? `${porCliente} petições por cliente` : 'Nenhum cliente cadastrado',
        proporcao: totalClients > 0 ? (m.clients / totalClients) * 100 : 0,
      }
    }
    if (tipo === 'produtividade') {
      const diff = m.docs - media
      const legenda = membros.length < 2
        ? 'Único membro do escritório'
        : Math.abs(diff) < 0.5
          ? 'Na média do escritório'
          : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)} vs. média (${media.toFixed(1)})`
      return {
        valor: `${m.docs}`,
        legenda,
        proporcao: totalDocs > 0 ? (m.docs / totalDocs) * 100 : 0,
      }
    }
    if (tipo === 'peticoes') {
      return {
        valor: `${m.docs}`,
        legenda: `${m.docs30d} nos últimos 30 dias`,
        proporcao: totalDocs > 0 ? (m.docs / totalDocs) * 100 : 0,
      }
    }
    return {
      valor: `${m.docs_trial_used || 0}/${m.docs_limit || 5}`,
      legenda: `Membro desde ${dataCurta(m.created_at)}`,
      proporcao: m.docs_limit ? Math.min(((m.docs_trial_used || 0) / m.docs_limit) * 100, 100) : 0,
    }
  }

  const rodape = (() => {
    if (tipo === 'peticoes') return `${totalDocs} petições no total do escritório`
    if (tipo === 'clientes') return `${totalClients} clientes no total do escritório`
    if (tipo === 'produtividade') return `Média do escritório: ${media.toFixed(1)} petições por advogado`
    return `${membros.length} membro${membros.length !== 1 ? 's' : ''} no escritório`
  })()

  return (
    <AnimatePresence>
      {tipo && config && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl"
            style={{ background: '#0A0800', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 60px rgba(180,120,10,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="font-bold" style={{ color: '#fff' }}>{config.titulo}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#666' }}>{config.subtitulo}</p>
              </div>
              <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors" aria-label="Fechar">
                <X size={20}/>
              </button>
            </div>

            <div className="p-6 space-y-2">
              {ordenados.map(m => {
                const { valor, legenda, proporcao } = valorLinha(m)
                return (
                  <div key={m.id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}>
                        {iniciais(m.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold truncate" style={{ color: '#fff' }}>{m.name}</span>
                          {m.office_role === 'owner' && <Crown size={12} color="#D4AF37"/>}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: '#666' }}>{legenda}</div>
                      </div>
                      <div className="text-lg font-black flex-shrink-0" style={{ color: config.cor }}>{valor}</div>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(proporcao, 2)}%`, background: config.cor }}/>
                    </div>
                    {tipo === 'membros' && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#999' }}>
                          {m.office_role === 'owner' ? 'Proprietário' : 'Advogado'}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                          {m.plan?.toUpperCase() || 'TRIAL'}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: m.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: m.status === 'active' ? '#22C55E' : '#EF4444' }}>
                          {m.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </span>
                        <span className="text-[10px] ml-auto" style={{ color: '#666' }}>{m.docs} petições · {m.clients} clientes</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {ordenados.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: '#666' }}>Nenhum membro no escritório ainda.</p>
              )}
            </div>

            <div className="px-6 py-4 border-t text-xs" style={{ borderColor: 'rgba(255,255,255,0.06)', color: '#666' }}>
              {rodape}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
