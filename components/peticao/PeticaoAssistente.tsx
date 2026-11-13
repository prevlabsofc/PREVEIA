'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { AvisoCitacao } from '@/components/AvisoCitacao'

type Alteracao = {
  id: string
  titulo: string
  atual: string
  proposto: string
  status: 'pendente' | 'aplicada' | 'descartada'
}

type Msg = {
  id: string
  role: 'user' | 'assistant'
  content: string
  alteracoes?: Alteracao[]
}

type Props = {
  text: string
  onTextChange: (text: string) => void
  dadosCaso?: Record<string, string> | null
  isLight?: boolean
}

const EXEMPLOS = [
  'Deixe a seção III mais objetiva',
  'Acrescente fundamentação sobre a Súmula 149 do STJ',
  'Reescreva o pedido iii citando o período exato',
]

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Chat do assistente de edição: propõe diffs; só aplica com aprovação.
 */
export function PeticaoAssistente({
  text,
  onTextChange,
  dadosCaso,
  isLight = false,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function enviar(textoMsg?: string) {
    const msg = (textoMsg ?? input).trim()
    if (!msg || loading) return
    const userMsg: Msg = { id: uid(), role: 'user', content: msg }
    const hist = [...messages, userMsg]
    setMessages(hist)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/peticao-assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem: msg,
          textoPeticao: text,
          dadosCaso: dadosCaso || {},
          historico: hist
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha no assistente')

      const alteracoes: Alteracao[] = Array.isArray(data.alteracoes)
        ? data.alteracoes.map(
            (a: { titulo?: string; atual?: string; proposto?: string }) => ({
              id: uid(),
              titulo: a.titulo || 'Alteração',
              atual: String(a.atual || ''),
              proposto: String(a.proposto || ''),
              status: 'pendente' as const,
            }),
          )
        : []

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: String(data.mensagem || 'Proposta pronta.'),
          alteracoes,
        },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content:
            e instanceof Error
              ? e.message
              : 'Não foi possível obter a sugestão. Tente novamente.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function aplicarAlteracao(msgId: string, altId: string) {
    const msg = messages.find((m) => m.id === msgId)
    const alt = msg?.alteracoes?.find((a) => a.id === altId)
    if (!alt || alt.status !== 'pendente') return

    if (!text.includes(alt.atual)) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id !== msgId
            ? m
            : {
                ...m,
                alteracoes: m.alteracoes?.map((a) =>
                  a.id === altId
                    ? {
                        ...a,
                        status: 'descartada' as const,
                        titulo: `${a.titulo} (trecho não encontrado)`,
                      }
                    : a,
                ),
              },
        ),
      )
      return
    }

    onTextChange(text.replace(alt.atual, alt.proposto))
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== msgId
          ? m
          : {
              ...m,
              alteracoes: m.alteracoes?.map((a) =>
                a.id === altId ? { ...a, status: 'aplicada' as const } : a,
              ),
            },
      ),
    )
  }

  function descartarAlteracao(msgId: string, altId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== msgId
          ? m
          : {
              ...m,
              alteracoes: m.alteracoes?.map((a) =>
                a.id === altId ? { ...a, status: 'descartada' as const } : a,
              ),
            },
      ),
    )
  }

  const bubbleUser = isLight
    ? { background: 'rgba(212,175,55,0.18)', color: '#1E1E1E' }
    : { background: 'rgba(212,175,55,0.15)', color: '#eee' }
  const bubbleAi = isLight
    ? { background: '#F5F5F5', color: '#333' }
    : { background: 'rgba(255,255,255,0.05)', color: '#ccc' }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 420, maxHeight: '70vh' }}>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="py-6 px-2 text-center">
            <Sparkles size={20} className="mx-auto mb-2" style={{ color: '#D4AF37' }} />
            <p className="text-xs mb-3" style={{ color: '#888' }}>
              Peça alterações em linguagem natural. Nada é aplicado sem a sua aprovação.
            </p>
            <div className="flex flex-col gap-1.5">
              {EXEMPLOS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void enviar(ex)}
                  className="text-left text-[11px] px-3 py-2 rounded-lg transition-all hover:opacity-90"
                  style={{
                    border: '1px solid rgba(212,175,55,0.25)',
                    color: '#D4AF37',
                    background: 'rgba(212,175,55,0.06)',
                  }}
                >
                  “{ex}”
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className="max-w-[95%] rounded-xl px-3 py-2 text-xs leading-relaxed"
              style={m.role === 'user' ? bubbleUser : bubbleAi}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.alteracoes?.map((alt) => (
                <div
                  key={alt.id}
                  className="mt-2 rounded-lg overflow-hidden"
                  style={{ border: '1px solid rgba(212,175,55,0.25)' }}
                >
                  <div
                    className="px-2 py-1 text-[10px] font-bold tracking-wide"
                    style={{
                      background: 'rgba(212,175,55,0.1)',
                      color: '#D4AF37',
                    }}
                  >
                    {alt.titulo}
                    {alt.status === 'aplicada' ? ' · aplicada' : ''}
                    {alt.status === 'descartada' ? ' · descartada' : ''}
                  </div>
                  <div className="grid grid-cols-1 gap-0">
                    <div
                      className="px-2 py-1.5 text-[10px]"
                      style={{
                        background: isLight ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.08)',
                        color: isLight ? '#991b1b' : '#fca5a5',
                      }}
                    >
                      <div className="opacity-60 mb-0.5">Atual</div>
                      <div className="whitespace-pre-wrap font-mono">{alt.atual}</div>
                    </div>
                    <div
                      className="px-2 py-1.5 text-[10px]"
                      style={{
                        background: isLight ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.08)',
                        color: isLight ? '#166534' : '#86efac',
                      }}
                    >
                      <div className="opacity-60 mb-0.5">Proposto</div>
                      <div className="whitespace-pre-wrap font-mono">{alt.proposto}</div>
                    </div>
                  </div>
                  {alt.status === 'pendente' && (
                    <div className="flex gap-1.5 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => aplicarAlteracao(m.id, alt.id)}
                        className="flex-1 py-1 rounded-md text-[11px] font-bold"
                        style={{ background: '#D4AF37', color: '#000' }}
                      >
                        Aplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => descartarAlteracao(m.id, alt.id)}
                        className="flex-1 py-1 rounded-md text-[11px]"
                        style={{
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#888',
                        }}
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: '#D4AF37' }}>
            <Loader2 size={12} className="animate-spin" />
            Analisando a petição…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <AvisoCitacao text={text} className="mx-3 mb-1" isLight={isLight} />

      <div
        className="flex-shrink-0 p-2 flex gap-2"
        style={{ borderTop: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)' }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void enviar()
            }
          }}
          placeholder="Peça uma alteração…"
          disabled={loading}
          className="input-glass flex-1 px-3 text-sm"
          style={{ height: 40 }}
        />
        <button
          type="button"
          onClick={() => void enviar()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
          style={{ background: '#D4AF37', color: '#000' }}
          aria-label="Enviar"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
