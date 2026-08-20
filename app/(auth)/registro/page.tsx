'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  User,
  Mail,
  CreditCard,
  Briefcase,
  MapPin,
  Lock,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

type ConviteStatus = 'nenhum' | 'verificando' | 'valido' | 'invalido'

export default function RegistroPage() {
  const router = useRouter()
  const [conviteCode, setConviteCode] = useState('')
  const [conviteStatus, setConviteStatus] = useState<ConviteStatus>('nenhum')
  const [escritorio, setEscritorio] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const c = params.get('convite')
    if (!c) return
    setConviteCode(c)
    setConviteStatus('verificando')
    fetch(`/api/validar-convite?codigo=${encodeURIComponent(c)}`)
      .then((r) => r.json())
      .then((d) => {
        setConviteStatus(d?.valido ? 'valido' : 'invalido')
        setEscritorio(d?.escritorio || null)
      })
      .catch(() => setConviteStatus('invalido'))
  }, [])
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [form, setForm] = useState({
    name: '',
    email: '',
    cpf: '',
    oab_number: '',
    oab_uf: 'SP',
    password: '',
    confirm: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accept, setAccept] = useState(false)

  const convidado = conviteStatus === 'valido'
  const verificandoConvite = conviteStatus === 'verificando'

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (!accept) {
      setError('Você precisa aceitar os termos.')
      return
    }
    setLoading(true)
    const { data, error: signErr } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    })
    if (signErr) {
      setError(signErr.message)
      setLoading(false)
      return
    }
    if (data.user) {
      let officeId = data.user.id
      let officeRole = 'owner'
      if (conviteCode && conviteStatus === 'valido') {
        const { data: invite } = await supabase
          .from('office_invites')
          .select('*')
          .eq('code', conviteCode)
          .eq('used', false)
          .single()
        if (invite) {
          officeId = invite.office_id
          officeRole = 'member'
          await supabase.from('office_invites').update({ used: true }).eq('id', invite.id)
        }
      }
      await supabase.from('lawyers').insert({
        id: data.user.id,
        name: form.name,
        email: form.email.trim(),
        cpf: form.cpf,
        oab_number: form.oab_number,
        oab_uf: form.oab_uf,
        plan: 'trial',
        role: 'lawyer',
        trial_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        docs_limit: 5,
        docs_trial_used: 0,
        onboarding_done: false,
        office_id: officeId,
        office_role: officeRole,
      })

      // Enviar email de boas-vindas
      fetch('/api/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: form.email.trim(),
          name: form.name.split(' ')[0],
          convidado: officeRole === 'member',
          escritorio,
        }),
      }).catch(() => {}) // Não bloqueia o fluxo se falhar

      router.push('/onboarding')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-10"
      style={{ background: '#050505' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(212,175,55,0.1) 0%, transparent 65%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        <GlassCard gold intensity={0.4} style={{ padding: 40, borderRadius: 28 }}>
          {convidado && (
            <div
              className="mb-4 p-3.5 rounded-xl text-center"
              style={{
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.25)',
              }}
            >
              <div className="text-xs font-bold mb-1" style={{ color: '#D4AF37' }}>
                {escritorio
                  ? `🎉 Você foi convidado por ${escritorio}`
                  : '🎉 Você foi convidado por um escritório'}
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: '#bbb' }}>
                Sua conta já está incluída no plano do escritório — você não precisa contratar nada.
              </div>
            </div>
          )}
          {conviteStatus === 'invalido' && (
            <div
              className="mb-4 p-3.5 rounded-xl text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div className="text-xs font-bold mb-1" style={{ color: '#ddd' }}>
                Convite indisponível
              </div>
              <div className="text-[11px] leading-relaxed" style={{ color: '#888' }}>
                Este link de convite expirou ou já foi utilizado. Você ainda pode criar sua conta
                normalmente e começar pelo período de teste.
              </div>
            </div>
          )}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Marple" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
              </div>
              <span className="text-2xl font-black">
                <span className="text-white">Mar</span>
                <span className="text-gradient-gold">ple</span>
              </span>
            </div>
            <p
              className="text-[11px] tracking-[0.2em] font-bold"
              style={{ color: '#D4AF37' }}
            >
              INTELIGÊNCIA JURÍDICA PARA ADVOGADOS
            </p>
          </div>

          <h1 className="text-white text-xl font-bold text-center mb-1">
            {convidado ? (
              <>
                Complete seu <span className="text-gradient-gold">cadastro</span>
              </>
            ) : verificandoConvite ? (
              <>
                Crie sua <span className="text-gradient-gold">conta</span>
              </>
            ) : (
              <>
                Crie sua conta <span className="text-gradient-gold">gratuita</span>
              </>
            )}
          </h1>
          <p className="text-center text-sm mb-6" style={{ color: '#777' }}>
            {convidado
              ? escritorio
                ? `Conta inclusa no plano de ${escritorio} · Sem cartão`
                : 'Conta inclusa no plano do escritório · Sem cartão'
              : verificandoConvite
                ? 'Verificando seu convite...'
                : '7 dias grátis · 5 petições · Sem cartão'}
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                NOME COMPLETO
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                />
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Maria da Silva"
                  required
                  className="input-glass w-full pl-11 pr-4 text-sm"
                  style={{ height: 48 }} spellCheck={true} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                EMAIL
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="input-glass w-full pl-11 pr-4 text-sm"
                  style={{ height: 48 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                  CPF
                </label>
                <div className="relative">
                  <CreditCard
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: '#666' }}
                  />
                  <input
                    value={form.cpf}
                    onChange={(e) => set('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    required
                    className="input-glass w-full pl-11 pr-3 text-sm"
                    style={{ height: 48 }} spellCheck={true} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                  OAB Nº
                </label>
                <div className="relative">
                  <Briefcase
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: '#666' }}
                  />
                  <input
                    value={form.oab_number}
                    onChange={(e) => set('oab_number', e.target.value)}
                    placeholder="123456"
                    required
                    className="input-glass w-full pl-11 pr-3 text-sm"
                    style={{ height: 48 }} spellCheck={true} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                UF
              </label>
              <div className="relative">
                <MapPin
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                  style={{ color: '#666' }}
                />
                <select
                  value={form.oab_uf}
                  onChange={(e) => set('oab_uf', e.target.value)}
                  className="input-glass w-full pl-11 pr-4 text-sm appearance-none"
                  style={{ height: 48 }}
                >
                  {UFS.map((uf) => (
                    <option key={uf} value={uf} style={{ background: '#111' }}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                SENHA
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="input-glass w-full pl-11 pr-12 text-sm"
                  style={{ height: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>
                CONFIRMAR SENHA
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#666' }}
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                  placeholder="Repita a senha"
                  required
                  className="input-glass w-full pl-11 pr-4 text-sm"
                  style={{ height: 48 }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                style={{ accentColor: '#D4AF37' }}
              />
              <span className="text-xs" style={{ color: '#999' }}>
                Li e aceito os <Link href="/termos" target="_blank" className="font-semibold" style={{ color: '#D4AF37' }}>Termos de Uso</Link> e a{' '}
                <Link href="/privacidade" target="_blank" className="font-semibold" style={{ color: '#D4AF37' }}>Política de Privacidade</Link>.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || verificandoConvite}
              className="btn-gold w-full rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ height: 50 }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Criando conta...
                </>
              ) : convidado ? (
                'Entrar no escritório'
              ) : (
                'Criar conta grátis'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#555', fontSize: 12 }}>ou</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google OAuth: Client ID/Secret só no painel Supabase (Auth → Providers → Google). */}
          <GoogleSignInButton
            supabase={supabase}
            onError={setError}
            isLight={false}
            label="Entrar com Google"
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

          <p className="text-center text-sm mt-5" style={{ color: '#777' }}>
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold" style={{ color: '#D4AF37' }}>
              Entrar →
            </Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
