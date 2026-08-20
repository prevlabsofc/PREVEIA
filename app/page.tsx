'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Zap, Clock, Search, TrendingUp, FileText, Users, ArrowRight, Play, Scale, Target, Moon, Sun } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') { setDarkMode(false); return }
    if (saved === 'dark') { setDarkMode(true); return }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(prefersDark)
  }, [])
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  return (
    <div className="min-h-screen overflow-x-hidden relative" style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>

      {/* IMAGEM DE FUNDO */}
      <div className="fixed inset-0" style={{ zIndex: 0, backgroundColor: darkMode ? '#050505' : '#F8F8F8', backgroundImage: darkMode ? 'url(/paginainicial.png)' : 'url(/paginainicial2.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}/>
      <div className="fixed inset-0" style={{ zIndex: 1, background: darkMode ? 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.85) 70%, rgba(5,5,5,0.95) 100%)' : 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.55) 60%, rgba(255,255,255,0.75) 100%)' }}/>

      {/* HEADER */}
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4"
        style={{ background: darkMode ? 'rgba(5,5,5,0.5)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(28px) saturate(200%) brightness(1.05)', WebkitBackdropFilter: 'blur(28px) saturate(200%) brightness(1.05)', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)', boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)' }}>
        <span className="text-2xl tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}>
          <span style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>Mar</span><span style={{ color: '#D4AF37' }}>ple</span>
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setDarkMode(d => !d)} aria-label="Alternar tema" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
            style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)' }}>
            {darkMode ? <Moon size={17} color="#D4AF37"/> : <Sun size={17} color="#D4AF37"/>}
          </button>
          <Link href="/login" className="px-5 py-2.5 text-sm font-medium rounded-xl transition-all hover:bg-white/10"
            style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)', boxShadow: darkMode ? 'inset 0 1px 1px rgba(255,255,255,0.1)' : 'none', color: darkMode ? '#fff' : '#1E1E1E' }}>
            Entrar
          </Link>
          <Link href="/registro" className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all hover:scale-[1.03]"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}>
            Começar Agora
          </Link>
        </div>
      </motion.header>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex items-center px-10 pt-24">
        <div className="w-full max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl">

            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full mb-8 text-[11px] font-bold tracking-[0.2em]"
              style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
              <Scale size={12} color="#D4AF37"/>
              INTELIGÊNCIA ARTIFICIAL A SERVIÇO DO DIREITO
            </div>

            <h1 className="leading-[1.08] mb-7" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 'clamp(2.6rem,4.8vw,4.2rem)', letterSpacing: '-0.01em' }}>
              <span style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>Inteligência que</span><br/>
              <span style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>antecipa </span><span style={{ color: '#D4AF37' }}>decisões.</span><br/>
              <span style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>Resultados que</span><br/>
              <span style={{ color: '#D4AF37' }}>transformam.</span>
            </h1>

            <p className="text-gray-300 text-[17px] leading-relaxed mb-10 max-w-lg font-light" style={{ color: darkMode ? undefined : '#5E5E5E' }}>
              Marple utiliza IA avançada para analisar jurisprudências, prever cenários e otimizar sua atuação jurídica com precisão, agilidade e segurança.
            </p>

            <div className="flex items-center gap-4 mb-16">
              <Link href="/registro" className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-[15px] transition-all hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #F0D060)', color: '#000', boxShadow: '0 8px 30px rgba(212,175,55,0.4)' }}>
                Começar Agora <ArrowRight size={17}/>
              </Link>
              <button className="flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-[15px] transition-all hover:bg-white/10"
                style={{ background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)', boxShadow: darkMode ? 'inset 0 1px 1px rgba(255,255,255,0.1)' : 'none', color: darkMode ? '#fff' : '#1E1E1E' }}>
                Ver Demonstração <Play size={15}/>
              </button>
            </div>
          </motion.div>
        </div>
        <div className="absolute hidden lg:block" style={{ width: 380, height: 380, top: '50%', right: '6%', transform: 'translateY(-50%)' }}>
          <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
            <motion.div className="absolute" style={{ top: '0%', left: '50%', transform: 'translateX(-50%)' }} animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
              <GlassCard gold intensity={1.5} style={{ padding: 18, width: 170 }}>
                <div className="text-[11px] mb-1.5 font-medium" style={{ color: darkMode ? '#9ca3af' : '#5E5E5E' }}>Jurisprudências</div>
                <div className="text-2xl font-bold" style={{ color: '#D4AF37', fontFamily: "'Playfair Display', serif" }}>2.6M+</div>
              </GlassCard>
            </motion.div>
            <motion.div className="absolute" style={{ top: '75%', left: '5%' }} animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
              <GlassCard gold intensity={1.5} style={{ padding: 18, width: 160 }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target size={12} color="#D4AF37"/>
                  <span className="text-[11px] font-medium" style={{ color: darkMode ? '#9ca3af' : '#5E5E5E' }}>Precisão</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#D4AF37', fontFamily: "'Playfair Display', serif" }}>99%</div>
              </GlassCard>
            </motion.div>
            <motion.div className="absolute" style={{ top: '75%', right: '5%' }} animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
              <GlassCard gold intensity={1.5} style={{ padding: 18, width: 160 }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock size={12} color="#D4AF37"/>
                  <span className="text-[11px] font-medium" style={{ color: darkMode ? '#9ca3af' : '#5E5E5E' }}>Economia</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#D4AF37', fontFamily: "'Playfair Display', serif" }}>98h/mês</div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAIXA DE DESTAQUES */}
      <section className="px-10 pb-16 -mt-10 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-6xl mx-auto">
          <GlassCard intensity={0.8} style={{ padding: 36 }}>
            <div className="grid grid-cols-3 gap-16">
              {[
                { icon: Shield, t: 'Seguro e Confiável', d: 'Seus dados protegidos com criptografia de nível bancário.' },
                { icon: Zap, t: 'IA Avançada', d: 'Modelos treinados com milhões de decisões e leis atualizadas.' },
                { icon: Clock, t: 'Economize Tempo', d: 'Automatize pesquisas e análises e foque no que importa.' },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <Icon size={19} color="#D4AF37"/>
                  </div>
                  <div>
                    <div className="font-bold text-[15px] mb-1.5" style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>{t}</div>
                    <div className="text-[13px] text-gray-400 leading-relaxed" style={{ color: darkMode ? undefined : '#5E5E5E' }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* FUNCIONALIDADES — CARDS INTERATIVOS */}
      <section className="py-20 px-10 max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '2.4rem', color: darkMode ? '#fff' : '#1E1E1E' }}>
            Tudo que seu escritório <span style={{ color: '#D4AF37' }}>precisa</span>
          </h2>
          <p className="text-gray-400 font-light" style={{ color: darkMode ? undefined : '#5E5E5E' }}>Uma plataforma completa para advogados previdenciaristas</p>
        </motion.div>
        <div className="grid grid-cols-4 gap-5">
          {[
            { icon: Search, t: 'Pesquisa Inteligente', d: 'Encontre jurisprudências relevantes em segundos com IA.' },
            { icon: TrendingUp, t: 'Análise Preditiva', d: 'Antecipe decisões e aumente suas chances de sucesso.' },
            { icon: FileText, t: 'Peças Automáticas', d: 'Gere petições e documentos com inteligência e precisão.' },
            { icon: Users, t: 'Gestão Completa', d: 'Organize processos, clientes e tarefas em um só lugar.' },
          ].map(({ icon: Icon, t, d }, i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <GlassCard intensity={1.8} style={{ padding: 26, height: '100%' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.05))', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Icon size={22} color="#D4AF37"/>
                </div>
                <h3 className="font-bold mb-2.5 text-[16px]" style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>{t}</h3>
                <p className="text-[13px] text-gray-400 leading-relaxed" style={{ color: darkMode ? undefined : '#5E5E5E' }}>{d}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-10 text-center relative z-10" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="text-xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
          <span style={{ color: darkMode ? '#fff' : '#1E1E1E' }}>Mar</span><span style={{ color: '#D4AF37' }}>ple</span>
        </span>
        <p className="text-xs text-gray-500 mt-3">© 2026 Marple · Todos os direitos reservados</p>
      </footer>
    </div>
  )
}
