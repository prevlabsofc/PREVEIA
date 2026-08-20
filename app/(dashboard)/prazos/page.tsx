'use client'
import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { Clock, Plus, Trash2, AlertTriangle, CheckCircle, Calendar, Search, UserSearch, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { ImportarPrazosDjen } from '@/components/prazos/ImportarPrazosDjen'
import {
  carregarMembrosEscritorio,
  carregarNomesForaDaEquipe,
  rotuloResponsavel,
  ROTULO_SEM_RESPONSAVEL,
  type MembroEquipe,
} from '@/lib/equipe'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TIPOS_PRAZO = [
  'Prazo para contestação', 'Prazo para recurso', 'Prazo para réplica',
  'Audiência', 'Perícia médica', 'Prazo para embargos',
  'Prazo para apelação', 'Prazo para agravo', 'Protocolo de petição',
  'Prazo para manifestação', 'Julgamento', 'Outro',
]

interface Prazo {
  id: string; titulo: string; tipo: string; data_prazo: string
  processo: string; cliente: string; prioridade: string
  concluido: boolean; created_at: string; lawyer_id?: string
  assigned_lawyer_id?: string | null
  origem?: string | null
  observacao?: string | null
}

const ROTULO_TODOS_RESPONSAVEIS = 'todos'
const ROTULO_FILTRO_SEM_RESPONSAVEL = 'sem_responsavel'

export default function PrazosPage() {
  const [isLight, setIsLight] = useState(false)
  const [prazos, setPrazos] = useState<Prazo[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showBusca, setShowBusca] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'urgentes' | 'concluidos'>('pendentes')
  const [membros, setMembros] = useState<MembroEquipe[]>([])
  const [nomesExtras, setNomesExtras] = useState<Record<string, string>>({})
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>(ROTULO_TODOS_RESPONSAVEIS)
  const [salvandoResponsavelId, setSalvandoResponsavelId] = useState<string | null>(null)
  const [erroResponsavelId, setErroResponsavelId] = useState<string | null>(null)
  const [form, setForm] = useState({
    titulo: '', tipo: '', data_prazo: '', processo: '',
    cliente: '', prioridade: 'normal',
  })

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const time = await carregarMembrosEscritorio(supabase, user.id)
      setMembros(time)
      const memberIds = time.map((m) => m.id)
      const [{ data: p }, { data: cli }] = await Promise.all([
        supabase.from('prazos').select('*').in('lawyer_id', memberIds).order('data_prazo', { ascending: true }),
        supabase.from('clients').select('id, name').in('lawyer_id', memberIds).order('name'),
      ])
      const listaPrazos = (p as Prazo[]) || []
      setPrazos(listaPrazos)
      setClientes(cli || [])

      // Responsáveis que já não fazem mais parte da equipe atual, mas ainda
      // constam em prazos antigos — sem isso a ficha mostraria um id solto.
      const idsForaDaEquipe = listaPrazos
        .map((pr) => pr.assigned_lawyer_id)
        .filter((id): id is string => Boolean(id) && !time.some((m) => m.id === id))
      if (idsForaDaEquipe.length > 0) {
        setNomesExtras(await carregarNomesForaDaEquipe(supabase, idsForaDaEquipe))
      }
    }
    load()
  }, [])

  function handleImportado(novos: Prazo[]) {
    setPrazos(prev => {
      const idsAtuais = new Set(prev.map(p => p.id))
      const semDuplicar = novos.filter(n => !idsAtuais.has(n.id))
      return [...prev, ...semDuplicar].sort((a, b) => a.data_prazo.localeCompare(b.data_prazo))
    })
  }

  async function atribuirResponsavel(id: string, novoId: string | null) {
    const anterior = prazos.find(p => p.id === id)?.assigned_lawyer_id ?? null
    setErroResponsavelId(null)
    setSalvandoResponsavelId(id)
    setPrazos(prev => prev.map(p => p.id === id ? { ...p, assigned_lawyer_id: novoId } : p))
    const { error } = await supabase.from('prazos').update({ assigned_lawyer_id: novoId }).eq('id', id)
    if (error) {
      setPrazos(prev => prev.map(p => p.id === id ? { ...p, assigned_lawyer_id: anterior } : p))
      setErroResponsavelId(id)
    }
    setSalvandoResponsavelId(null)
  }

  function diasRestantes(data: string) {
    const hoje = new Date(); hoje.setHours(0,0,0,0)
    const prazo = new Date(data + 'T00:00:00')
    return Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  }

  function statusPrazo(p: Prazo) {
    if (p.concluido) return { label: 'Concluído', color: '#22C55E', icon: CheckCircle }
    const dias = diasRestantes(p.data_prazo)
    if (dias < 0) return { label: 'Vencido', color: '#EF4444', icon: AlertTriangle }
    if (dias <= 3) return { label: `${dias}d — URGENTE`, color: '#EF4444', icon: AlertTriangle }
    if (dias <= 7) return { label: `${dias}d — Atenção`, color: '#F59E0B', icon: Clock }
    return { label: `${dias} dias`, color: '#22C55E', icon: Clock }
  }

  async function salvarPrazo() {
    if (!form.titulo || !form.data_prazo) return
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('prazos').insert({
      lawyer_id: user.id, ...form, concluido: false,
    }).select().single()
    if (data) setPrazos(prev => [...prev, data as Prazo].sort((a, b) => a.data_prazo.localeCompare(b.data_prazo)))
    setForm({ titulo: '', tipo: '', data_prazo: '', processo: '', cliente: '', prioridade: 'normal' })
    setShowForm(false)
    setSalvando(false)
  }

  async function toggleConcluido(id: string, atual: boolean) {
    await supabase.from('prazos').update({ concluido: !atual }).eq('id', id)
    setPrazos(prev => prev.map(p => p.id === id ? { ...p, concluido: !atual } : p))
  }

  async function excluir(id: string) {
    await supabase.from('prazos').delete().eq('id', id)
    setPrazos(prev => prev.filter(p => p.id !== id))
  }

  const prazosFiltrados = prazos.filter(p => {
    if (filtro === 'concluidos' && !p.concluido) return false
    if (filtro === 'pendentes' && p.concluido) return false
    if (filtro === 'urgentes' && (p.concluido || diasRestantes(p.data_prazo) > 7)) return false
    if (filtroResponsavel === ROTULO_FILTRO_SEM_RESPONSAVEL) return !p.assigned_lawyer_id
    if (filtroResponsavel !== ROTULO_TODOS_RESPONSAVEIS) return p.assigned_lawyer_id === filtroResponsavel
    return true
  })

  const urgentes = prazos.filter(p => !p.concluido && diasRestantes(p.data_prazo) <= 3).length
  const pendentes = prazos.filter(p => !p.concluido).length
  const inputCls = "input-glass w-full px-4 text-sm"
  // Mantém visível o responsável que já não está mais na equipe, senão o
  // <select> trocaria a atribuição sozinho ao abrir a tela (mesmo cuidado de
  // PainelCrmCliente para o "Responsável pelo Atendimento" do cliente).
  const responsaveisParaFiltro = useMemo(() => {
    const idsNaLista = new Set(prazos.map(p => p.assigned_lawyer_id).filter(Boolean) as string[])
    const foraDaEquipe = Array.from(idsNaLista).filter(id => !membros.some(m => m.id === id))
    return { membros, foraDaEquipe }
  }, [prazos, membros])

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
              <Calendar size={28} color="#D4AF37"/>
              <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Controle de </span>
              <span className="text-gradient-gold">Prazos</span>
            </h1>
            <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Gerencie prazos processuais e receba alertas de vencimento</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBusca(v => !v)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: showBusca ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: '#3B82F6',
                border: '1px solid rgba(59,130,246,0.35)',
              }}
            >
              <UserSearch size={16}/> Buscar por OAB/CPF
            </button>
            <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-2 px-5 py-3 rounded-xl text-sm">
              <Plus size={16}/> Novo Prazo
            </button>
          </div>
        </div>
      </motion.div>

      {/* BUSCA AUTOMÁTICA (DJEN/CNJ) */}
      {showBusca && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <GlassCard intensity={0.3} style={{ padding: 20 }}>
            <ImportarPrazosDjen isLight={isLight} onImportado={handleImportado} />
          </GlassCard>
        </motion.div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: prazos.length, color: '#D4AF37' },
          { label: 'Pendentes', value: pendentes, color: '#3B82F6' },
          { label: 'Urgentes (≤3d)', value: urgentes, color: '#EF4444' },
          { label: 'Concluídos', value: prazos.filter(p => p.concluido).length, color: '#22C55E' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} intensity={0.8} style={{ padding: 18 }}>
            <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'pendentes', label: 'Pendentes' },
            { id: 'urgentes', label: '🚨 Urgentes' },
            { id: 'todos', label: 'Todos' },
            { id: 'concluidos', label: '✅ Concluídos' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setFiltro(id as any)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: filtro === id ? 'rgba(212,175,55,0.15)' : 'transparent', color: filtro === id ? '#D4AF37' : '#888', border: filtro === id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
              {label}
            </button>
          ))}
        </div>
        {membros.length > 1 && (
          <select
            value={filtroResponsavel}
            onChange={e => setFiltroResponsavel(e.target.value)}
            className="input-glass px-3 text-xs"
            style={{ height: 34, maxWidth: 220 }}
          >
            <option value={ROTULO_TODOS_RESPONSAVEIS} style={{ background: '#111' }}>Todos os responsáveis</option>
            <option value={ROTULO_FILTRO_SEM_RESPONSAVEL} style={{ background: '#111' }}>{ROTULO_SEM_RESPONSAVEL}</option>
            {responsaveisParaFiltro.membros.map(m => (
              <option key={m.id} value={m.id} style={{ background: '#111' }}>{m.name?.trim() || 'Membro sem nome'}</option>
            ))}
            {responsaveisParaFiltro.foraDaEquipe.map(id => (
              <option key={id} value={id} style={{ background: '#111' }}>
                {rotuloResponsavel(id, membros, nomesExtras).texto}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* LISTA */}
      <div className="space-y-2">
        {prazosFiltrados.length === 0 && (
          <GlassCard intensity={0.2} style={{ padding: 32 }}>
            <div className="text-center">
              <Calendar size={36} color="#333" className="mx-auto mb-3"/>
              <p className="text-sm text-gray-500">Nenhum prazo encontrado</p>
              <button onClick={() => setShowForm(true)} className="btn-gold mt-3 px-4 py-2 rounded-xl text-sm">Adicionar prazo</button>
            </div>
          </GlassCard>
        )}
        {prazosFiltrados.map(p => {
          const status = statusPrazo(p)
          const Icon = status.icon
          return (
            <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <GlassCard intensity={0.5} style={{ padding: 18 }}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleConcluido(p.id, p.concluido)}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: p.concluido ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${p.concluido ? '#22C55E' : 'rgba(255,255,255,0.1)'}` }}>
                    {p.concluido && <CheckCircle size={14} color="#22C55E"/>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff', textDecoration: p.concluido ? 'line-through' : 'none', opacity: p.concluido ? 0.5 : 1 }}>
                        {p.titulo}
                      </span>
                      {p.tipo && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>{p.tipo}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      {p.cliente && <span>👤 {p.cliente}</span>}
                      {p.processo && <span>📁 {p.processo}</span>}
                      <span>📅 {new Date(p.data_prazo + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      {p.origem === 'djen' && (
                        <span className="flex items-center gap-1" style={{ color: '#3B82F6' }}><Search size={9}/> DJEN</span>
                      )}
                    </div>
                    {p.observacao && (
                      <p className="text-[10px] mt-1 truncate" style={{ color: '#666' }} title={p.observacao}>{p.observacao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex flex-col items-end gap-0.5">
                      <select
                        value={p.assigned_lawyer_id || ''}
                        disabled={salvandoResponsavelId === p.id}
                        onChange={e => atribuirResponsavel(p.id, e.target.value || null)}
                        className="text-[10px] font-medium rounded-lg px-2 cursor-pointer"
                        style={{
                          height: 26,
                          background: isLight ? '#F3F3F3' : 'rgba(255,255,255,0.04)',
                          color: p.assigned_lawyer_id ? (isLight ? '#1E1E1E' : '#ccc') : '#777',
                          border: '1px solid rgba(255,255,255,0.1)',
                          maxWidth: 140,
                        }}
                      >
                        <option value="" style={{ background: '#111' }}>{ROTULO_SEM_RESPONSAVEL}</option>
                        {membros.map(m => (
                          <option key={m.id} value={m.id} style={{ background: '#111' }}>{m.name?.trim() || 'Membro sem nome'}</option>
                        ))}
                        {p.assigned_lawyer_id && !membros.some(m => m.id === p.assigned_lawyer_id) && (
                          <option value={p.assigned_lawyer_id} style={{ background: '#111' }}>
                            {rotuloResponsavel(p.assigned_lawyer_id, membros, nomesExtras).texto}
                          </option>
                        )}
                      </select>
                      {salvandoResponsavelId === p.id && <span className="text-[9px] flex items-center gap-1" style={{ color: '#888' }}><Loader2 size={9} className="animate-spin"/> salvando...</span>}
                      {erroResponsavelId === p.id && <span className="text-[9px]" style={{ color: '#EF4444' }}>Falha ao salvar</span>}
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: `${status.color}18`, border: `1px solid ${status.color}33` }}>
                      <Icon size={12} color={status.color}/>
                      <span className="text-[10px] font-bold" style={{ color: status.color }}>{status.label}</span>
                    </div>
                    <button onClick={() => excluir(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all" style={{ color: '#EF4444' }}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* MODAL NOVO PRAZO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Novo Prazo</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Prazo para contestação" className={inputCls} style={{ height: 44 }} spellCheck={true} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inputCls} style={{ height: 44 }}>
                    <option value="" style={{ background: '#111' }}>Selecionar...</option>
                    {TIPOS_PRAZO.map(t => <option key={t} value={t} style={{ background: '#111' }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Data do prazo *</label>
                  <input type="date" value={form.data_prazo} onChange={e => setForm(f => ({ ...f, data_prazo: e.target.value }))}
                    className={inputCls} style={{ height: 44 }}/>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Número do processo</label>
                <input value={form.processo} onChange={e => setForm(f => ({ ...f, processo: e.target.value }))}
                  placeholder="Ex: 0000000-00.0000.4.01.0000" className={inputCls} style={{ height: 44 }} spellCheck={true} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <select value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} className={inputCls} style={{ height: 44 }}>
                  <option value="" style={{ background: '#111' }}>Selecionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.name} style={{ background: '#111' }}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prioridade</label>
                <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} className={inputCls} style={{ height: 44 }}>
                  <option value="baixa" style={{ background: '#111' }}>Baixa</option>
                  <option value="normal" style={{ background: '#111' }}>Normal</option>
                  <option value="alta" style={{ background: '#111' }}>Alta</option>
                  <option value="urgente" style={{ background: '#111' }}>Urgente</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={salvarPrazo} disabled={salvando || !form.titulo || !form.data_prazo}
                  className="btn-gold flex-1 py-2.5 rounded-xl text-sm font-bold">
                  {salvando ? 'Salvando...' : 'Salvar Prazo'}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}