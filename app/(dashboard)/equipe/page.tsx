'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { Users, Copy, Plus, Check, Crown, Link2, FileText, UserCheck, TrendingUp, ShieldCheck, ChevronRight } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { MetricaDetalheModal, type MetricaTipo } from '@/components/equipe/MetricaDetalheModal'
import { EntrarEscritorioCard } from '@/components/equipe/EntrarEscritorioCard'
import { EspacoIndividual } from '@/components/equipe/EspacoIndividual'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Member {
  id: string; name: string; email: string; oab_number: string; oab_uf: string
  office_role: string; plan: string; docs_trial_used: number; docs_limit: number
  created_at: string; status: string
}
interface Stats { [key: string]: { docs: number; docs30d: number; clients: number } }

export default function EquipePage() {
  const [me, setMe] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [isLight, setIsLight] = useState(false)
  const [metricaAberta, setMetricaAberta] = useState<MetricaTipo | null>(null)

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
      const { data: meData } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setMe(meData)
      if (meData?.office_id) {
        const { data: team } = await supabase.from('lawyers').select('*').eq('office_id', meData.office_id)
        const memberList = (team as Member[]) || []
        setMembers(memberList)
        const statsMap: Stats = {}
        memberList.forEach(m => { statsMap[m.id] = { docs: 0, docs30d: 0, clients: 0 } })
        const memberIds = memberList.map(m => m.id)
        if (memberIds.length > 0) {
          const limite30d = Date.now() - 30 * 24 * 60 * 60 * 1000
          const [{ data: docRows }, { data: clientRows }] = await Promise.all([
            supabase.from('documents').select('lawyer_id, created_at').in('lawyer_id', memberIds),
            supabase.from('clients').select('lawyer_id').in('lawyer_id', memberIds),
          ])
          for (const row of (docRows as { lawyer_id: string; created_at: string }[]) || []) {
            const s = statsMap[row.lawyer_id]
            if (!s) continue
            s.docs += 1
            if (new Date(row.created_at).getTime() >= limite30d) s.docs30d += 1
          }
          for (const row of (clientRows as { lawyer_id: string }[]) || []) {
            if (statsMap[row.lawyer_id]) statsMap[row.lawyer_id].clients += 1
          }
        }
        setStats(statsMap)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function gerarConvite() {
    if (!me?.office_id) return
    setGenerating(true)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const { error } = await supabase.from('office_invites').insert({ office_id: me.office_id, code, created_by: me.id })
    if (!error) setInviteCode(code)
    setGenerating(false)
  }

  function copiarLink() {
    const link = `${window.location.origin}/registro?convite=${inviteCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  const isOwner = me?.office_role === 'owner'
  const semEscritorio = !me?.office_id
  const totalDocs = Object.values(stats).reduce((s, v) => s + v.docs, 0)
  const totalClients = Object.values(stats).reduce((s, v) => s + v.clients, 0)
  const planColors: Record<string, string> = { trial: '#EAB308', starter: '#888', plus: '#3B82F6', premium: '#D4AF37', enterprise: '#A855F7' }

  // Média acumulada de petições geradas por advogado — não é um recorte mensal.
  const produtividadeMedia = members.length > 0 ? Math.round(totalDocs / members.length) : 0

  const membrosDetalhe = members.map(m => ({
    ...m,
    docs: stats[m.id]?.docs || 0,
    docs30d: stats[m.id]?.docs30d || 0,
    clients: stats[m.id]?.clients || 0,
  }))

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
          Gestão de <span className="text-gradient-gold">Equipe</span>
        </h1>
        <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Gerencie os advogados do seu escritório e acompanhe as estatísticas</p>
      </motion.div>

      {/* ENTRAR EM ESCRITÓRIO — só sem office_id */}
      {semEscritorio && <EntrarEscritorioCard isLight={isLight} />}

      {/* Tela normal de equipe — só com office_id */}
      {!semEscritorio && (
        <>
          {/* STATS DO ESCRITÓRIO */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {([
              { icon: Users, label: 'Membros', value: members.length, color: '#D4AF37', tipo: 'membros' as MetricaTipo },
              { icon: FileText, label: 'Total de Petições', value: totalDocs, color: '#3B82F6', tipo: 'peticoes' as MetricaTipo },
              { icon: UserCheck, label: 'Total de Clientes', value: totalClients, color: '#22C55E', tipo: 'clientes' as MetricaTipo },
              { icon: TrendingUp, label: 'Produtividade Média', value: produtividadeMedia, color: '#A855F7', tipo: 'produtividade' as MetricaTipo, unidade: 'petições/advogado', nota: 'Média acumulada desde o cadastro' },
            ]).map(({ icon: Icon, label, value, color, tipo, unidade, nota }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                role="button"
                tabIndex={0}
                aria-label={`${label}: ver detalhamento por advogado`}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMetricaAberta(tipo) } }}
              >
                <GlassCard intensity={1.2} style={{ padding: 18, cursor: 'pointer' }} onClick={() => setMetricaAberta(tipo)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <div className="text-2xl font-black" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{value}</div>
                      {unidade && <span className="text-[11px] font-semibold truncate" style={{ color }}>{unidade}</span>}
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}33` }}>
                      <Icon size={18} color={color}/>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>
                    {label}
                    <ChevronRight size={12} style={{ opacity: 0.6 }}/>
                  </div>
                  {nota && <div className="text-[10px] mt-0.5" style={{ color: isLight ? '#8A8A8A' : '#666' }}>{nota}</div>}
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* CONVITE */}
          {isOwner && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <GlassCard gold intensity={0.5} style={{ padding: 24 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 size={18} color="#D4AF37"/>
                  <h3 className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Convidar Advogado</h3>
                </div>
                <p className="text-sm mb-4" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Gere um link de convite para adicionar advogados ao seu escritório.</p>
                {!inviteCode ? (
                  <button onClick={gerarConvite} disabled={generating} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
                    <Plus size={16}/> {generating ? 'Gerando...' : 'Gerar Link de Convite'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 rounded-xl text-sm font-mono truncate" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
                      {`${typeof window !== 'undefined' ? window.location.origin : ''}/registro?convite=${inviteCode}`}
                    </div>
                    <button onClick={copiarLink} className="btn-gold flex items-center gap-2 px-4 py-3 rounded-xl text-sm">
                      {copied ? <><Check size={16}/> Copiado!</> : <><Copy size={16}/> Copiar</>}
                    </button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* MEMBROS COM STATS */}
          <GlassCard intensity={0.3} style={{ padding: 24 }}>
            <div className="flex items-center gap-2 mb-5">
              <Users size={18} color="#D4AF37"/>
              <h3 className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Membros do Escritório ({members.length})</h3>
            </div>
            <div className="space-y-3">
              {members.map((m) => {
                const memberStats = stats[m.id] || { docs: 0, docs30d: 0, clients: 0 }
                const docsPercent = m.docs_limit ? Math.min((m.docs_trial_used / m.docs_limit) * 100, 100) : 0
                return (
                  <div key={m.id} className="p-4 rounded-2xl" style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}>
                        {m.name?.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{m.name}</span>
                          {m.office_role === 'owner' && <Crown size={13} color="#D4AF37"/>}
                        </div>
                        <div className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#666' }}>{m.email} · OAB/{m.oab_uf} {m.oab_number}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: `${planColors[m.plan] || '#888'}18`, color: planColors[m.plan] || '#888' }}>
                          {m.plan?.toUpperCase()}
                        </span>
                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: m.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: m.status === 'active' ? '#22C55E' : '#EF4444' }}>
                          {m.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-xl" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)' }}>
                        <div className="text-lg font-bold text-gradient-gold">{memberStats.docs}</div>
                        <div className="text-[10px]" style={{ color: isLight ? '#5E5E5E' : '#666' }}>Petições</div>
                      </div>
                      <div className="text-center p-2 rounded-xl" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)' }}>
                        <div className="text-lg font-bold text-gradient-gold">{memberStats.clients}</div>
                        <div className="text-[10px]" style={{ color: isLight ? '#5E5E5E' : '#666' }}>Clientes</div>
                      </div>
                      <div className="text-center p-2 rounded-xl" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)' }}>
                        <div className="text-lg font-bold text-gradient-gold">{m.docs_trial_used || 0}/{m.docs_limit || 5}</div>
                        <div className="text-[10px]" style={{ color: isLight ? '#5E5E5E' : '#666' }}>Uso</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${docsPercent}%`, background: docsPercent > 80 ? '#EF4444' : 'linear-gradient(90deg, #D4AF37, #F0D060)' }}/>
                      </div>
                    </div>
                  </div>
                )
              })}
              {members.length === 0 && (
                <div className="text-center py-10">
                  <Users size={32} color="#333" className="mx-auto mb-3"/>
                  <p className="text-sm" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Nenhum membro ainda</p>
                  {isOwner && <p className="text-xs mt-1" style={{ color: '#666' }}>Gere um convite acima para adicionar advogados</p>}
                </div>
              )}
            </div>
          </GlassCard>

          {/* PERMISSÕES */}
          <div id="permissoes" className="scroll-mt-24 mt-6">
            <GlassCard intensity={0.3} style={{ padding: 24 }}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} color="#D4AF37"/>
                <h3 className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Permissões</h3>
              </div>
              <p className="text-sm mb-5" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>
                O nível de acesso de cada advogado é definido pelo papel dele no escritório.
              </p>

              <div className="grid md:grid-cols-2 gap-3 mb-5">
                {[
                  { role: 'Proprietário', icon: Crown, color: '#D4AF37', perms: ['Convidar e remover advogados', 'Ver estatísticas de todo o escritório', 'Gerenciar plano e faturamento'] },
                  { role: 'Membro', icon: Users, color: '#3B82F6', perms: ['Criar petições e gerenciar seus clientes', 'Ver a equipe do escritório', 'Sem acesso a convites e faturamento'] },
                ].map(({ role, icon: Icon, color, perms }) => (
                  <div key={role} className="p-4 rounded-2xl" style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={15} color={color}/>
                      <span className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{role}</span>
                    </div>
                    <ul className="space-y-1">
                      {perms.map((p) => (
                        <li key={p} className="text-xs flex gap-2" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>
                          <span style={{ color }}>•</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{m.name}</div>
                      <div className="text-[11px] truncate" style={{ color: isLight ? '#5E5E5E' : '#666' }}>{m.email}</div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full font-bold flex-shrink-0" style={{
                      background: m.office_role === 'owner' ? 'rgba(212,175,55,0.12)' : 'rgba(59,130,246,0.12)',
                      color: m.office_role === 'owner' ? '#D4AF37' : '#3B82F6',
                    }}>
                      {m.office_role === 'owner' ? 'Proprietário' : 'Membro'}
                    </span>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: isLight ? '#5E5E5E' : '#666' }}>Nenhum membro para exibir permissões</p>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* ESPAÇO INDIVIDUAL DO ADVOGADO */}
      {me?.id && (
        <div id="meu-espaco" className="scroll-mt-24 mt-6">
          <EspacoIndividual
            lawyerId={me.id}
            officeId={me.office_id || null}
            membros={members.map(m => ({ id: m.id, name: m.name }))}
            isLight={isLight}
          />
        </div>
      )}

      <MetricaDetalheModal
        tipo={metricaAberta}
        membros={membrosDetalhe}
        onClose={() => setMetricaAberta(null)}
      />
    </div>
  )
}