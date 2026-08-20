'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { AlertCircle, MessageSquare, Send, Users, WifiOff, X } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Msg { id: string; lawyer_id: string; lawyer_name: string; mensagem: string; created_at: string }

type ErroSupabase = { code?: string; message?: string } | null

function traduzirErro(error: ErroSupabase, fallback: string) {
  if (!error) return fallback
  if (error.code === 'PGRST205' || error.code === '42P01')
    return 'A tabela do chat ainda não existe no banco. Aplique a migração 20260727_chat_escritorio.sql no Supabase.'
  if (error.code === '42501')
    return 'Sem permissão para gravar no chat do escritório. Verifique as políticas de RLS no Supabase.'
  if (error.code === 'PGRST301')
    return 'Sua sessão expirou. Entre novamente para continuar conversando.'
  return error.message ? `${fallback} (${error.message})` : fallback
}

/** Une mensagens por id para que o eco do Realtime não duplique o envio otimista. */
function mesclar(anteriores: Msg[], novas: Msg[]): Msg[] {
  const porId = new Map(anteriores.map(m => [m.id, m]))
  for (const m of novas) porId.set(m.id, m)
  return [...porId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export default function ChatPage() {
  const [isLight, setIsLight] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [me, setMe] = useState<any>(null)
  const [officeId, setOfficeId] = useState<string | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tempoRealOk, setTempoRealOk] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Só acompanha as novas mensagens se o usuário não subiu para reler o histórico
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [loading, me?.office_id])

  useEffect(() => {
    const el = scrollRef.current
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, atBottom])

  useEffect(() => {
    let cancelado = false

    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (cancelado) return
      if (authError || !user) {
        setErro('Sua sessão expirou. Entre novamente para usar o chat.')
        setLoading(false)
        return
      }

      const { data: lawyer, error: lawyerError } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      if (cancelado) return
      if (lawyerError) {
        console.error('[chat] falha ao carregar o advogado', lawyerError)
        setErro(traduzirErro(lawyerError, 'Não foi possível carregar seu perfil.'))
        setLoading(false)
        return
      }
      setMe(lawyer)
      if (!lawyer?.office_id) { setLoading(false); return }
      setOfficeId(lawyer.office_id)

      const [team, history] = await Promise.all([
        supabase.from('lawyers').select('id, name, logo_url').eq('office_id', lawyer.office_id),
        supabase.from('chat_escritorio').select('*').eq('office_id', lawyer.office_id).order('created_at', { ascending: true }).limit(100),
      ])
      if (cancelado) return

      setMembers(team.data || [])
      if (history.error) {
        console.error('[chat] falha ao carregar o histórico', history.error)
        setErro(traduzirErro(history.error, 'Não foi possível carregar as mensagens.'))
      } else {
        setMsgs((history.data as Msg[]) || [])
      }
      setLoading(false)
    }

    load()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!officeId) return
    const channel = supabase
      .channel(`chat_escritorio_${officeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_escritorio', filter: `office_id=eq.${officeId}` },
        payload => setMsgs(prev => mesclar(prev, [payload.new as Msg]))
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setTempoRealOk(true)
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[chat] canal de tempo real indisponível:', status)
          setTempoRealOk(false)
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [officeId])

  // Sem Realtime (tabela fora da publicação, rede bloqueada), recarrega em intervalo
  // para que as mensagens dos outros advogados ainda apareçam.
  useEffect(() => {
    if (!officeId || tempoRealOk) return
    const timer = setInterval(async () => {
      const { data } = await supabase.from('chat_escritorio').select('*').eq('office_id', officeId).order('created_at', { ascending: true }).limit(100)
      if (data) setMsgs(prev => mesclar(prev, data as Msg[]))
    }, 10000)
    return () => clearInterval(timer)
  }, [officeId, tempoRealOk])

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault()
    const texto = input.trim()
    if (!texto || enviando) return
    if (!me?.id || !officeId) {
      setErro('Não foi possível identificar seu escritório. Recarregue a página.')
      return
    }

    setEnviando(true)
    setErro(null)
    setInput('')

    const { data, error } = await supabase.from('chat_escritorio').insert({
      office_id: officeId,
      lawyer_id: me.id,
      lawyer_name: me.name,
      mensagem: texto,
    }).select().single()

    setEnviando(false)

    if (error) {
      console.error('[chat] falha ao enviar a mensagem', error)
      setErro(traduzirErro(error, 'Não foi possível enviar a mensagem.'))
      setInput(prev => prev || texto)
      return
    }
    if (data) setMsgs(prev => mesclar(prev, [data as Msg]))
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  if (!me?.office_id) return (
    <div className="p-8 max-w-2xl mx-auto text-center">
      <GlassCard intensity={0.3} style={{ padding: 48 }}>
        <MessageSquare size={40} color="#333" className="mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-white mb-2">Chat do Escritório</h2>
        <p className="text-gray-400 mb-4">
          {erro || 'Você precisa fazer parte de um escritório para usar o chat interno.'}
        </p>
        <a href="/equipe" className="btn-gold px-5 py-2.5 rounded-xl text-sm inline-block">Ir para Minha Equipe →</a>
      </GlassCard>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-104px)] flex gap-4" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      {/* MEMBROS */}
      <div className="w-56 flex-shrink-0 min-h-0">
        <GlassCard
          intensity={0.3}
          style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          contentClassName="flex flex-1 flex-col min-h-0 p-4"
        >
          <div className="text-xs font-bold tracking-widest mb-3 flex items-center gap-2 flex-shrink-0" style={{ color: '#666' }}>
            <Users size={13}/> MEMBROS ({members.length})
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-0.5">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: m.id === me?.id ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden" style={{ background: m.logo_url ? '#fff' : 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}>
                  {m.logo_url ? <img src={m.logo_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : m.name?.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{m.name}</div>
                  {m.id === me?.id && <div className="text-[9px] text-green-500">● você</div>}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col min-h-0">
        <GlassCard intensity={0.2}
          style={{ padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          contentClassName="flex-1 flex flex-col min-h-0">
          {/* HEADER */}
          <div className="flex items-center gap-3 p-4 flex-shrink-0" style={{ borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}` }}>
            <MessageSquare size={18} color="#D4AF37"/>
            <div>
              <div className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Chat do Escritório</div>
              <div className="text-[10px] text-gray-500">{me?.office_name || 'Escritório'} · {members.length} membros</div>
            </div>
          </div>

          {/* MENSAGENS */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare size={32} color="#333" className="mb-2"/>
                <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                <p className="text-xs text-gray-600">Seja o primeiro a enviar uma mensagem!</p>
              </div>
            )}
            {msgs.map((m, i) => {
              const isMe = m.lawyer_id === me?.id
              const member = members.find(mb => mb.id === m.lawyer_id)
              return (
                <motion.div key={m.id || i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden" style={{ background: member?.logo_url ? '#fff' : 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}>
                      {member?.logo_url ? <img src={member.logo_url} alt={m.lawyer_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : m.lawyer_name?.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()}
                    </div>
                  )}
                  <div className={`max-w-[70%]`}>
                    {!isMe && <div className="text-[10px] text-gray-500 mb-0.5 ml-1">{m.lawyer_name}</div>}
                    <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed" style={{
                      background: isMe ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))' : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)'),
                      border: isMe ? '1px solid rgba(212,175,55,0.3)' : `1px solid ${isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)'}`,
                      color: isLight ? '#1E1E1E' : '#ddd',
                      borderBottomRightRadius: isMe ? 4 : undefined,
                      borderBottomLeftRadius: !isMe ? 4 : undefined,
                    }}>
                      {m.mensagem}
                    </div>
                    <div className={`text-[9px] text-gray-600 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                      {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* INPUT */}
          <div className="p-4 flex-shrink-0" style={{ borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}` }}>
            {erro && (
              <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
                <span className="flex-1">{erro}</span>
                <button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso" className="flex-shrink-0 transition-colors hover:text-white">
                  <X size={14}/>
                </button>
              </div>
            )}
            {!tempoRealOk && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#EAB308' }}>
                <WifiOff size={14} className="flex-shrink-0"/>
                <span>Tempo real indisponível. As novas mensagens serão atualizadas a cada 10 segundos.</span>
              </div>
            )}
            <form onSubmit={enviar} className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder="Mensagem para o escritório..." className="input-glass flex-1 px-4 text-sm" style={{ height: 44 }} spellCheck={true} />
              <button type="submit" disabled={!input.trim() || enviando} aria-label="Enviar mensagem"
                className="btn-gold w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-50">
                <Send size={18}/>
              </button>
            </form>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
