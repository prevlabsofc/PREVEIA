'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import {
  FileText,
  Users,
  Bot,
  Target,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  Brain,
  MoreVertical,
  Headphones,
  BookOpen as BookOpenIcon,
  Trash2,
  Bell,
} from 'lucide-react'
import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { SupportChat } from '@/components/SupportChat'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Lawyer {
  id?: string
  name: string
  plan: string
  docs_limit: number
  docs_trial_used: number
  office_id?: string | null
}
interface Doc {
  id: string
  title?: string
  type?: string
  client_name?: string
  lawyer_id?: string
  created_at: string
}
interface Membro {
  id: string
  name: string
}
interface Notificacao {
  id: string
  title: string
  type?: string
  created_at: string
}

export default function Dashboard() {
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [teamDocs, setTeamDocs] = useState<Doc[]>([])
  const [teamClients, setTeamClients] = useState<{ id: string; lawyer_id: string }[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [membroFiltro, setMembroFiltro] = useState<string>('todos')
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'ano'>('semana')
  const [openSupport, setOpenSupport] = useState(false)
  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (openSupport) {
      const t = setTimeout(() => setOpenSupport(false), 500)
      return () => clearTimeout(t)
    }
  }, [openSupport])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: l } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setLawyer(l as Lawyer)

      let memberIds = [user.id]
      if (l?.office_id) {
        const { data: team } = await supabase
          .from('lawyers')
          .select('id, name')
          .eq('office_id', l.office_id)
          .order('name')
        if (team && team.length > 0) {
          setMembros(team as Membro[])
          memberIds = (team as Membro[]).map(m => m.id)
        }
      }

      const [{ data: d }, { data: c }, { data: n }] = await Promise.all([
        supabase.from('documents').select('*').in('lawyer_id', memberIds).order('created_at', { ascending: false }),
        supabase.from('clients').select('id, lawyer_id').in('lawyer_id', memberIds),
        supabase.from('notifications').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false }).limit(6),
      ])

      setTeamDocs((d as Doc[]) || [])
      setTeamClients((c as { id: string; lawyer_id: string }[]) || [])
      setNotificacoes((n as Notificacao[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function apagarNotificacao(id: string) {
    setNotificacoes(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const allDocs = membroFiltro === 'todos'
    ? teamDocs
    : teamDocs.filter(d => d.lawyer_id === membroFiltro)

  const clientCount = membroFiltro === 'todos'
    ? teamClients.length
    : teamClients.filter(c => c.lawyer_id === membroFiltro).length

  const docs = allDocs.slice(0, 5)

  const hoje = new Date()
  const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  const chartData = periodo === 'semana'
    ? Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(hoje)
        d.setDate(hoje.getDate() - (6 - i))
        return {
          dia: diasSemana[d.getDay()],
          docs: allDocs.filter(doc => new Date(doc.created_at).toDateString() === d.toDateString()).length
        }
      })
    : periodo === 'mes'
    ? Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(hoje)
        d.setDate(hoje.getDate() - (29 - i))
        return {
          dia: `${d.getDate()}/${d.getMonth()+1}`,
          docs: allDocs.filter(doc => new Date(doc.created_at).toDateString() === d.toDateString()).length
        }
      })
    : Array.from({ length: 12 }).map((_, i) => {
        return {
          dia: meses[i],
          docs: allDocs.filter(doc => {
            const d = new Date(doc.created_at)
            return d.getFullYear() === hoje.getFullYear() && d.getMonth() === i
          }).length
        }
      })

  if (loading)
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
        />
      </div>
    )

  const docsUsed = lawyer?.docs_trial_used || 0
  const docsLimit = lawyer?.docs_limit || 5
  const firstName = lawyer?.name?.split(' ')[0] || 'Doutor'

  const totalDocs = allDocs.length
  const tempoEconomizado = Math.round(totalDocs * 1.5)

  const stats = [
    { icon: FileText, label: 'Peças Geradas', value: totalDocs, growth: totalDocs > 0 ? `${totalDocs} no total` : 'Comece agora', color: '#D4AF37' },
    { icon: Users, label: 'Clientes Ativos', value: clientCount, growth: clientCount > 0 ? `${clientCount} cadastrados` : 'Nenhum ainda', color: '#3B82F6' },
    { icon: Bot, label: 'Agentes IA Ativos', value: '200+', growth: '✓ Atualizados', color: '#A855F7' },
    { icon: Target, label: 'Precisão Jurídica', value: '99%', growth: '✓ Zero erros', color: '#22C55E' },
    { icon: Clock, label: 'Tempo Economizado', value: `${tempoEconomizado}h`, growth: totalDocs > 0 ? 'Baseado no uso' : 'Comece agora', color: '#F59E0B' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto pb-6">
      {/* HERO */}
      <div
        className="relative mb-6 rounded-3xl overflow-hidden"
        style={{
          background: isLight ? '#FFFFFF' : '#0A0A0A',
          border: isLight ? '1px solid rgba(212,175,55,0.18)' : '1px solid rgba(212,175,55,0.12)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: isLight
              ? 'linear-gradient(to right, rgba(212,175,55,0.22), rgba(255,255,255,1))'
              : 'linear-gradient(to right, rgba(0,0,0,0.90), rgba(0,0,0,0.35))',
          }}
        />

        <div className="relative">
          <div className="flex flex-col lg:flex-row">
            <div className="p-6 sm:p-8 lg:p-10 lg:w-1/2">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <h1
                  className="text-3xl md:text-4xl font-black"
                  style={{ color: isLight ? '#1E1E1E' : '#fff' }}
                >
                  Olá, Dr. {firstName} 👋
                </h1>
              </motion.div>

              <GlassCard gold intensity={0.6} style={{ padding: 22, height: '100%' }}>
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}
                  >
                    <Brain size={22} color="#D4AF37" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-lg">IA Previdenciária</h3>
                    <p className="text-[10px] mt-1 text-gray-400">
                      Assistente para geração e orientação de peças com IA.
                    </p>
                  </div>
                </div>

                <Link
                  href="/agentes"
                  className="mt-5 inline-flex items-center justify-center gap-2 text-[11px] px-4 py-2 rounded-lg font-bold"
                  style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
                >
                  Acessar IA Previdenciária <ArrowRight size={14} />
                </Link>
              </GlassCard>
            </div>

            <div className="lg:w-1/2 relative min-h-[240px]">
              <img
                src="/hero-bg.png"
                alt="Hero"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: isLight ? 0.9 : 0.7 }}
              />
            </div>
          </div>

          {/* Ações Rápidas (desktop) */}
          <div className="hidden lg:block absolute top-5 right-5 w-[320px]">
            <GlassCard intensity={0.4} style={{ padding: 16 }}>
              <h3 className="font-bold text-white mb-3 text-sm">Ações Rápidas</h3>
              <div className="space-y-2">
                {[
                  { href: '/agentes', icon: Plus, label: 'Novo Documento Rápido' },
                  { href: '/agentes', icon: FileText, label: 'Petição Inicial' },
                  { href: '/jurisprudencia', icon: BookOpenIcon, label: 'Consultar Jurisprudência' },
                  { href: '/analise-previdenciaria', icon: Brain, label: 'Análise Previdenciária' },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-white/5 group"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                      style={{ background: 'rgba(212,175,55,0.12)' }}
                    >
                      <Icon size={15} color="#D4AF37" />
                    </div>
                    <span className="text-xs font-medium text-white flex-1">{label}</span>
                    <ArrowRight
                      size={13}
                      color="#555"
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => setOpenSupport(true)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-xl transition-all duration-200 hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                    style={{ background: 'rgba(212,175,55,0.12)' }}
                  >
                    <Headphones size={15} color="#D4AF37" />
                  </div>
                  <span className="text-xs font-medium text-white flex-1">Fale com o suporte</span>
                  <ArrowRight
                    size={13}
                    color="#555"
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Ações Rápidas (mobile) */}
          <div className="lg:hidden relative mt-5 px-4 pb-6">
            <GlassCard intensity={0.4} style={{ padding: 16 }}>
              <h3 className="font-bold text-white mb-3 text-sm">Ações Rápidas</h3>
              <div className="space-y-2">
                {[
                  { href: '/agentes', icon: Plus, label: 'Novo Documento Rápido' },
                  { href: '/agentes', icon: FileText, label: 'Petição Inicial' },
                  { href: '/jurisprudencia', icon: BookOpenIcon, label: 'Consultar Jurisprudência' },
                  { href: '/analise-previdenciaria', icon: Brain, label: 'Análise Previdenciária' },
                ].map(({ href, icon: Icon, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-white/5 group"
                    style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                      style={{ background: 'rgba(212,175,55,0.12)' }}
                    >
                      <Icon size={15} color="#D4AF37" />
                    </div>
                    <span className="text-xs font-medium text-white flex-1">{label}</span>
                    <ArrowRight
                      size={13}
                      color="#555"
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => setOpenSupport(true)}
                  className="flex items-center gap-3 w-full p-2.5 rounded-xl transition-all duration-200 hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                    style={{ background: 'rgba(212,175,55,0.12)' }}
                  >
                    <Headphones size={15} color="#D4AF37" />
                  </div>
                  <span className="text-xs font-medium text-white flex-1">Fale com o suporte</span>
                  <ArrowRight
                    size={13}
                    color="#555"
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* LINHA DE STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => {
          const label = s.label === 'Precisão Jurídica' ? 'Precisão' : s.label === 'Tempo Economizado' ? 'Tempo' : s.label
          return (
            <div key={s.label} className="text-center sm:text-left">
              <div className="text-lg font-black" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                {s.value}
              </div>
              <div
                className="text-[10px] font-bold tracking-widest mt-1"
                style={{ color: isLight ? '#666' : '#9ca3af' }}
              >
                {label}
              </div>
            </div>
          )
        })}
      </div>

      {/* PRODUTIVIDADE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <GlassCard intensity={0.3} style={{ padding: 24, height: '100%' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Gráfico de Produtividade Semanal</h3>
            <div className="flex items-center gap-1" role="tablist" aria-label="Período">
              {(['semana', 'mes', 'ano'] as const).map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={periodo === p}
                  onClick={() => setPeriodo(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    background: periodo === p ? 'rgba(212,175,55,0.15)' : 'transparent',
                    color: periodo === p ? '#D4AF37' : '#666',
                    border: periodo === p ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                  }}
                >
                  {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="dia"
                stroke="#555"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(20,18,10,0.95)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: 12,
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="docs"
                stroke="#D4AF37"
                strokeWidth={3}
                dot={{ fill: '#D4AF37', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </motion.div>

      {/* PLANO + NOTIFICAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard gold intensity={0.5} style={{ padding: 20, height: '100%' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} color="#D4AF37" />
                <h3 className="font-bold text-white text-sm">Plano Atual</h3>
              </div>
              <span
                className="text-[8px] px-2 py-0.5 rounded-full font-bold capitalize"
                style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37' }}
              >
                {lawyer?.plan}
              </span>
            </div>
            <div className="font-bold text-white mb-0.5">Plano Profissional</div>
            <p className="text-[10px] text-gray-400 mb-3">Acesso completo a todos os recursos</p>
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="text-gray-400">Uso de documentos</span>
              <span className="text-white font-bold">
                {docsUsed} / {docsLimit}
              </span>
            </div>
            <div className="w-full h-2 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((docsUsed / docsLimit) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Renova em 25 dias</span>
              <Link
                href="/assinatura"
                className="text-[10px] px-3 py-1.5 rounded-lg font-bold"
                style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
              >
                Gerenciar Plano
              </Link>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard intensity={0.4} style={{ padding: 20, height: '100%' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Bell size={14} color="#D4AF37" /> Notificações
              </h3>
              {notificacoes.length > 0 && (
                <span className="text-[10px]" style={{ color: '#666' }}>
                  {notificacoes.length}
                </span>
              )}
            </div>

            <div className="space-y-2" style={{ maxHeight: 280, overflow: 'auto', paddingRight: 4 }}>
              {notificacoes.length === 0 ? (
                <div className="text-center py-6 text-xs" style={{ color: '#666' }}>
                  Nenhuma notificação
                </div>
              ) : (
                notificacoes.map((n) => {
                  const cor = n.type === 'success' ? '#22C55E' : n.type === 'warning' ? '#EF4444' : '#D4AF37'
                  return (
                    <div
                      key={n.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg transition-colors group hover:bg-[rgba(212,175,55,0.05)]"
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
                      <span className="text-xs text-gray-300 flex-1 truncate">{n.title}</span>
                      <span className="text-[9px] text-gray-600 flex-shrink-0">
                        {new Date(n.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <button
                        type="button"
                        onClick={() => apagarNotificacao(n.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded"
                        style={{ color: '#EF4444' }}
                        aria-label="Excluir notificação"
                        title="Excluir notificação"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* DOCUMENTOS RECENTES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4"
      >
        <GlassCard intensity={0.3} style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Documentos Recentes</h3>
            <Link
              href="/documentos"
              className="text-xs flex items-center gap-1"
              style={{ color: '#D4AF37' }}
            >
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          {docs.length === 0 ? (
            <div className="space-y-2">
              {[
                {
                  t: 'Petição Inicial - Salário Maternidade Rural',
                  c: 'Maria do Socorro Silva Costa',
                  d: '25/02/2026',
                },
                {
                  t: 'Requerimento - Aposentadoria por Idade',
                  c: 'João Pereira da Silva',
                  d: '24/02/2026',
                },
                {
                  t: 'Apelação - Benefício por Incapacidade',
                  c: 'Antônia Clara dos Santos',
                  d: '23/02/2026',
                },
              ].map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.12)' }}
                  >
                    <FileText size={15} color="#D4AF37" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{doc.t}</div>
                    <div className="text-[11px] text-gray-500">{doc.c}</div>
                  </div>
                  <span className="text-[11px] text-gray-500">{doc.d}</span>
                  <MoreVertical size={14} color="#555" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((d, i) => (
                <div
                  key={d.id || i}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.12)' }}
                  >
                    <FileText size={15} color="#D4AF37" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {d.title || d.type || 'Petição'}
                    </div>
                    <div className="text-[11px] text-gray-500">{d.client_name || 'Cliente'}</div>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {new Date(d.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <MoreVertical size={14} color="#555" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* RODAPÉ */}
      <div
        className="text-center mt-6 flex items-center justify-center gap-2 text-[11px]"
        style={{ color: '#555' }}
      >
        <span className="text-gradient-gold font-bold">MARPLE</span> · Inteligência Jurídica
        que transforma resultados. · 🔒 Segurança de nível bancário
      </div>
      <SupportChat defaultOpen={openSupport} />
    </div>
  )
}
