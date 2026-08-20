'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2, Copy, Clock } from 'lucide-react'
import { QRCodeSVG as QRCode } from 'qrcode.react'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const PLANOS = [
  {
    id: 'starter', nome: 'Autônomo', cor: '#888',
    preco_mes: 94, preco_ano: 772,
    docs: 100, usuarios: 1,
    features: ['31 agentes IA', 'Export PDF', 'Email suporte', 'IA Consultora'],
    nao_inclui: ['Export DOCX', 'Importação em massa', 'Suporte prioritário'],
  },
  {
    id: 'plus', nome: 'Pequeno', cor: '#3B82F6', popular: true,
    preco_mes: 210, preco_ano: 1702,
    docs: 200, usuarios: 3,
    features: ['31 agentes IA', 'Export PDF + DOCX', 'IA Consultora', 'Chat suporte', 'Importação CSV'],
    nao_inclui: ['Suporte prioritário'],
  },
  {
    id: 'premium', nome: 'Médio', cor: '#D4AF37',
    preco_mes: 379, preco_ano: 3052,
    docs: 500, usuarios: 10,
    features: ['31 agentes IA', 'Export PDF + DOCX', 'IA Consultora', 'Importação em massa', 'Suporte prioritário'],
    nao_inclui: [],
  },
  {
    id: 'enterprise', nome: 'Enterprise', cor: '#A855F7', sob_consulta: true,
    preco_mes: 0, preco_ano: 0,
    docs: 99999, usuarios: -1,
    features: ['Tudo do Médio', 'Uso ilimitado', 'Suporte dedicado', 'Onboarding assistido'],
    nao_inclui: [],
  },
]

