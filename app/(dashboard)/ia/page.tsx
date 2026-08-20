'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { Send, Plus, Loader2, Sparkles, ListOrdered, ArrowDown } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { HistoricoConversas, type PatchConversa } from '@/components/ia/HistoricoConversas'
import { AvisoCitacao } from '@/components/AvisoCitacao'
import { MarkdownMessage } from '@/components/MarkdownMessage'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Message { role: 'user' | 'assistant'; content: string }
interface Conversa { id: string; title: string; messages: Message[]; updated_at: string; pasta?: string | null; client_id?: string | null }
interface Cliente { id: string; name: string; cpf?: string | null }

const CHIPS = [
  'Qual a carência do BPC/LOAS?',
  'Como provar atividade rural?',
  'Documentos para aposentadoria rural?',
  'Valor do salário-maternidade 2026?',
  'Requisitos para auxílio-doença?',
  'Prazo para recurso administrativo no INSS?',
]

export default function IAPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConversas, setLoadingConversas] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLight, setIsLight] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(null)
  const [atBottom, setAtBottom] = useState(true)

  const active = conversas.find(c => c.id === activeId)
  const messages = active?.messages || []

  const userMessageEntries = useMemo(
    () => messages.map((msg, index) => ({ msg, index })).filter(({ msg }) => msg.role === 'user'),
    [messages],
  )

  const showQuestionIndex = userMessageEntries.length >= 1

  const scrollToQuestion = useCallback((messageIndex: number) => {
    const el = document.getElementById(`msg-${messageIndex}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveQuestionIdx(messageIndex)
    }
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = messagesScrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    setActiveQuestionIdx(null)
    setAtBottom(true)
    scrollToBottom('auto')
  }, [activeId, scrollToBottom])

  // Marca se o usuário está no fim para não sequestrar a rolagem durante o streaming
  useEffect(() => {
    const el = messagesScrollRef.current
    if (!el) return
    const onScroll = () => {
      setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (atBottom) scrollToBottom()
  }, [messages, loading, atBottom, scrollToBottom])

  useEffect(() => {
    const root = messagesScrollRef.current
    if (!root || !showQuestionIndex) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const idx = Number(visible[0].target.id.replace('msg-', ''))
          if (!Number.isNaN(idx)) setActiveQuestionIdx(idx)
        }
      },
      { root, rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    )

    userMessageEntries.forEach(({ index }) => {
      const el = document.getElementById(`msg-${index}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [showQuestionIndex, userMessageEntries, activeId])

  useEffect(() => {
    async function loadConversas() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const [{ data }, { data: cli }] = await Promise.all([
        supabase.from('ia_conversations').select('*').eq('lawyer_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('clients').select('id, name, cpf').eq('lawyer_id', user.id).order('name'),
      ])
      setConversas((data as Conversa[]) || [])
      setClientes((cli as Cliente[]) || [])
      setLoadingConversas(false)
    }
    loadConversas()
  }, [])

  async function novaConversa() {
    if (!userId) return
    const { data } = await supabase.from('ia_conversations').insert({ lawyer_id: userId, title: 'Nova conversa', messages: [] }).select().single()
    if (data) {
      setConversas(prev => [data as Conversa, ...prev])
      setActiveId(data.id)
    }
  }

  async function apagarConversa(id: string) {
    await supabase.from('ia_conversations').delete().eq('id', id)
    setConversas(prev => prev.filter(c => c.id !== id))
    if (activeId === id) setActiveId(null)
  }

  async function atualizarConversa(id: string, patch: PatchConversa) {
    setConversas(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    await supabase.from('ia_conversations').update(patch).eq('id', id)
  }

  async function renomearPasta(antiga: string, nova: string) {
    if (!userId) return
    setConversas(prev => prev.map(c => c.pasta === antiga ? { ...c, pasta: nova } : c))
    await supabase.from('ia_conversations').update({ pasta: nova }).eq('lawyer_id', userId).eq('pasta', antiga)
  }

  // Gera o título em segundo plano: o chat não espera por ele.
  async function gerarTitulo(convId: string, pergunta: string, resposta: string) {
    try {
      const res = await fetch('/api/gerar-titulo-conversa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta, resposta }),
      })
      if (!res.ok) return
      const { titulo } = await res.json()
      if (!titulo) return
      setConversas(prev => prev.map(c => c.id === convId ? { ...c, title: titulo } : c))
      await supabase.from('ia_conversations').update({ title: titulo }).eq('id', convId)
    } catch { /* mantém o título provisório */ }
  }

  async function salvarConversa(id: string, msgs: Message[], titulo?: string) {
    const updates: any = { messages: msgs, updated_at: new Date().toISOString() }
    if (titulo) updates.title = titulo
    await supabase.from('ia_conversations').update(updates).eq('id', id)
    setConversas(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  async function enviar(texto?: string) {
    const msg = texto || input
    if (!msg.trim() || loading) return

    let convId = activeId
    if (!convId) {
      if (!userId) return
      const { data } = await supabase.from('ia_conversations').insert({ lawyer_id: userId, title: 'Nova conversa', messages: [] }).select().single()
      if (!data) return
      setConversas(prev => [data as Conversa, ...prev])
      setActiveId(data.id)
      convId = data.id
    }
    if (!convId) return

    const userMsg: Message = { role: 'user', content: msg }
    const currentMsgs = [...messages, userMsg]

    setConversas(prev => prev.map(c => c.id === convId ? { ...c, messages: currentMsgs } : c))
    setInput('')
    setLoading(true)

    // Título provisório (truncado) salvo já na primeira troca; a IA refina depois.
    const primeiraTroca = messages.length === 0
    const titulo = primeiraTroca ? msg.slice(0, 40) : undefined

    try {
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMsgs }),
      })

      if (!res.ok || !res.body) throw new Error('Erro na resposta')

      const assistantMsg: Message = { role: 'assistant', content: '' }
      const withAssistant = [...currentMsgs, assistantMsg]
      setConversas(prev => prev.map(c => c.id === convId ? { ...c, messages: withAssistant } : c))

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value)
        setConversas(prev => prev.map(c => {
          if (c.id !== convId) return c
          const msgs = [...c.messages]
          msgs[msgs.length - 1] = { role: 'assistant', content: acc }
          return { ...c, messages: msgs }
        }))
      }

      const finalMsgs = [...currentMsgs, { role: 'assistant' as const, content: acc }]
      await salvarConversa(convId, finalMsgs, titulo)

      if (primeiraTroca && acc.trim()) void gerarTitulo(convId, msg, acc)

    } catch {
      const errMsgs = [...currentMsgs, { role: 'assistant' as const, content: 'Desculpe, ocorreu um erro. Tente novamente.' }]
      setConversas(prev => prev.map(c => c.id === convId ? { ...c, messages: errMsgs } : c))
      await salvarConversa(convId, errMsgs, titulo)
    } finally {
      setLoading(false)
    }
  }

  const isEmptyState = !activeId || messages.length === 0

  return (
    <div className="flex h-[calc(100vh-104px)] gap-4 p-4">
      {/* HISTÓRICO LATERAL */}
      <div className="w-64 flex-shrink-0 flex flex-col min-h-0">
        <button onClick={novaConversa} className="btn-gold flex items-center justify-center gap-2 py-3 rounded-xl text-sm mb-3 flex-shrink-0">
          <Plus size={16}/> Nova Conversa
        </button>
        <GlassCard
          intensity={0.2}
          style={{ padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          contentClassName="flex flex-1 flex-col min-h-0 p-3"
        >
          <HistoricoConversas
            conversas={conversas}
            clientes={clientes}
            activeId={activeId}
            loading={loadingConversas}
            isLight={isLight}
            onSelecionar={setActiveId}
            onExcluir={apagarConversa}
            onAtualizar={atualizarConversa}
            onRenomearPasta={renomearPasta}
          />
        </GlassCard>
      </div>

      {/* CHAT */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <GlassCard
          intensity={0.2}
          style={{ padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          contentClassName="relative flex flex-1 flex-col min-h-0"
        >
          <div ref={messagesScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
            {isEmptyState ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
                >
                  <Sparkles size={30} color="#D4AF37"/>
                </motion.div>
                <h2 className="text-xl font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                  IA Consultora Jurídica
                </h2>
                <p className="text-sm text-gray-400 mb-2 max-w-md">
                  Tire dúvidas sobre benefícios, carências, jurisprudência e procedimentos do INSS.
                </p>
                <p className="text-xs font-medium mb-6" style={{ color: '#D4AF37' }}>
                  ↓ Digite sua pergunta abaixo ou clique em um exemplo
                </p>
                <div className="w-full max-w-xl">
                  <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#666' }}>
                    PERGUNTAS FREQUENTES — CLIQUE PARA ENVIAR
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CHIPS.map(chip => (
                      <button
                        key={chip}
                        onClick={() => enviar(chip)}
                        disabled={loading}
                        className="flex items-start gap-2 text-xs p-3 rounded-xl text-left transition-all duration-200 hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.4)] hover:text-[#ddd] disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.18)', color: '#aaa' }}
                      >
                        <Sparkles size={12} color="#D4AF37" className="flex-shrink-0 mt-0.5"/>
                        <span>{chip}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 max-w-4xl mx-auto">
                <div className="flex-1 min-w-0 space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      id={`msg-${i}`}
                      className={`flex scroll-mt-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap' : ''}`} style={{
                        background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))' : (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)'),
                        border: msg.role === 'user' ? '1px solid rgba(212,175,55,0.25)' : `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'}`,
                        color: isLight ? '#1E1E1E' : '#ddd',
                      }}>
                        {msg.role === 'assistant' && msg.content ? (
                          <MarkdownMessage
                            content={msg.content}
                            isLight={isLight}
                            streaming={loading && i === messages.length - 1}
                            fontes
                          />
                        ) : (
                          msg.content || (loading && i === messages.length - 1 && <Loader2 size={16} className="animate-spin"/>)
                        )}
                        {msg.role === 'assistant' && msg.content && (
                          <AvisoCitacao text={msg.content} isLight={isLight} className="mt-3"/>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {showQuestionIndex && (
                  <nav
                    className="sticky top-4 self-start w-44 flex-shrink-0 hidden lg:flex flex-col"
                    aria-label="Índice da conversa"
                  >
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <ListOrdered size={11} color="#D4AF37"/>
                      <span className="text-[9px] font-bold tracking-widest" style={{ color: '#666' }}>
                        PERGUNTAS
                      </span>
                    </div>
                    <div
                      className="rounded-xl p-1.5 space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto"
                      style={{
                        background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(212,175,55,0.15)',
                      }}
                    >
                      {userMessageEntries.map(({ msg, index }, qNum) => {
                        const isActive = activeQuestionIdx === index
                        const label = msg.content.slice(0, 40) + (msg.content.length > 40 ? '…' : '')
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => scrollToQuestion(index)}
                            className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] leading-snug transition-all duration-200 hover:bg-[rgba(212,175,55,0.08)]"
                            style={{
                              background: isActive ? 'rgba(212,175,55,0.15)' : 'transparent',
                              border: isActive ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                              color: isActive ? '#D4AF37' : (isLight ? '#666' : '#888'),
                            }}
                            title={msg.content}
                          >
                            <span className="font-bold mr-1 opacity-80">{qNum + 1}.</span>
                            <span className="line-clamp-2">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </nav>
                )}
              </div>
            )}
          </div>

          {!isEmptyState && !atBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom()}
              aria-label="Ir para a mensagem mais recente"
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-200 hover:bg-[rgba(212,175,55,0.18)]"
              style={{
                background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(20,18,12,0.92)',
                border: '1px solid rgba(212,175,55,0.35)',
                color: '#D4AF37',
                boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
              }}
            >
              <ArrowDown size={11}/> Mensagens recentes
            </button>
          )}

          <div
            className="p-4 flex-shrink-0"
            style={{ borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}` }}
          >
            <div
              className="flex items-center gap-2 max-w-3xl mx-auto rounded-2xl p-1 transition-all duration-300"
              style={isEmptyState ? {
                boxShadow: '0 0 0 2px rgba(212,175,55,0.35), 0 0 24px rgba(212,175,55,0.15)',
                animation: 'glow-pulse 2.5s ease-in-out infinite',
              } : undefined}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                placeholder="Digite sua pergunta ou selecione um caso acima..."
                className="input-glass flex-1 px-4 text-sm"
                style={{
                  height: 48,
                  ...(isEmptyState ? { borderColor: 'rgba(212,175,55,0.35)' } : {}),
                }} spellCheck={true} />
              <motion.button
                onClick={() => enviar()}
                disabled={loading || !input.trim()}
                className="btn-gold w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                animate={isEmptyState && input.trim() ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={{ duration: 1.5, repeat: isEmptyState && input.trim() ? Infinity : 0 }}
              >
                {loading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
              </motion.button>
            </div>
            {isEmptyState && (
              <p className="text-center text-[10px] mt-2" style={{ color: '#666' }}>
                Pressione <kbd className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Enter</kbd> para enviar
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}