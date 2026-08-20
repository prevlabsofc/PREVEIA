'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { logAudit } from '@/lib/audit'
import { postLoginPath } from '@/lib/auth/super-admin'
import { clearPanelPreference } from '@/lib/auth/panel-preference'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // Erros retornados pelo redirect OAuth (provider desabilitado, acesso negado, etc.)
    const params = new URLSearchParams(window.location.search)
    const oauthErr = params.get('error_description') || params.get('error')
    if (oauthErr) {
      const decoded = decodeURIComponent(oauthErr.replace(/\+/g, ' '))
      setError(
        /provider|not enabled|unsupported/i.test(decoded)
          ? 'Login com Google ainda não está disponível. O administrador precisa configurar o provedor Google no painel do Supabase (Authentication → Providers → Google).'
          : decoded,
      )
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    console.log('Auth result:', { user: data?.user?.id, error: authErr?.message })
    if (authErr || !data?.user) {
      setError('Email ou senha incorretos. Verifique e tente novamente.')
      setLoading(false)
      return
    }
    const { data: lawyer, error: lawyerErr } = await supabase
      .from('lawyers')
      .select('role, is_super_admin, onboarding_done')
      .eq('id', data.user.id)
      .maybeSingle()
    console.log('Lawyer:', { role: lawyer?.role, onboarding: lawyer?.onboarding_done, id: data?.user?.id })
    if (lawyerErr) console.error('lawyers query:', null, lawyerErr)
    await logAudit('LOGIN', 'auth', { email: email.trim() })
    // Novo login: limpa preferência anterior para o seletor /escolha funcionar de novo.
    clearPanelPreference()
    // Super admin → /escolha. Demais (ou sem perfil) → /dashboard — nunca /admin.
    window.location.href = postLoginPath(lawyer)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: isLight ? '#F8F8F8' : '#050505' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,175,55,0.05) 0%, transparent 65%)'
            : 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,175,55,0.1) 0%, transparent 65%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <GlassCard gold intensity={0.6} style={{ padding: 44, borderRadius: 28, border: isLight ? '1px solid #EDEDED' : undefined }}>
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex items-center gap-2.5 mb-3"
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Marple" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
              </div>
              <span className="text-2xl font-black">
                <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Mar</span>
                <span className="text-gradient-gold">ple</span>
              </span>
            </motion.div>
            <p style={{ color: isLight ? '#5E5E5E' : '#999', fontSize: 13 }}>Inteligência Jurídica com IA</p>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Bem-vindo de volta</h1>
          <p className="text-center text-sm mb-8" style={{ color: isLight ? '#5E5E5E' : '#777' }}>
            Entre na sua conta para continuar
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: isLight ? '#5E5E5E' : '#bbb' }}>
                Email
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="input-glass w-full pl-12 pr-4 text-sm"
                  style={{ height: 52 }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium" style={{ color: isLight ? '#5E5E5E' : '#bbb' }}>
                  Senha
                </label>
                <a href="#" className="text-xs" style={{ color: '#D4AF37' }}>
                  Esqueci a senha
                </a>
              </div>
              <div className="relative">
                <Lock
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-glass w-full pl-12 pr-12 text-sm"
                  style={{ height: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ height: 52 }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Entrando...
                </>
              ) : (
                'Entrar na plataforma'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: isLight ? '#EDEDED' : 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: isLight ? '#888' : '#555', fontSize: 12 }}>ou</span>
            <div className="flex-1 h-px" style={{ background: isLight ? '#EDEDED' : 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google OAuth: Client ID/Secret só no painel Supabase (Auth → Providers → Google). */}
          <GoogleSignInButton
            supabase={supabase}
            onError={setError}
            isLight={isLight}
          />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl mt-4"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <AlertCircle size={16} color="#EF4444" />
                <span style={{ color: '#EF4444', fontSize: 13 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm mt-6" style={{ color: isLight ? '#5E5E5E' : '#777' }}>
            Não tem conta?{' '}
            <Link href="/registro" className="font-semibold" style={{ color: '#D4AF37' }}>
              Criar conta grátis →
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
