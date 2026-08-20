'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { LifeBuoy, Plus, X, Send, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Aberto', color: '#3B82F6', icon: Clock },
  in_progress: { label: 'Em andamento', color: '#F59E0B', icon: AlertCircle },
  closed: { label: 'Resolvido', color: '#22C55E', icon: CheckCircle },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#888' },
  normal: { label: 'Normal', color: '#3B82F6' },
  high: { label: 'Alta', color: '#F59E0B' },
  urgent: { label: 'Urgente', color: '#EF4444' },
}

export default function SuportePage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [isLight, setIsLight] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', priority: 'normal' })

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
      const { data: lawyer } = await supabase.from('lawyers').select('name, email').eq('id', user.id).single()
      const { data } = await supabase.from('support_tickets').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false })
      setTickets(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function enviarTicket() {
    if (!form.title || !form.message) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: lawyer } = await supabase.from('lawyers').select('name, email').eq('id', user.id).single()
    const { data } = await supabase.from('support_tickets').insert({
      lawyer_id: user.id,
      lawyer_name: lawyer?.name,
      lawyer_email: lawyer?.email,
      title: form.title,
      message: form.message,
      priority: form.priority,
    }).select().single()
    if (data) setTickets(prev => [data, ...prev])
    setForm({ title: '', message: '', priority: 'normal' })
    setShowForm(false)
    setSending(false)
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
            <LifeBuoy size={28} color="#D4AF37"/>
            <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Central de <span className="text-gradient-gold">Suporte</span></span>
          </h1>
          <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Abra um chamado e nossa equipe responderá em breve</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-2 px-5 py-3 rounded-xl text-sm">
          <Plus size={16}/> Novo Chamado
        </button>
      </motion.div>

      {tickets.length === 0 ? (
        <GlassCard intensity={0.3} style={{ padding: 48 }}>
          <div className="text-center">
            <LifeBuoy size={40} color="#333" className="mx-auto mb-3"/>
            <p className="text-gray-400 mb-2">Nenhum chamado aberto</p>
            <button onClick={() => setShowForm(true)} className="btn-gold px-5 py-2.5 rounded-xl text-sm">Abrir primeiro chamado</button>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {tickets.map((t, i) => {
            const status = statusConfig[t.status] || statusConfig.open
            const priority = priorityConfig[t.priority] || priorityConfig.normal
            const Icon = status.icon
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard intensity={0.5} onClick={() => setSelected(t)} style={{ padding: 20, cursor: 'pointer' }}>
                  <div className="flex items-start gap-3">
                    <Icon size={18} color={status.color} className="flex-shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{t.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${priority.color}18`, color: priority.color }}>{priority.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{t.message}</p>
                      {t.admin_reply && (
                        <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
                          ✉ Resposta recebida
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: `${status.color}18`, color: status.color }}>{status.label}</span>
                      <div className="text-[10px] text-gray-500 mt-1">{new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Abrir Chamado</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-400">Assunto</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Descreva o problema brevemente..." className="input-glass w-full px-4 text-sm" style={{ height: 46 }} spellCheck={true} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-400">Prioridade</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-glass w-full px-4 text-sm" style={{ height: 46 }}>
                  <option value="low" style={{ background: '#111' }}>Baixa</option>
                  <option value="normal" style={{ background: '#111' }}>Normal</option>
                  <option value="high" style={{ background: '#111' }}>Alta</option>
                  <option value="urgent" style={{ background: '#111' }}>Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-400">Descricao detalhada</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Descreva o problema com detalhes..." className="input-glass w-full px-4 text-sm" style={{ height: 120, paddingTop: 12, resize: 'none' }} spellCheck={true} />
              </div>
              <button onClick={enviarTicket} disabled={sending || !form.title || !form.message} className="btn-gold w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold">
                {sending ? 'Enviando...' : 'Enviar Chamado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-gray-500 mb-1">Sua mensagem</p>
                <p className="text-sm text-gray-300">{selected.message}</p>
              </div>
              {selected.admin_reply && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <p className="text-xs mb-1" style={{ color: '#D4AF37' }}>Resposta do suporte</p>
                  <p className="text-sm text-gray-300">{selected.admin_reply}</p>
                </div>
              )}
              <div className="text-xs text-gray-500">
                Aberto em {new Date(selected.created_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
