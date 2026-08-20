'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, X, Send, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { MarkdownMessage } from '@/components/MarkdownMessage'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Msg { role: 'user' | 'assistant'; content: string }

export function SupportChat({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente de suporte da Marple. Como posso ajudar você hoje?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    async function loadHistory() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('support_chat_history').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false }).limit(1).single()
      if (data) {
        setHistoryId(data.id)
        const saved = data.messages as Msg[]
        if (saved && saved.length > 0) setMessages(saved)
      }
    }
    loadHistory()
  }, [])

  async function saveHistory(msgs: Msg[]) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (historyId) {
      await supabase.from('support_chat_history').update({ messages: msgs, updated_at: new Date().toISOString() }).eq('id', historyId)
    } else {
      const { data } = await supabase.from('support_chat_history').insert({ lawyer_id: user.id, messages: msgs }).select().single()
      if (data) setHistoryId(data.id)
    }
  }

  async function enviar() {
    if (!input.trim() || loading) return
    const userMsg: Msg = { role: 'user', content: input }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [
          { role: 'user', content: `Você é o suporte ao cliente da plataforma Marple (SaaS jurídico com IA para advogados previdenciaristas). Responda de forma objetiva e amigável sobre dúvidas de uso da plataforma, funcionalidades, planos e problemas técnicos. Pergunta: ${userMsg.content}` }
        ] }),
      })
      if (!res.ok || !res.body) throw new Error()
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value)
        setMessages(prev => {
          const msgs = [...prev]
          msgs[msgs.length - 1] = { role: 'assistant', content: acc }
          return msgs
        })
      }
      const finalMsgs = [...newMsgs, { role: 'assistant' as const, content: acc }]
      await saveHistory(finalMsgs)
    } catch {
      const errMsgs = [...newMsgs, { role: 'assistant' as const, content: 'Desculpe, ocorreu um erro. Tente novamente.' }]
      setMessages(errMsgs)
      await saveHistory(errMsgs)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 h-96 rounded-2xl flex flex-col z-50 overflow-hidden"
            style={{ background: '#141410', border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Headphones size={16} color="#D4AF37"/>
                <span className="text-sm font-bold text-white">Suporte Marple</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${m.role === 'user' ? 'whitespace-pre-wrap' : ''}`} style={{
                    background: m.role === 'user' ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                    color: m.role === 'user' ? '#fff' : '#ccc',
                  }}>
                    {m.role === 'assistant' && m.content ? (
                      <MarkdownMessage
                        content={m.content}
                        size="xs"
                        compact
                        streaming={loading && i === messages.length - 1}
                      />
                    ) : (
                      m.content || (loading && i === messages.length - 1 && <Loader2 size={12} className="animate-spin"/>)
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
            <div className="p-3 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                placeholder="Digite sua mensagem..." className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', color: '#fff' }} spellCheck={true} />
              <button onClick={enviar} disabled={loading} className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#D4AF37', color: '#000' }}>
                <Send size={14}/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(o => !o)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)', boxShadow: '0 8px 24px rgba(212,175,55,0.4)' }}>
        <Headphones size={22} color="#000"/>
      </button>
    </>
  )
}