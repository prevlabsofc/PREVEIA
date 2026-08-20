'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { Shield, ArrowRight, LayoutDashboard } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { clearPanelPreference, setPanelPreference } from '@/lib/auth/panel-preference'
import { fetchOwnLawyerProfile } from '@/lib/auth/lawyer-profile'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function EscolhaPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data, error } = await fetchOwnLawyerProfile(supabase, user)
      if (error) console.error('lawyers query:', null, error)
      const profile = data as { name?: string; role?: string | null; is_super_admin?: boolean | null } | null
      // Só super admin fica em /escolha; demais (e falha de perfil) vão ao dashboard.
      if (!isSuperAdmin(profile)) { router.replace('/dashboard'); return }
      // ?reset=1 limpa preferência para poder escolher de novo (proxy libera /escolha).
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('reset')) {
        clearPanelPreference()
      }
      setName(profile?.name?.split(' ')[0] || 'Admin')
      setLoading(false)
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function entrarNoSistema() {
    // Flag lida pelo proxy: se algo mandar de volta a /escolha, reenvia a /dashboard.
    setPanelPreference('sistema')
    window.location.assign('/dashboard')
  }

  function entrarNoAdmin() {
    setPanelPreference('admin')
    window.location.assign('/admin')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: isLight ? '#F8F8F8' : '#050505' }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4" style={{ background: isLight ? '#F8F8F8' : '#050505' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(212,175,55,0.1) 0%, transparent 65%)' }}/>

      <div className="relative z-10 w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Marple" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
            </div>
            <span className="text-3xl font-black"><span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Mar</span><span className="text-gradient-gold">ple</span></span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Olá, <span className="text-gradient-gold">{name}</span> 👋</h1>
          <p style={{ color: isLight ? '#5E5E5E' : '#888' }}>Como você quer entrar hoje?</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard gold intensity={1.5} onClick={entrarNoAdmin} style={{ padding: 36, cursor: 'pointer', height: '100%', background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.08))', border: '1px solid rgba(168,85,247,0.4)' }}>
                <Shield size={30} color="#A855F7"/>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Painel Administrativo</h2>
              <p className="text-sm mb-6" style={{ color: isLight ? '#5E5E5E' : '#888' }}>Gerencie advogados, financeiro, API, suporte e configurações do sistema.</p>
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#A855F7' }}>
                Entrar como Admin <ArrowRight size={16}/>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard gold intensity={1.5} onClick={entrarNoSistema} style={{ padding: 36, cursor: 'pointer', height: '100%', background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))', border: '1px solid rgba(212,175,55,0.4)' }}>
                <LayoutDashboard size={30} color="#D4AF37"/>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Sistema</h2>
              <p className="text-sm mb-6" style={{ color: isLight ? '#5E5E5E' : '#888' }}>Acesse a plataforma como advogado: gerar petições, clientes, jurisprudência e IA.</p>
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#D4AF37' }}>
                Entrar no Sistema <ArrowRight size={16}/>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}