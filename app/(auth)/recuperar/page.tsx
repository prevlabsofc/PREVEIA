'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir`,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4" style={{ background: '#050505' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,175,55,0.1) 0%, transparent 65%)' }}/>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <GlassCard gold intensity={0.5} style={{ padding: 44, borderRadius: 28 }}>
          {sent ? (
            <div className="text-center">
              <CheckCircle size={48} color="#22C55E" className="mx-auto mb-4"/>
              <h1 className="text-xl font-bold text-white mb-2">Email enviado!</h1>
              <p className="text-sm text-gray-400 mb-6">Enviamos um link de recuperação para <strong className="text-white">{email}</strong>. Verifique sua caixa de entrada e spam.</p>
              <Link href="/login" className="text-sm" style={{ color: '#D4AF37' }}>← Voltar ao login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1 text-center">Recuperar senha</h1>
              <p className="text-center text-sm mb-8" style={{ color: '#777' }}>Digite seu email para receber o link de recuperação</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#bbb' }}>Email</label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#666' }}/>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className="input-glass w-full pl-12 pr-4 text-sm" style={{ height: 52 }}/>
                  </div>
                </div>
                {error && <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>}
                <button type="submit" disabled={loading} className="btn-gold w-full rounded-2xl font-bold text-sm flex items-center justify-center gap-2" style={{ height: 52 }}>
                  {loading ? <><Loader2 size={18} className="animate-spin"/> Enviando...</> : 'Enviar link de recuperação'}
                </button>
              </form>
              <Link href="/login" className="flex items-center justify-center gap-1 text-sm mt-6" style={{ color: '#777' }}>
                <ArrowLeft size={14}/> Voltar ao login
              </Link>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}