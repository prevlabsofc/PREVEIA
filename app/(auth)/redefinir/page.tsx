'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { Lock, Loader2, CheckCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function RedefinirPage() {
  const router = useRouter()
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    if (pwd.length < 8) { setMsg('A senha deve ter no mínimo 8 caracteres.'); return }
    if (pwd !== confirm) { setMsg('As senhas não coincidem.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) { setMsg('Erro: ' + error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4" style={{ background: '#050505' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,175,55,0.1) 0%, transparent 65%)' }}/>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <GlassCard gold intensity={0.5} style={{ padding: 44, borderRadius: 28 }}>
          {done ? (
            <div className="text-center">
              <CheckCircle size={48} color="#22C55E" className="mx-auto mb-4"/>
              <h1 className="text-xl font-bold text-white mb-2">Senha redefinida!</h1>
              <p className="text-sm text-gray-400">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1 text-center">Nova senha</h1>
              <p className="text-center text-sm mb-8" style={{ color: '#777' }}>Defina sua nova senha de acesso</p>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#bbb' }}>Nova senha</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#666' }}/>
                    <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Mínimo 8 caracteres" required className="input-glass w-full pl-12 pr-4 text-sm" style={{ height: 52 }}/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#bbb' }}>Confirmar senha</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#666' }}/>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required className="input-glass w-full pl-12 pr-4 text-sm" style={{ height: 52 }}/>
                  </div>
                </div>
                {msg && <p className="text-sm" style={{ color: '#EF4444' }}>{msg}</p>}
                <button type="submit" disabled={loading} className="btn-gold w-full rounded-2xl font-bold text-sm flex items-center justify-center gap-2" style={{ height: 52 }}>
                  {loading ? <><Loader2 size={18} className="animate-spin"/> Salvando...</> : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}