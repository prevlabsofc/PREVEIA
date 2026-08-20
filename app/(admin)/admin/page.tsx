'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Cpu,
  LifeBuoy,
  Settings,
  Lock,
  Key,
  Save,
  Loader2,
  TrendingUp,
  LogOut,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Bell,
  Mail,
  Menu,
  X,
  ArrowLeft,
  Moon,
  Sun,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { GlassCard } from '@/components/GlassCard'
import { ScrollFade } from '@/components/ScrollFade'
import { isSuperAdmin } from '@/lib/auth/super-admin'
import { fetchOwnLawyerProfile } from '@/lib/auth/lawyer-profile'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Lawyer {
  id: string
  name: string
  email: string
  oab_number: string
  oab_uf: string
  plan: string
  role: string
  is_super_admin?: boolean | null
  docs_trial_used: number
  created_at: string
  status?: string
}

export default function AdminPanel() {
  const router = useRouter()
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [allLawyers, setAllLawyers] = useState<Lawyer[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [perfilForm, setPerfilForm] = useState({ name: '', email: '' })
  const [savingPerfil, setSavingPerfil] = useState(false)
  const [savedPerfil, setSavedPerfil] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [tickets, setTickets] = useState<any[]>([])
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [adminReply, setAdminReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [totalDocs, setTotalDocs] = useState(0)
  const [docsHoje, setDocsHoje] = useState(0)
  const [docsSemana, setDocsSemana] = useState(0)
  const [docsMes, setDocsMes] = useState(0)
  const [cadastrosHoje, setCadastrosHoje] = useState(0)
  const [cadastrosSemana, setCadastrosSemana] = useState(0)
  const [cadastrosMes, setCadastrosMes] = useState(0)
  const [usuariosAtivos, setUsuariosAtivos] = useState(0)
  const [tokensCusto, setTokensCusto] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [periodoFin, setPeriodoFin] = useState<'dia' | 'semana' | 'mes' | 'ano'>('mes')
  const [receitaPeriodo, setReceitaPeriodo] = useState(0)
  const [totalLawyersReal, setTotalLawyersReal] = useState(0)
  const [searchUsers, setSearchUsers] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [docsPerUser, setDocsPerUser] = useState<Record<string, number>>({})
  const [usuariosInativos, setUsuariosInativos] = useState(0)
  const [planoMaisVendido, setPlanoMaisVendido] = useState('')
  const [receitaHoje, setReceitaHoje] = useState(0)
  const [gastoTotal, setGastoTotal] = useState(0)
  const [lucroTotal, setLucroTotal] = useState(0)
  const [allDocsAdmin, setAllDocsAdmin] = useState<any[]>([])
  const [alertas, setAlertas] = useState<string[]>([])
  const [periodoTabela, setPeriodoTabela] = useState<'dia' | 'semana' | 'mes' | 'ano' | 'todos'>('todos')
  const [menuOpen, setMenuOpen] = useState(false)
  const [newsletterSubs, setNewsletterSubs] = useState<any[]>([])
  const [newsletterEnvios, setNewsletterEnvios] = useState<any[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') { setDarkMode(false); return }
    if (saved === 'dark') { setDarkMode(true); return }
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
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

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      let user = session?.user ?? null

      if (!user) {
        const { data: { user: fetched } } = await supabase.auth.getUser()
        user = fetched
      }
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await fetchOwnLawyerProfile(supabase, user)
      if (error) console.error('lawyers query:', null, error)
      if (!isSuperAdmin(data as { role?: string | null; is_super_admin?: boolean | null } | null)) {
        router.replace('/dashboard')
        return
      }
      const profile = data as unknown as Lawyer
      setLawyer(profile)
      setPerfilForm({ name: profile.name || '', email: profile.email || '' })
      const { data: lawyersData, error: lawyersError } = await supabase.from('lawyers').select('*').order('created_at', { ascending: false })
      console.log('lawyers query:', lawyersData?.length, lawyersError)
      setAllLawyers((lawyersData as Lawyer[]) || [])

      const { count: totalLawyersCount } = await supabase.from('lawyers').select('*', { count: 'exact', head: true })

      const mrrInit = ((lawyersData as Lawyer[]) || []).reduce((sum, l) => {
        const prices: Record<string, number> = {
          starter: 97,
          plus: 197,
          premium: 397,
          enterprise: 797,
        }
        return sum + (prices[l.plan] || 0)
      }, 0)
      setReceitaPeriodo(mrrInit)

      // Métricas de documentos
      const agora = new Date()
      const hoje = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      hoje.setHours(0,0,0,0)
      const semana = new Date(); semana.setDate(semana.getDate() - 7)
      const mes = new Date(); mes.setDate(1); mes.setHours(0,0,0,0)

      const { count: totalDocsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true })
      const { count: docsHojeCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', hoje.toISOString())
      const { count: docsSemanaCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', semana.toISOString())
      const { count: docsMesCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', mes.toISOString())

      // Métricas de cadastros
      const { count: cadastrosHojeCount } = await supabase.from('lawyers').select('*', { count: 'exact', head: true }).gte('created_at', hoje.toISOString())
      const { count: cadastrosSemanaCount } = await supabase.from('lawyers').select('*', { count: 'exact', head: true }).gte('created_at', semana.toISOString())
      const { count: cadastrosMesCount } = await supabase.from('lawyers').select('*', { count: 'exact', head: true }).gte('created_at', mes.toISOString())

      // Usuários ativos (com docs no último mês)
      const { data: ativos } = await supabase.from('documents').select('lawyer_id').gte('created_at', mes.toISOString())
      const uniqueAtivos = new Set((ativos || []).map((d: any) => d.lawyer_id)).size

      const lawyersDataList = (lawyersData as Lawyer[]) || []

      // Docs por usuário
      const { data: allDocs } = await supabase.from('documents').select('lawyer_id')
      const docsMap: Record<string, number> = {}
      ;(allDocs || []).forEach((d: any) => { docsMap[d.lawyer_id] = (docsMap[d.lawyer_id] || 0) + 1 })
      setDocsPerUser(docsMap)

      // Inativos (sem docs no último mês)
      const inativos = lawyersDataList.filter((l: any) => !ativos?.find((a: any) => a.lawyer_id === l.id)).length
      setUsuariosInativos(inativos)

      // Plano mais vendido
      const planCount: Record<string, number> = {}
      lawyersDataList.forEach((l: any) => { if (l.plan && l.plan !== 'trial') planCount[l.plan] = (planCount[l.plan] || 0) + 1 })
      const top = Object.entries(planCount).sort((a: any, b: any) => b[1] - a[1])[0]
      setPlanoMaisVendido(top ? `${top[0]} (${top[1]} users)` : 'Nenhum')

      // Receita hoje
      const recHoje = lawyersDataList.filter((l: any) => new Date(l.created_at) >= hoje && l.plan !== 'trial')
        .reduce((s: number, l: any) => {
          const prices: Record<string, number> = { starter: 97, plus: 197, premium: 397, enterprise: 797 }
          return s + (prices[l.plan] || 0)
        }, 0)
      setReceitaHoje(recHoje)

      // Gastos e lucro
      const totalDocsAll = Object.values(docsMap).reduce((s, v) => s + v, 0)
      const gasto = parseFloat((totalDocsAll * 0.08 * 5.5).toFixed(2))
      setGastoTotal(gasto)
      setLucroTotal(parseFloat((mrrInit - gasto).toFixed(2)))

      setTotalDocs(totalDocsCount || 0)
      setDocsHoje(docsHojeCount || 0)
      setDocsSemana(docsSemanaCount || 0)
      setDocsMes(docsMesCount || 0)
      setCadastrosHoje(cadastrosHojeCount || 0)
      setCadastrosSemana(cadastrosSemanaCount || 0)
      setCadastrosMes(cadastrosMesCount || 0)
      setUsuariosAtivos(uniqueAtivos)
      setTokensCusto(parseFloat(((totalDocsCount || 0) * 0.015).toFixed(2)))
      setTotalLawyersReal(totalLawyersCount || 0)
      setLastUpdate(new Date())

      const { data: allDocsData } = await supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(100)
      setAllDocsAdmin(allDocsData || [])

      // Gerar alertas automáticos
      const trialLawyersInit = lawyersDataList.filter((l) => l.plan === 'trial').length
      const paidLawyersInit = lawyersDataList.filter((l) => l.plan !== 'trial').length
      const tokensCustoInit = parseFloat(((totalDocsCount || 0) * 0.015).toFixed(2))
      const alertasList: string[] = []
      if (cadastrosHojeCount === 0) alertasList.push('⚠️ Nenhum novo cadastro hoje')
      if (docsHojeCount === 0) alertasList.push('⚠️ Nenhum documento gerado hoje')
      if (mrrInit === 0) alertasList.push('🚨 MRR zerado — verifique os pagamentos')
      if (trialLawyersInit > paidLawyersInit * 2) alertasList.push('📊 Muitos usuários em trial — considere uma campanha de conversão')
      if (tokensCustoInit > mrrInit * 0.3) alertasList.push('💸 Custo de API acima de 30% da receita')
      setAlertas(alertasList)

      const { data: tData } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false })
      setTickets(tData || [])

      const [{ data: subsData }, { data: enviosData }] = await Promise.all([
        supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('newsletter_envios').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      setNewsletterSubs(subsData || [])
      setNewsletterEnvios(enviosData || [])

      const { data: logsData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      setLogs(logsData || [])
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const mrrVal = allLawyers.reduce((sum, l) => {
      const prices: Record<string, number> = {
        starter: 97,
        plus: 197,
        premium: 397,
        enterprise: 797,
      }
      return sum + (prices[l.plan] || 0)
    }, 0)
    if (periodoFin === 'mes') setReceitaPeriodo(mrrVal)
    else if (periodoFin === 'ano') setReceitaPeriodo(mrrVal * 12)
    else if (periodoFin === 'semana') setReceitaPeriodo(Math.round(mrrVal / 4))
    else if (periodoFin === 'dia') setReceitaPeriodo(Math.round(mrrVal / 30))
  }, [periodoFin, allLawyers])

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: isLight ? '#F8F8F8' : '#0A0A0A' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
        />
      </div>
    )

  const sidebarSections = [
    {
      title: 'PAINEL',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'advogados', label: 'Advogados', icon: Users },
        { id: 'documentos_admin', label: 'Documentos', icon: FileText },
      ],
    },
    {
      title: 'FINANCEIRO',
      items: [
        { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
        { id: 'assinaturas', label: 'Assinaturas', icon: CreditCard },
      ],
    },
    {
      title: 'COMUNICAÇÃO',
      items: [
        { id: 'newsletter', label: 'Newsletters', icon: Mail },
        { id: 'suporte', label: 'Suporte', icon: LifeBuoy },
        { id: 'alertas', label: 'Alertas', icon: Bell },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        { id: 'api', label: 'API Claude', icon: Cpu },
        { id: 'sistema', label: 'Sistema', icon: Settings },
        { id: 'configuracao', label: 'Configuração', icon: Settings },
        { id: 'logs', label: 'Logs', icon: FileText },
      ],
    },
  ]

  const tabLabel =
    sidebarSections.flatMap((s) => s.items).find((i) => i.id === tab)?.label || 'Dashboard'

  const totalLawyers = allLawyers.length
  const paidLawyers = allLawyers.filter((l) => l.plan !== 'trial').length
  const trialLawyers = allLawyers.filter((l) => l.plan === 'trial').length
  const mrr = allLawyers.reduce((sum, l) => {
    const prices: Record<string, number> = {
      starter: 97,
      plus: 197,
      premium: 397,
      enterprise: 797,
    }
    return sum + (prices[l.plan] || 0)
  }, 0)

  const mrrData = (() => {
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const anoAtual = new Date().getFullYear()
    return meses.map((mes, i) => {
      const planPrices: Record<string, number> = { starter: 97, plus: 197, premium: 397, enterprise: 797 }
      const receita = allLawyers.filter(l => {
        const d = new Date(l.created_at)
        return d.getFullYear() === anoAtual && d.getMonth() === i && l.plan !== 'trial'
      }).reduce((s, l) => s + (planPrices[l.plan] || 0), 0)
      return { mes, receita }
    })
  })()

  const filtered = allLawyers.filter(
    (l) =>
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase())
  )
  const planColors: Record<string, string> = {
    trial: '#EAB308',
    starter: '#888',
    plus: '#3B82F6',
    premium: '#D4AF37',
    enterprise: '#A855F7',
  }

  const filteredUsers = allLawyers
    .filter(l => {
      const matchSearch = !searchUsers || l.name?.toLowerCase().includes(searchUsers.toLowerCase()) || l.email?.toLowerCase().includes(searchUsers.toLowerCase())
      if (!matchSearch) return false
      if (periodoTabela === 'todos') return true
      const data = new Date(l.created_at)
      const agora = new Date()
      if (periodoTabela === 'dia') {
        const hoje = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
        hoje.setHours(0,0,0,0)
        return data >= hoje
      }
      if (periodoTabela === 'semana') {
        const semana = new Date(); semana.setDate(semana.getDate() - 7)
        return data >= semana
      }
      if (periodoTabela === 'mes') {
        const mes = new Date(); mes.setDate(1); mes.setHours(0,0,0,0)
        return data >= mes
      }
      if (periodoTabela === 'ano') {
        const ano = new Date(agora.getFullYear(), 0, 1)
        return data >= ano
      }
      return true
    })
    .sort((a: any, b: any) => {
      const va = a[sortField] || ''
      const vb = b[sortField] || ''
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })

  const filteredDocs = allDocsAdmin.filter(d => {
    if (periodoTabela === 'todos') return true
    const data = new Date(d.created_at)
    const agora = new Date()
    if (periodoTabela === 'dia') { const h = new Date(); h.setHours(0,0,0,0); return data >= h }
    if (periodoTabela === 'semana') { const s = new Date(); s.setDate(s.getDate()-7); return data >= s }
    if (periodoTabela === 'mes') { const m = new Date(); m.setDate(1); m.setHours(0,0,0,0); return data >= m }
    if (periodoTabela === 'ano') { const a = new Date(agora.getFullYear(),0,1); return data >= a }
    return true
  })

  async function alterarStatusAdvogado(id: string, novoStatus: 'active' | 'suspended') {
    await supabase.from('lawyers').update({ status: novoStatus }).eq('id', id)
    setAllLawyers(prev => prev.map(l => l.id === id ? { ...l, status: novoStatus } : l))
  }

  async function alterarPlanoAdvogado(id: string, novoPlano: string) {
    const docsLimits: Record<string, number> = { trial: 5, starter: 100, plus: 200, premium: 500, enterprise: 999999 }
    await supabase.from('lawyers').update({ plan: novoPlano, docs_limit: docsLimits[novoPlano] || 100 }).eq('id', id)
    setAllLawyers(prev => prev.map(l => l.id === id ? { ...l, plan: novoPlano } : l))
  }

  async function responderTicket(id: string) {
    if (!adminReply.trim()) return
    setSendingReply(true)
    await supabase.from('support_tickets').update({ admin_reply: adminReply, status: 'closed', updated_at: new Date().toISOString() }).eq('id', id)
    // Notificar advogado por email
    if (selectedTicket?.lawyer_email) {
      fetch('/api/enviar-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedTicket.lawyer_email,
          name: selectedTicket.lawyer_name?.split(' ')[0] || 'Advogado',
          subject: 'Seu ticket foi respondido — Marple',
          html: `
            <div style="font-family: Georgia, serif; background: #0A0A0A; color: #fff; padding: 40px 20px;">
              <div style="max-width: 560px; margin: 0 auto;">
                <h1 style="font-size: 24px;"><span style="color:#fff">Mar</span><span style="color:#D4AF37">ple</span></h1>
                <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; padding: 28px; margin-top: 20px;">
                  <h2 style="color:#D4AF37; margin:0 0 12px;">Seu chamado foi respondido! ✅</h2>
                  <p style="color:#ccc;">Título: <strong style="color:#fff">${selectedTicket.title}</strong></p>
                  <div style="background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.2); border-radius:12px; padding:16px; margin:16px 0;">
                    <p style="color:#D4AF37; font-size:12px; margin:0 0 8px;">RESPOSTA DO SUPORTE:</p>
                    <p style="color:#ccc; margin:0;">${adminReply}</p>
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/suporte" style="display:inline-block; background:linear-gradient(135deg,#D4AF37,#F0D060); color:#000; font-weight:bold; padding:12px 24px; border-radius:10px; text-decoration:none; margin-top:8px;">Ver no Marple →</a>
                </div>
                <p style="color:#555; font-size:11px; text-align:center; margin-top:20px;">© 2026 Marple · Suporte</p>
              </div>
            </div>
          `
        }),
      }).catch(() => {})
    }
    setTickets(prev => prev.map(t => t.id === id ? { ...t, admin_reply: adminReply, status: 'closed' } : t))
    setSelectedTicket(null)
    setAdminReply('')
    setSendingReply(false)
  }

  async function mudarStatus(id: string, status: string) {
    await supabase.from('support_tickets').update({ status }).eq('id', id)
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  async function salvarPerfilAdmin() {
    if (!lawyer) return
    setSavingPerfil(true)
    await supabase.from('lawyers').update({ name: perfilForm.name }).eq('id', lawyer.id)
    setSavingPerfil(false)
    setSavedPerfil(true)
    setTimeout(() => setSavedPerfil(false), 2000)
  }

  async function trocarSenhaAdmin() {
    setPwdMsg('')
    if (!currentPwd) { setPwdMsg('Digite sua senha atual.'); return }
    if (newPwd.length < 8) { setPwdMsg('A nova senha deve ter no mínimo 8 caracteres.'); return }
    if (newPwd !== confirmPwd) { setPwdMsg('As senhas novas não coincidem.'); return }
    if (!lawyer) return
    const { error: signErr } = await supabase.auth.signInWithPassword({ email: lawyer.email, password: currentPwd })
    if (signErr) { setPwdMsg('Senha atual incorreta.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) { setPwdMsg('Erro: ' + error.message); return }
    setPwdMsg('Senha alterada com sucesso!')
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
  }

  return (
    <div className="flex min-h-screen admin-theme-root" style={{ background: isLight ? '#F8F8F8' : '#0A0A0A' }}>
      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{
          width: 240,
          background: isLight ? '#FFFFFF' : '#111',
          borderRight: isLight ? '1px solid #EDEDED' : '1px solid #1A1A1A',
          margin: '0.75rem',
          borderRadius: 24,
          bottom: '0.75rem',
          height: 'calc(100vh - 1.5rem)',
        }}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div
            style={{
              borderRadius: 10,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              background: 'rgba(212,175,55,0.1)',
            }}
          >
            <Image src="/logo.png" alt="Marple" width={40} height={40} className="object-contain" />
          </div>
          <div>
            <div className="font-black text-lg leading-none">
              <span className="text-white">Mar</span>
              <span className="text-gradient-gold">ple</span>
            </div>
            <div className="text-[7px] tracking-[0.25em] text-gray-500 mt-0.5">PAINEL ADMIN</div>
          </div>
          <button
            className="lg:hidden ml-auto"
            onClick={() => setMenuOpen(false)}
            style={{ color: '#666' }}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 min-h-0">
          <ScrollFade className="px-3 h-full scroll-area-sm" wrapperClassName="h-full">
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-5">
              <div className="px-3 mb-2 text-[9px] font-bold tracking-[0.2em]" style={{ color: '#555' }}>
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = tab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id)
                        setMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left"
                      style={{
                        background: active
                          ? 'linear-gradient(to right, rgba(212,175,55,0.12), transparent)'
                          : 'transparent',
                        color: active ? '#D4AF37' : '#666',
                        border: 'none',
                      }}
                    >
                      <Icon size={17} /> {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          </ScrollFade>
        </nav>

        <div className="px-3 pb-3 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-[rgba(212,175,55,0.06)]"
            style={{ color: '#888', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </Link>
          <div
            className="p-2.5 rounded-2xl flex items-center gap-2.5"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}
            >
              {lawyer?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{lawyer?.name}</div>
              <div className="text-[9px] truncate" style={{ color: '#A855F7' }}>Super Admin</div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              style={{ color: '#666' }}
              aria-label="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* MAIN */}
      <div className="flex-1 min-w-0 lg:ml-[264px]">
        {/* HEADER */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-8 py-4"
          style={{
            background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(15,13,8,0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.12)',
          }}
        >
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl"
            onClick={() => setMenuOpen(true)}
            style={{
              background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
              border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.1)',
              color: isLight ? '#1E1E1E' : '#fff',
            }}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white leading-none">{tabLabel}</h2>
            <p className="text-[10px] mt-1" style={{ color: isLight ? '#6B7280' : '#666' }}>
              Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="Alternar tema"
              onClick={() => setDarkMode((d) => !d)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
              style={{
                color: isLight ? '#2C2C2C' : '#999',
                background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {isLight ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span
              className="text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}
            >
              SUPER ADMIN
            </span>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: 'Total Advogados',
                  value: totalLawyersReal,
                  icon: Users,
                  color: '#D4AF37',
                },
                {
                  label: 'Assinantes Pagos',
                  value: paidLawyers,
                  icon: CheckCircle,
                  color: '#22C55E',
                },
                {
                  label: 'Em Trial',
                  value: trialLawyers,
                  icon: AlertCircle,
                  color: '#EAB308',
                },
                {
                  label: 'MRR',
                  value: `R$ ${mrr.toLocaleString('pt-BR')}`,
                  icon: DollarSign,
                  color: '#A855F7',
                },
              ].map((s, i) => {
                const Icon = s.icon
                return (
                  <GlassCard key={i} intensity={1.2} style={{ padding: 20 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl font-black text-white">{s.value}</div>
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: `${s.color}1A`,
                          border: `1px solid ${s.color}33`,
                        }}
                      >
                        <Icon size={18} color={s.color} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </GlassCard>
                )
              })}
            </div>

            {/* CARDS COMPLETOS */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: '💰 Receita Total (MRR)', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#22C55E' },
                { label: '💸 Gastos API (est.)', value: `R$ ${gastoTotal.toFixed(2)}`, color: '#EF4444' },
                { label: '📈 Lucro Bruto', value: `R$ ${lucroTotal.toFixed(2)}`, color: '#D4AF37' },
                { label: '📅 Receita Hoje', value: `R$ ${receitaHoje}`, color: '#3B82F6' },
                { label: '👥 Total Usuários', value: totalLawyersReal, color: '#A855F7' },
                { label: '✅ Usuários Ativos', value: usuariosAtivos, color: '#22C55E' },
                { label: '❌ Usuários Inativos', value: usuariosInativos, color: '#EF4444' },
                { label: '📦 Plano Top', value: planoMaisVendido, color: '#F59E0B' },
                { label: '📄 Total Docs', value: totalDocs, color: '#D4AF37' },
                { label: '📄 Docs Hoje', value: docsHoje, color: '#22C55E' },
                { label: '📄 Docs Este Mês', value: docsMes, color: '#3B82F6' },
                { label: '📊 Conversão', value: `${totalLawyersReal > 0 ? Math.round((paidLawyers/totalLawyersReal)*100) : 0}%`, color: '#A855F7' },
              ].map(({ label, value, color }) => (
                <GlassCard key={label} intensity={0.8} style={{ padding: 16 }}>
                  <div className="text-xl font-black mb-1" style={{ color }}>{value}</div>
                  <div className="text-[10px] text-gray-500">{label}</div>
                </GlassCard>
              ))}
            </div>

            {/* MÉTRICAS EM TEMPO REAL */}
            <div className="flex items-center justify-between mb-3 mt-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }}/>
                Métricas em Tempo Real
              </h3>
              <span className="text-[10px] text-gray-500">Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <GlassCard intensity={0.8} style={{ padding: 20 }}>
                <div className="text-xs font-bold mb-3" style={{ color: '#D4AF37' }}>📄 DOCUMENTOS GERADOS</div>
                <div className="space-y-2">
                  {[
                    { label: 'Hoje', value: docsHoje, color: '#22C55E' },
                    { label: 'Esta semana', value: docsSemana, color: '#3B82F6' },
                    { label: 'Este mês', value: docsMes, color: '#A855F7' },
                    { label: 'Total', value: totalDocs, color: '#D4AF37' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard intensity={0.8} style={{ padding: 20 }}>
                <div className="text-xs font-bold mb-3" style={{ color: '#3B82F6' }}>👥 CADASTROS</div>
                <div className="space-y-2">
                  {[
                    { label: 'Hoje', value: cadastrosHoje, color: '#22C55E' },
                    { label: 'Esta semana', value: cadastrosSemana, color: '#3B82F6' },
                    { label: 'Este mês', value: cadastrosMes, color: '#A855F7' },
                    { label: 'Total', value: totalLawyersReal, color: '#D4AF37' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard intensity={0.8} style={{ padding: 20 }}>
                <div className="text-xs font-bold mb-3" style={{ color: '#22C55E' }}>💰 FINANCEIRO & CUSTOS</div>
                <div className="space-y-2">
                  {[
                    { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#22C55E' },
                    { label: 'ARR', value: `R$ ${(mrr * 12).toLocaleString('pt-BR')}`, color: '#D4AF37' },
                    { label: 'Usuários ativos', value: usuariosAtivos, color: '#3B82F6' },
                    { label: 'Custo API (est.)', value: `$${tokensCusto}`, color: '#F59E0B' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* CONVERSÃO */}
            <GlassCard gold intensity={0.4} style={{ padding: 20 }}>
              <div className="text-xs font-bold mb-3" style={{ color: '#D4AF37' }}>📊 FUNIL DE CONVERSÃO</div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Cadastros', value: totalLawyersReal, color: '#3B82F6' },
                  { label: 'Em Trial', value: trialLawyers, color: '#EAB308' },
                  { label: 'Pagantes', value: paidLawyers, color: '#22C55E' },
                  { label: 'Taxa conv.', value: totalLawyersReal > 0 ? `${Math.round((paidLawyers/totalLawyersReal)*100)}%` : '0%', color: '#D4AF37' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
                    <div className="text-[10px] text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard intensity={0.3} style={{ padding: 24 }}>
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={18} color="#D4AF37" /> Receita Mensal (MRR)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={mrrData}>
                  <XAxis
                    dataKey="mes"
                    stroke="#555"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,18,10,0.95)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: 12,
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#D4AF37"
                    strokeWidth={3}
                    dot={{ fill: '#D4AF37', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        )}

        {/* ADVOGADOS */}
        {tab === 'advogados' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
                <input value={searchUsers} onChange={e => setSearchUsers(e.target.value)}
                  placeholder="Buscar por nome ou email..." className="input-glass w-full pl-9 pr-4 text-sm" style={{ height: 40 }} spellCheck={true} />
              </div>
              <select value={periodoTabela} onChange={e => setPeriodoTabela(e.target.value as 'dia' | 'semana' | 'mes' | 'ano' | 'todos')} className="input-glass px-3 text-xs" style={{ height: 40 }}>
                <option value="todos">Todos os períodos</option>
                <option value="dia">Hoje</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mês</option>
                <option value="ano">Este ano</option>
              </select>
              <select value={sortField} onChange={e => setSortField(e.target.value)} className="input-glass px-3 text-xs" style={{ height: 40 }}>
                <option value="created_at">Data cadastro</option>
                <option value="name">Nome</option>
                <option value="plan">Plano</option>
                <option value="docs_trial_used">Docs usados</option>
              </select>
              <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="px-3 py-2 rounded-lg text-xs" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                {sortDir === 'asc' ? '↑' : '↓'}
              </button>
              <button onClick={() => {
                const dados = filteredUsers.map(l => ({
                  Nome: l.name, Email: l.email, Plano: l.plan,
                  Docs: docsPerUser[l.id] || 0,
                  Cadastro: new Date(l.created_at).toLocaleDateString('pt-BR'),
                  Status: l.status || 'active'
                }))
                const ws = XLSX.utils.json_to_sheet(dados)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Advogados')
                XLSX.writeFile(wb, 'advogados-marple.xlsx')
              }} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                📊 Excel
              </button>
            </div>

            <GlassCard intensity={0.2} style={{ padding: 0, overflow: 'hidden' }}>
              <ScrollFade orientation="horizontal" fadeSize={40}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Nome', 'Email', 'Plano', 'Docs', 'Custo API', 'Receita', 'Lucro', 'Cadastro', 'Status', 'Ações'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold whitespace-nowrap" style={{ color: '#888' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(l => {
                      const planPrices: Record<string, number> = { trial: 0, starter: 97, plus: 197, premium: 397, enterprise: 797 }
                      const docs = docsPerUser[l.id] || 0
                      const custoApi = parseFloat((docs * 0.44).toFixed(2))
                      const receita = planPrices[l.plan] || 0
                      const lucro = receita - custoApi
                      return (
                        <tr key={l.id} className="transition-all duration-200 hover:bg-[rgba(212,175,55,0.05)] hover:[box-shadow:inset_3px_0_0_rgba(212,175,55,0.5)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-4 py-3 text-white text-xs font-medium whitespace-nowrap">{l.name}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{l.email}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: `${planColors[l.plan] || '#888'}18`, color: planColors[l.plan] || '#888' }}>
                              {l.plan?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white text-xs font-bold">{docs}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#F59E0B' }}>R$ {custoApi}</td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: '#22C55E' }}>R$ {receita}</td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: lucro >= 0 ? '#22C55E' : '#EF4444' }}>R$ {lucro.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3">
                            <select value={l.status || 'active'} onChange={e => alterarStatusAdvogado(l.id, e.target.value as 'active' | 'suspended')}
                              className="text-[10px] px-2 py-1 rounded-lg" style={{ background: '#1A1A1A', color: l.status === 'suspended' ? '#EF4444' : '#22C55E', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <option value="active">Ativo</option>
                              <option value="suspended">Suspenso</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select value={l.plan} onChange={e => alterarPlanoAdvogado(l.id, e.target.value)}
                              className="text-[10px] px-2 py-1 rounded-lg" style={{ background: '#1A1A1A', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {['trial','starter','plus','premium','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </ScrollFade>
            </GlassCard>
            <div className="text-xs text-gray-500">{filteredUsers.length} advogados encontrados</div>
          </motion.div>
        )}

        {/* FINANCEIRO */}
        {tab === 'financeiro' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* HEADER COM LOGO E FILTRO */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Marple" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                </div>
                <div>
                  <div className="font-bold text-white">Financeiro Marple</div>
                  <div className="text-[10px] text-gray-500">Dados em tempo real</div>
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['dia', 'semana', 'mes', 'ano'] as const).map(p => (
                  <button key={p} onClick={() => setPeriodoFin(p)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={{ background: periodoFin === p ? 'rgba(212,175,55,0.15)' : 'transparent', color: periodoFin === p ? '#D4AF37' : '#666', border: periodoFin === p ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
                    {p === 'dia' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Ano'}
                  </button>
                ))}
              </div>
            </div>

            {/* KPIs PRINCIPAIS */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Receita (período)', value: `R$ ${receitaPeriodo.toLocaleString('pt-BR')}`, color: '#22C55E', sub: periodoFin },
                { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#D4AF37', sub: 'mensal recorrente' },
                { label: 'ARR', value: `R$ ${(mrr * 12).toLocaleString('pt-BR')}`, color: '#3B82F6', sub: 'anual projetado' },
                { label: 'Custo API Claude', value: `$${tokensCusto}`, color: '#F59E0B', sub: `~R$ ${(tokensCusto * 5.5).toFixed(2)}` },
              ].map(({ label, value, color, sub }) => (
                <GlassCard key={label} intensity={1} style={{ padding: 20 }}>
                  <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>
                </GlassCard>
              ))}
            </div>

            {/* LUCRO E CUSTO POR PLANO */}
            <GlassCard intensity={0.4} style={{ padding: 24 }}>
              <h3 className="font-bold text-white mb-4">💰 Análise por Plano — Receita × Custo × Lucro</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Plano', 'Preço/mês', 'Usuários', 'Receita', 'Custo API (est.)', 'Custo Infra (est.)', 'Lucro', 'Margem'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-bold" style={{ color: '#888' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { plano: 'Starter', preco: 97, cor: '#888' },
                    { plano: 'Plus', preco: 197, cor: '#3B82F6' },
                    { plano: 'Premium', preco: 397, cor: '#D4AF37' },
                    { plano: 'Enterprise', preco: 797, cor: '#A855F7' },
                  ].map(({ plano, preco, cor }) => {
                    const usuarios = allLawyers.filter(l => l.plan === plano.toLowerCase()).length
                    const receita = usuarios * preco
                    const custoApi = usuarios * 0.08 * 5.5
                    const custoInfra = usuarios * 2.5
                    const lucro = receita - custoApi - custoInfra
                    const margem = receita > 0 ? Math.round((lucro / receita) * 100) : 0
                    return (
                      <tr key={plano} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: `${cor}18`, color: cor }}>{plano}</span></td>
                        <td className="px-3 py-3 text-gray-300 text-xs">R$ {preco}</td>
                        <td className="px-3 py-3 text-white text-xs font-bold">{usuarios}</td>
                        <td className="px-3 py-3 text-xs font-bold" style={{ color: '#22C55E' }}>R$ {receita.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: '#F59E0B' }}>R$ {custoApi.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs" style={{ color: '#EF4444' }}>R$ {custoInfra.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs font-bold" style={{ color: lucro > 0 ? '#22C55E' : '#EF4444' }}>R$ {lucro.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs font-bold" style={{ color: margem > 70 ? '#22C55E' : margem > 40 ? '#F59E0B' : '#EF4444' }}>{margem}%</td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: '2px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.05)' }}>
                    <td className="px-3 py-3 text-xs font-black" style={{ color: '#D4AF37' }}>TOTAL</td>
                    <td className="px-3 py-3"/>
                    <td className="px-3 py-3 text-white text-xs font-black">{paidLawyers}</td>
                    <td className="px-3 py-3 text-xs font-black" style={{ color: '#22C55E' }}>R$ {mrr.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3 text-xs font-black" style={{ color: '#F59E0B' }}>R$ {(paidLawyers * 0.44).toFixed(2)}</td>
                    <td className="px-3 py-3 text-xs font-black" style={{ color: '#EF4444' }}>R$ {(paidLawyers * 2.5).toFixed(2)}</td>
                    <td className="px-3 py-3 text-xs font-black" style={{ color: '#22C55E' }}>R$ {(mrr - paidLawyers * 0.44 - paidLawyers * 2.5).toFixed(2)}</td>
                    <td className="px-3 py-3 text-xs font-black" style={{ color: '#22C55E' }}>{mrr > 0 ? Math.round(((mrr - paidLawyers * 2.94) / mrr) * 100) : 0}%</td>
                  </tr>
                </tbody>
              </table>
            </GlassCard>

            <GlassCard intensity={0.3} style={{ padding: 24 }}>
              <h3 className="font-bold text-white mb-4">Distribuição por Plano</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={[
                    {
                      plano: 'Starter',
                      qtd: allLawyers.filter((l) => l.plan === 'starter').length,
                    },
                    {
                      plano: 'Plus',
                      qtd: allLawyers.filter((l) => l.plan === 'plus').length,
                    },
                    {
                      plano: 'Premium',
                      qtd: allLawyers.filter((l) => l.plan === 'premium').length,
                    },
                    {
                      plano: 'Enterprise',
                      qtd: allLawyers.filter((l) => l.plan === 'enterprise').length,
                    },
                  ]}
                >
                  <XAxis
                    dataKey="plano"
                    stroke="#555"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,18,10,0.95)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="qtd" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        )}

        {/* API CLAUDE */}
        {tab === 'api' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard gold intensity={0.5} style={{ padding: 20, marginBottom: 16 }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white mb-1">💳 Créditos Anthropic</div>
                  <div className="text-xs text-gray-400">Verifique seu saldo e uso de créditos no console oficial</div>
                </div>
                <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
                  className="btn-gold px-4 py-2 rounded-xl text-sm font-bold">
                  Ver Saldo →
                </a>
              </div>
              <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-xs text-gray-400 mb-1">Custo estimado até agora:</div>
                <div className="text-xl font-black" style={{ color: '#F59E0B' }}>${tokensCusto} USD</div>
                <div className="text-[10px] text-gray-500">≈ R$ {(tokensCusto * 5.5).toFixed(2)} · Baseado em {totalDocs} documentos gerados</div>
              </div>
            </GlassCard>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Requisições (mês)', value: '12.4k', color: '#D4AF37' },
                { label: 'Tokens Usados', value: '8.2M', color: '#A855F7' },
                { label: 'Custo Estimado', value: 'R$ 340', color: '#22C55E' },
              ].map((s, i) => (
                <GlassCard key={i} intensity={0.8} style={{ padding: 24 }}>
                  <div className="text-2xl font-black text-white mb-1">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </GlassCard>
              ))}
            </div>
            <GlassCard intensity={0.3} style={{ padding: 24 }}>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={18} color="#D4AF37" />
                <h3 className="font-bold text-white">Status da API</h3>
              </div>
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}
              >
                <CheckCircle size={16} color="#22C55E" />
                <span className="text-sm text-white">
                  API Claude operacional — modelo claude-sonnet-4-6
                </span>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* SUPORTE */}
        {tab === 'suporte' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Abertos', value: tickets.filter(t => t.status === 'open').length, color: '#3B82F6' },
                { label: 'Em andamento', value: tickets.filter(t => t.status === 'in_progress').length, color: '#F59E0B' },
                { label: 'Resolvidos', value: tickets.filter(t => t.status === 'closed').length, color: '#22C55E' },
              ].map((s, i) => (
                <GlassCard key={i} intensity={0.8} style={{ padding: 20 }}>
                  <div className="text-2xl font-black text-white mb-1">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </GlassCard>
              ))}
            </div>
            <GlassCard intensity={0.2} style={{ padding: 0, overflow: 'hidden' }}>
              {tickets.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">Nenhum ticket ainda</div>
              ) : (
                <ScrollFade orientation="horizontal" fadeSize={40}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Assunto', 'Advogado', 'Prioridade', 'Status', 'Data', 'Ações'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#888' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(t => {
                      const prioColors: Record<string, string> = { low: '#888', normal: '#3B82F6', high: '#F59E0B', urgent: '#EF4444' }
                      const statusColors: Record<string, string> = { open: '#3B82F6', in_progress: '#F59E0B', closed: '#22C55E' }
                      return (
                        <tr key={t.id} className="transition-all duration-200 hover:bg-[rgba(212,175,55,0.05)] hover:[box-shadow:inset_3px_0_0_rgba(212,175,55,0.5)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-4 py-3 text-white font-medium max-w-xs truncate">{t.title}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{t.lawyer_name}<br/>{t.lawyer_email}</td>
                          <td className="px-4 py-3"><span className="text-[10px] px-2 py-1 rounded-full font-bold capitalize" style={{ background: `${prioColors[t.priority]}18`, color: prioColors[t.priority] }}>{t.priority}</span></td>
                          <td className="px-4 py-3">
                            <select value={t.status} onChange={e => mudarStatus(t.id, e.target.value)} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: '#1A1A1A', color: statusColors[t.status], border: `1px solid ${statusColors[t.status]}44` }}>
                              <option value="open">Aberto</option>
                              <option value="in_progress">Em andamento</option>
                              <option value="closed">Resolvido</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => { setSelectedTicket(t); setAdminReply(t.admin_reply || '') }} className="text-[10px] px-3 py-1.5 rounded-lg font-bold" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                              Responder
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </ScrollFade>
              )}
            </GlassCard>

            {selectedTicket && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedTicket(null)}>
                <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: isLight ? '#FFFFFF' : '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
                  <h2 className="text-lg font-bold text-white mb-1">{selectedTicket.title}</h2>
                  <p className="text-xs text-gray-500 mb-4">{selectedTicket.lawyer_name} · {selectedTicket.lawyer_email}</p>
                  <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-sm text-gray-300">{selectedTicket.message}</p>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-gray-400">Sua resposta</label>
                    <textarea value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Digite sua resposta..." className="input-glass w-full px-4 text-sm" style={{ height: 100, paddingTop: 12, resize: 'none' }} spellCheck={true} />
                    <div className="flex gap-2">
                      <button onClick={() => responderTicket(selectedTicket.id)} disabled={sendingReply || !adminReply.trim()} className="btn-gold flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold">
                        {sendingReply ? 'Enviando...' : 'Enviar Resposta'}
                      </button>
                      <button onClick={() => setSelectedTicket(null)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* SISTEMA */}
        {tab === 'sistema' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 gap-4">
              <GlassCard intensity={0.5} style={{ padding: 24 }}>
                <h3 className="font-bold text-white mb-4">Status dos Serviços</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Banco de Dados (Supabase)', ok: true },
                    { name: 'API Claude', ok: true },
                    { name: 'Pagamentos (Abacatepay)', ok: true },
                    { name: 'Email (Resend)', ok: true },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                      <span className="text-sm text-gray-300">{s.name}</span>
                      {s.ok ? (
                        <CheckCircle size={16} color="#22C55E" />
                      ) : (
                        <XCircle size={16} color="#EF4444" />
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard intensity={0.5} style={{ padding: 24 }}>
                <h3 className="font-bold text-white mb-4">Informações</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Versão</span>
                    <span className="text-white">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ambiente</span>
                    <span className="text-white">Produção</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total usuários</span>
                    <span className="text-white">{totalLawyersReal}</span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {tab === 'configuracao' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
            <GlassCard intensity={0.5} style={{ padding: 28 }}>
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Settings size={18} color="#D4AF37"/> Perfil do Administrador</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Nome</label>
                  <input value={perfilForm.name} onChange={e => setPerfilForm(p => ({ ...p, name: e.target.value }))}
                    className="input-glass w-full px-4 text-sm" style={{ height: 46 }} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Email</label>
                  <input value={perfilForm.email} disabled className="input-glass w-full px-4 text-sm" style={{ height: 46, opacity: 0.5 }} spellCheck={true}/>
                </div>
                <button onClick={salvarPerfilAdmin} disabled={savingPerfil} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
                  {savingPerfil ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : savedPerfil ? <><Save size={15}/> Salvo!</> : 'Salvar Alterações'}
                </button>
              </div>
            </GlassCard>

            <GlassCard intensity={0.5} style={{ padding: 28 }}>
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Lock size={18} color="#D4AF37"/> Segurança</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Senha atual</label>
                  <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="input-glass w-full px-4 text-sm" style={{ height: 46 }}/>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Nova senha</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="input-glass w-full px-4 text-sm" style={{ height: 46 }}/>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Confirmar nova senha</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="input-glass w-full px-4 text-sm" style={{ height: 46 }}/>
                </div>
                {pwdMsg && <p className="text-sm" style={{ color: pwdMsg.includes('sucesso') ? '#22C55E' : '#EF4444' }}>{pwdMsg}</p>}
                <button onClick={trocarSenhaAdmin} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm">
                  <Lock size={15}/> Alterar Senha
                </button>
              </div>
            </GlassCard>

            <GlassCard intensity={0.5} style={{ padding: 28 }}>
              <h3 className="font-bold text-white mb-5 flex items-center gap-2"><Key size={18} color="#D4AF37"/> Integrações do Sistema</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-gray-300">API Claude (Anthropic)</span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Conectado</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-gray-300">Stripe (Pagamentos)</span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Conectado</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-gray-300">Abacatepay (PIX)</span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Conectado</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-gray-300">Supabase (Banco de Dados)</span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Conectado</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-4">As chaves de API são gerenciadas via variáveis de ambiente no Vercel por segurança.</p>
            </GlassCard>
          </motion.div>
        )}

        {tab === 'assinaturas' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { plano: 'Trial', cor: '#EAB308', preco: 0 },
                { plano: 'Starter', cor: '#888', preco: 97 },
                { plano: 'Plus', cor: '#3B82F6', preco: 197 },
                { plano: 'Premium', cor: '#D4AF37', preco: 397 },
                { plano: 'Enterprise', cor: '#A855F7', preco: 797 },
              ].map(({ plano, cor, preco }) => {
                const users = allLawyers.filter(l => l.plan === plano.toLowerCase()).length
                const receita = users * preco
                const custo = users * preco * 0.03
                const lucro = receita - custo
                return (
                  <GlassCard key={plano} intensity={0.8} style={{ padding: 20 }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${cor}18`, color: cor }}>{plano}</span>
                      <span className="text-2xl font-black text-white">{users}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Receita</span><span style={{ color: '#22C55E' }}>R$ {receita}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Custo</span><span style={{ color: '#EF4444' }}>R$ {custo.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Lucro</span><span style={{ color: '#D4AF37' }}>R$ {lucro.toFixed(2)}</span></div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </motion.div>
        )}

        {tab === 'documentos_admin' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Total', value: totalDocs, color: '#D4AF37' },
                { label: 'Hoje', value: docsHoje, color: '#22C55E' },
                { label: 'Este Mês', value: docsMes, color: '#3B82F6' },
              ].map(({ label, value, color }) => (
                <GlassCard key={label} intensity={0.8} style={{ padding: 20 }}>
                  <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </GlassCard>
              ))}
            </div>
            <select value={periodoTabela} onChange={e => setPeriodoTabela(e.target.value as 'dia' | 'semana' | 'mes' | 'ano' | 'todos')} className="input-glass px-3 text-xs mb-4" style={{ height: 40 }}>
              <option value="todos">Todos os períodos</option>
              <option value="dia">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="ano">Este ano</option>
            </select>
            <GlassCard intensity={0.2} style={{ padding: 0, overflow: 'hidden' }}>
              <ScrollFade orientation="horizontal" fadeSize={40}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Documento', 'Advogado', 'Tipo', 'Data', 'Custo API'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#888' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(d => {
                      const adv = allLawyers.find(l => l.id === d.lawyer_id)
                      return (
                        <tr key={d.id} className="transition-all duration-200 hover:bg-[rgba(212,175,55,0.05)] hover:[box-shadow:inset_3px_0_0_rgba(212,175,55,0.5)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-4 py-3 text-white text-xs font-medium max-w-xs truncate">{d.title || 'Petição'}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{adv?.name || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{d.agent_type || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#F59E0B' }}>R$ 0,44</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </ScrollFade>
            </GlassCard>
          </motion.div>
        )}

        {tab === 'alertas' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: alertas.length > 0 ? '#EF4444' : '#22C55E' }}/>
              <span className="text-sm font-bold text-white">{alertas.length > 0 ? `${alertas.length} alertas ativos` : 'Tudo funcionando normalmente ✅'}</span>
            </div>
            {alertas.length === 0 ? (
              <GlassCard intensity={0.3} style={{ padding: 32 }}>
                <div className="text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-white font-bold mb-1">Nenhum alerta</p>
                  <p className="text-gray-400 text-sm">Todos os indicadores estão dentro do esperado</p>
                </div>
              </GlassCard>
            ) : alertas.map((alerta, i) => (
              <GlassCard key={i} intensity={0.5} style={{ padding: 16 }}>
                <p className="text-sm text-white">{alerta}</p>
                <p className="text-[10px] text-gray-500 mt-1">{new Date().toLocaleString('pt-BR')}</p>
              </GlassCard>
            ))}
          </motion.div>
        )}

        {tab === 'newsletter' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Inscritos totais', value: newsletterSubs.length, color: '#D4AF37' },
                { label: 'Inscritos ativos', value: newsletterSubs.filter(s => s.ativo).length, color: '#22C55E' },
                { label: 'Newsletters enviadas', value: newsletterEnvios.length, color: '#3B82F6' },
              ].map(({ label, value, color }) => (
                <GlassCard key={label} intensity={0.8} style={{ padding: 20 }}>
                  <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                </GlassCard>
              ))}
            </div>

            <GlassCard gold intensity={0.4} style={{ padding: 20, marginBottom: 16 }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                    <Mail size={16} color="#D4AF37" /> Compor newsletter
                  </div>
                  <div className="text-xs text-gray-400">
                    Redija e dispare newsletters pelo editor com geração por IA
                  </div>
                </div>
                <Link href="/newsletter" className="btn-gold px-4 py-2 rounded-xl text-sm font-bold">
                  Abrir editor
                </Link>
              </div>
            </GlassCard>

            <GlassCard intensity={0.3} style={{ padding: 24 }}>
              <h3 className="font-bold text-white mb-4">Últimos envios</h3>
              {newsletterEnvios.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">Nenhuma newsletter enviada ainda</div>
              ) : (
                <div className="space-y-2">
                  {newsletterEnvios.map((e, i) => (
                    <div
                      key={e.id || i}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{e.assunto}</div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(e.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold" style={{ color: '#22C55E' }}>{e.total_enviados || 0}</div>
                        <div className="text-[10px] text-gray-500">enviados</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {tab === 'logs' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard intensity={0.2} style={{ padding: 0, overflow: 'hidden' }}>
              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">Nenhum log ainda</div>
              ) : (
                <ScrollFade orientation="horizontal" fadeSize={40}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Data/Hora', 'Advogado', 'Ação', 'Recurso', 'Detalhes'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold" style={{ color: '#888' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => {
                      const actionColors: Record<string, string> = {
                        LOGIN: '#22C55E',
                        GERAR_PETICAO: '#D4AF37',
                        EXCLUIR_CLIENTE: '#EF4444',
                        EXCLUIR_DOCUMENTO: '#EF4444',
                        ALTERAR_PLANO: '#A855F7',
                        CADASTRAR_CLIENTE: '#3B82F6',
                      }
                      return (
                        <tr key={l.id} className="transition-all duration-200 hover:bg-[rgba(212,175,55,0.05)] hover:[box-shadow:inset_3px_0_0_rgba(212,175,55,0.5)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(l.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-300">{l.lawyer_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: `${actionColors[l.action] || '#888'}18`, color: actionColors[l.action] || '#888' }}>
                              {l.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{l.resource || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                            {l.details ? JSON.stringify(l.details) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </ScrollFade>
              )}
            </GlassCard>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  )
}