export default function AssinaturaPage() {
  const [lawyer, setLawyer] = useState<any>(null)
  const [anual, setAnual] = useState(false)
  const [modalPix, setModalPix] = useState<any>(null)
  const [qrCode, setQrCode] = useState('')
  const [billingId, setBillingId] = useState('')
  const [loadingPix, setLoadingPix] = useState(false)
  const [countdown, setCountdown] = useState(1800)
  const [paid, setPaid] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pagamentos, setPagamentos] = useState<any[]>([])

  const [isLight, setIsLight] = useState(false)
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
      const { data } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setLawyer(data)
      const { data: pays } = await supabase.from('payments').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false }).limit(10)
      setPagamentos(pays || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (!modalPix || paid) return
    const timer = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) { clearInterval(timer); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [modalPix, paid])

  useEffect(() => {
    if (!billingId || paid) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/checar-pagamento?id=${billingId}`)
        const data = await res.json()
        if (data.paid) {
          setPaid(true)
          clearInterval(poll)
          setTimeout(() => window.location.reload(), 3000)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(poll)
  }, [billingId, paid])

  async function handleAssinar(plano: any) {
    if (!lawyer) return
    setModalPix(plano)
    setLoadingPix(true)
    setCountdown(1800)
    setPaid(false)
    setQrCode('')

    try {
      const preco = anual ? plano.preco_ano : plano.preco_mes
      const res = await fetch('/api/criar-cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: plano.id,
          preco,
          nome: lawyer.name,
          email: lawyer.email,
          cpf: lawyer.cpf || '00000000000',
          celular: lawyer.whatsapp?.replace(/\D/g, '') || '00000000000',
          lawyerId: lawyer.id,
        }),
      })
      const data = await res.json()
      setQrCode(data.qrCode || '')
      setBillingId(data.billingId || '')
    } catch {
      setQrCode('ERRO_AO_GERAR_PIX')
    }
    setLoadingPix(false)
  }

  async function pagarComCartao(plano: any) {
    if (!lawyer) return
    const res = await fetch('/api/criar-checkout-stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano: plano.id, lawyerId: lawyer.id, email: lawyer.email, anual }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  async function cancelarAssinatura() {
    if (!confirm('Tem certeza que deseja cancelar? Você ainda terá acesso até o fim do período pago.')) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/cancelar-assinatura', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    })
    const data = await res.json()
    if (data.ok) alert('Assinatura cancelada. Você ainda tem acesso até o fim do período.')
    else alert(data.error || 'Erro ao cancelar')
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  function copyPix() {
    navigator.clipboard.writeText(qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const trialDays = lawyer
    ? Math.max(0, Math.ceil((new Date(lawyer.trial_expires_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>

      {/* HEADER */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-black mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Escolha seu Plano</h1>
        <p style={{ color: '#666', fontSize: 14 }}>
          {lawyer?.plan === 'trial'
            ? `Você está no trial — ${trialDays} dias restantes. Assine para continuar.`
            : `Plano atual: ${lawyer?.plan?.toUpperCase()}`}
        </p>

        {/* Toggle mensal/anual */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className="text-sm" style={{ color: anual ? '#555' : '#fff' }}>Mensal</span>
          <button onClick={() => setAnual(!anual)}
            className="w-12 h-6 rounded-full transition-all relative"
            style={{ background: anual ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
            <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: anual ? '26px' : '4px' }} />
          </button>
          <span className="text-sm" style={{ color: anual ? '#fff' : '#555' }}>
            Anual
            <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
              2 meses grátis
            </span>
          </span>
        </div>
      </div>

      {/* CARDS DOS PLANOS */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {PLANOS.map(plano => {
          const isAtual = lawyer?.plan === plano.id
          const preco = anual ? plano.preco_ano : plano.preco_mes

          return (
            <motion.div key={plano.id}
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-2xl flex flex-col relative"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: `2px solid ${isAtual ? plano.cor : 'rgba(255,255,255,0.07)'}`,
              }}>

              {plano.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black"
                  style={{ background: '#3B82F6', color: '#fff' }}>
                  MAIS POPULAR ★
                </div>
              )}

              {isAtual && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-black"
                  style={{ background: plano.cor, color: '#000' }}>
                  Plano Atual
                </div>
              )}

              <div className="mb-4">
                <div className="text-xs font-bold mb-1" style={{ color: plano.cor }}>{plano.nome}</div>
                <div className="text-3xl font-black" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                  {plano.sob_consulta ? 'Sob consulta' : `R$ ${preco.toLocaleString('pt-BR')}`}
                </div>
                <div className="text-xs mt-1" style={{ color: '#555' }}>
                  {plano.sob_consulta ? 'Plano personalizado' : `/${anual ? 'ano' : 'mês'}`} · {plano.docs === 99999 ? 'ilimitado' : plano.docs} docs
                </div>
              </div>

              <div className="flex-1 space-y-2 mb-6">
                {plano.features.map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs" style={{ color: '#ccc' }}>
                    <Check size={12} color={plano.cor} className="flex-shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
                {plano.nao_inclui.map(f => (
                  <div key={f} className="flex items-start gap-2 text-xs" style={{ color: '#444' }}>
                    <X size={12} color="#444" className="flex-shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isAtual && !plano.sob_consulta && handleAssinar(plano)}
                disabled={isAtual || plano.sob_consulta}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: isAtual ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${plano.cor}, ${plano.cor}dd)`,
                  color: isAtual ? '#555' : plano.cor === '#D4AF37' ? '#000' : '#fff',
                  border: isAtual ? '1px solid rgba(255,255,255,0.10)' : 'none',
                }}>
                {isAtual ? 'Plano Atual' : plano.sob_consulta ? 'Sob consulta' : 'Assinar →'}
              </button>
              {!plano.sob_consulta && (
              <button onClick={() => pagarComCartao(plano)}
                className="w-full h-10 rounded-xl text-xs font-medium mt-2 transition-all hover:bg-white/5"
                style={{ border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6' }}>
                💳 Pagar com Cartão
              </button>
              )}
              {isAtual && lawyer?.stripe_subscription_id && lawyer?.plan !== 'trial' && (
                <button onClick={cancelarAssinatura} className="w-full mt-2 py-2 rounded-xl text-xs font-medium transition-all hover:bg-red-500/10"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                  Cancelar Assinatura
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {pagamentos.length > 0 && (
        <div id="historico" className="mt-8 scroll-mt-24">
          <h3 className="text-lg font-bold mb-4" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Histórico de Pagamentos</h3>
          <div className="space-y-2">
            {pagamentos.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{p.plan || 'Assinatura'}</div>
                  <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: '#22C55E' }}>R$ {((p.amount || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Pago</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PIX */}
      <AnimatePresence>
        {modalPix && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl"
              style={{ background: '#0A0800', border: '1px solid rgba(212,175,55,0.2)',
                       boxShadow: '0 0 60px rgba(180,120,10,0.15)' }}>

              <div className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Pagar com PIX</div>
                  <div className="text-xs mt-0.5" style={{ color: '#666' }}>
                    Plano {modalPix.nome} · R$ {(anual ? modalPix.preco_ano : modalPix.preco_mes).toLocaleString('pt-BR')}
                  </div>
                </div>
                <button onClick={() => setModalPix(null)}
                  className="text-gray-600 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {paid ? (
                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Pagamento confirmado!</h3>
                    <p style={{ color: '#22C55E' }}>Bem-vindo ao Plano {modalPix.nome}!</p>
                    <p className="text-xs mt-2" style={{ color: '#555' }}>Recarregando...</p>
                  </div>
                ) : loadingPix ? (
                  <div className="text-center py-12">
                    <Loader2 size={40} color="#D4AF37" className="mx-auto mb-4 animate-spin" />
                    <p style={{ color: '#888' }}>Gerando QR Code PIX...</p>
                  </div>
                ) : (
                  <>
                    {/* QR Code */}
                    <div className="flex justify-center mb-4">
                      {qrCode && qrCode !== 'ERRO_AO_GERAR_PIX' ? (
                        <div className="p-3 rounded-xl" style={{ background: '#fff' }}>
                          <QRCode value={qrCode} size={180} fgColor="#000" bgColor="#fff" />
                        </div>
                      ) : (
                        <div className="w-48 h-48 rounded-xl flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <p className="text-xs text-center px-4" style={{ color: '#666' }}>
                            {qrCode === 'ERRO_AO_GERAR_PIX'
                              ? 'Erro ao gerar PIX. Tente novamente.'
                              : 'Aguardando QR Code...'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Countdown */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Clock size={14} color={countdown < 300 ? '#EF4444' : '#888'} />
                      <span className="text-sm font-mono"
                        style={{ color: countdown < 300 ? '#EF4444' : '#888' }}>
                        Expira em {formatTime(countdown)}
                      </span>
                    </div>

                    {/* Código copiável */}
                    {qrCode && qrCode !== 'ERRO_AO_GERAR_PIX' && (
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                          style={{ color: 'rgba(212,175,55,0.7)' }}>CÓDIGO PIX</label>
                        <div className="flex gap-2">
                          <div className="flex-1 px-3 py-2 rounded-xl text-xs truncate"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                     color: '#666' }}>
                            {qrCode.slice(0, 40)}...
                          </div>
                          <button onClick={copyPix}
                            className="px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 flex items-center gap-1"
                            style={{ background: copied ? '#22C55E' : 'rgba(212,175,55,0.15)',
                                     color: copied ? '#fff' : '#D4AF37',
                                     border: `1px solid ${copied ? '#22C55E' : 'rgba(212,175,55,0.3)'}` }}>
                            <Copy size={12} />
                            {copied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-center mt-4" style={{ color: '#444' }}>
                      Após o pagamento, seu plano será ativado automaticamente em segundos.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
