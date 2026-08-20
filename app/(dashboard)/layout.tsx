'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  LayoutGrid,
  FileText,
  Users,
  Briefcase,
  CreditCard,
  BookOpen,
  MapPin,
  Bell,
  Search,
  Moon,
  LogOut,
  Zap,
  Sparkles,
  Settings,
  Scale,
  LifeBuoy,
  Menu,
  X,
  Calculator,
  Clock,
  Mail,
  MessageSquare,
  Trash2,
  Loader2,
  ShieldCheck,
  Receipt,
  BarChart3,
} from 'lucide-react'
import { podeAcessarControladoria } from '@/lib/permissions/controladoria'
import { carregarMembrosEscritorio } from '@/lib/equipe'
import { SupportChat } from '@/components/SupportChat'
import { DownloadButtons } from '@/components/DownloadButtons'
import {
  filtrarPorModulos,
  isModuloAtivo,
  moduloIdPorHref,
  normalizarConfig,
  type ModulosAtivos,
} from '@/lib/modulos-escritorio'
import { ensureLawyerProfileForOAuth } from '@/lib/auth/google-oauth'
import { isSuperAdmin } from '@/lib/auth/super-admin'

interface Lawyer {
  id: string
  name: string
  email: string
  oab_number: string
  oab_uf: string
  plan: string
  role: string
  is_super_admin?: boolean | null
  trial_expires_at: string
  docs_limit: number
  docs_trial_used: number
  logo_url?: string
  office_id?: string | null
  office_role?: string | null
  cargo?: string | null
}

// Campos opcionais: podem não existir enquanto a migração não for aplicada
interface Notif {
  id: string
  title: string
  type?: string
  created_at: string
  read?: boolean
  document_id?: string | null
  status?: string | null
  progress?: number | null
  link?: string | null
}

interface NotifDoc {
  id: string
  title?: string | null
  agent_type?: string | null
  type?: string | null
  client_name?: string | null
  content?: string | null
  created_at: string
}

const STATUS_EM_ANDAMENTO = ['pending', 'running', 'processing', 'in_progress', 'em_andamento']

function estaEmAndamento(n: Notif) {
  return typeof n.status === 'string' && STATUS_EM_ANDAMENTO.includes(n.status)
}

function tituloDocumento(d: NotifDoc) {
  return d.title || d.agent_type || d.type || 'Documento'
}

// Recorta um trecho do conteúdo em torno do termo buscado, para mostrar
// por que um documento apareceu no resultado da busca.
function trechoComTermo(conteudo: string | null | undefined, termo: string) {
  if (!conteudo) return undefined
  const idx = conteudo.toLowerCase().indexOf(termo.toLowerCase())
  if (idx < 0) return undefined
  const inicio = Math.max(0, idx - 35)
  const fim = Math.min(conteudo.length, idx + termo.length + 35)
  return `${inicio > 0 ? '…' : ''}${conteudo.slice(inicio, fim).trim()}${fim < conteudo.length ? '…' : ''}`
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light') { setDarkMode(false); return }
    if (saved === 'dark') { setDarkMode(true); return }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(prefersDark)
  }, [])
  const [showProfile, setShowProfile] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [notifDoc, setNotifDoc] = useState<NotifDoc | null>(null)
  const [notifDocLoading, setNotifDocLoading] = useState(false)
  const [notifDocError, setNotifDocError] = useState('')
  const [isLight, setIsLight] = useState(false)
  const [showSobre, setShowSobre] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categoriaTop, setCategoriaTop] = useState<string | undefined>()
  const [modulosAtivos, setModulosAtivos] = useState<ModulosAtivos | null>(null)
  const [modulosCarregados, setModulosCarregados] = useState(false)
  const [toastModulo, setToastModulo] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
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
    async function init() {
      // Após OAuth Google, o cliente troca o ?code= pela sessão (PKCE).
      const { data: { session } } = await supabase.auth.getSession()
      let user = session?.user ?? null
      if (!user) {
        const { data: { user: u } } = await supabase.auth.getUser()
        user = u
      }
      if (!user) { router.push('/login'); return }

      const { created, lawyer } = await ensureLawyerProfileForOAuth(supabase, user)
      // Primeiro acesso via Google (sem perfil prévio) → onboarding
      if (created) {
        router.replace('/onboarding')
        return
      }
      if (!lawyer) { router.push('/login'); return }
      // super_admin pode usar /dashboard normalmente; /admin e /escolha ficam separados
      setLawyer(lawyer as Lawyer)
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { created, lawyer } = await ensureLawyerProfileForOAuth(supabase, session.user)
        if (created) {
          router.replace('/onboarding')
          return
        }
        if (lawyer) {
          setLawyer(lawyer as Lawyer)
          setLoading(false)
        }
      }
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadModulos() {
      if (!lawyer?.id) return
      setModulosCarregados(false)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('modulos_ativos_do_escritorio')
      if (!rpcErr) {
        setModulosAtivos(normalizarConfig(rpcData))
        setModulosCarregados(true)
        return
      }
      let targetId = lawyer.id
      if (lawyer.office_id) {
        const { data: owner } = await supabase
          .from('lawyers')
          .select('id')
          .eq('office_id', lawyer.office_id)
          .eq('office_role', 'owner')
          .maybeSingle()
        if (owner?.id) targetId = owner.id
        else targetId = lawyer.office_id
      }
      const { data } = await supabase
        .from('lawyers')
        .select('modulos_ativos')
        .eq('id', targetId)
        .maybeSingle()
      setModulosAtivos(normalizarConfig(data?.modulos_ativos ?? null))
      setModulosCarregados(true)
    }
    loadModulos()
    function onAtualizado(e: Event) {
      const detail = (e as CustomEvent).detail
      setModulosAtivos(normalizarConfig(detail) ?? null)
    }
    window.addEventListener('marple:modulos-atualizados', onAtualizado)
    return () => window.removeEventListener('marple:modulos-atualizados', onAtualizado)
  }, [lawyer?.id, lawyer?.office_id])

  useEffect(() => {
    if (!modulosCarregados || !pathname) return
    const id = moduloIdPorHref(pathname)
    if (!id) return
    if (!isModuloAtivo(modulosAtivos, id)) {
      setToastModulo(true)
      router.replace('/dashboard')
    }
  }, [pathname, modulosAtivos, modulosCarregados])

  useEffect(() => {
    if (!toastModulo) return
    const t = setTimeout(() => setToastModulo(false), 3500)
    return () => clearTimeout(t)
  }, [toastModulo])

  useEffect(() => {
    async function loadNotifs() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8)
      setNotifs((data as Notif[]) || [])
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  async function apagarNotificacao(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  async function abrirNotificacao(n: Notif) {
    if (estaEmAndamento(n)) return

    if (n.document_id) {
      setShowNotif(false)
      setNotifDoc(null)
      setNotifDocError('')
      setNotifDocLoading(true)
      setDocModalOpen(true)
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, agent_type, type, client_name, content, created_at')
        .eq('id', n.document_id)
        .maybeSingle()
      setNotifDocLoading(false)
      if (error || !data) {
        setNotifDocError('Documento não encontrado. Ele pode ter sido excluído.')
        return
      }
      setNotifDoc(data as NotifDoc)
      return
    }

    if (n.link) {
      setShowNotif(false)
      router.push(n.link)
    }
  }

  function fecharDocumento() {
    setDocModalOpen(false)
    setNotifDoc(null)
    setNotifDocError('')
    setNotifDocLoading(false)
  }

  async function limparNotificacoes() {
    if (!confirm('Excluir todas as notificações?')) return
    const ids = notifs.map((n) => n.id)
    setNotifs([])
    if (ids.length > 0) await supabase.from('notifications').delete().in('id', ids)
  }

  const rotaMap: Record<string, string> = {
    'Documento': '/documentos',
    'Cliente': '/clientes',
    'Jurisprudência': '/jurisprudencia',
  }

  async function doSearch(term: string) {
    setSearchTerm(term)
    if (term.length < 2) {
      setSearchResults([])
      setCategoriaTop(undefined)
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    // Mesmo escopo de escritório usado em /documentos: busca também os
    // documentos dos colegas do mesmo escritório, nunca de outros escritórios.
    const membros = await carregarMembrosEscritorio(supabase, user.id)
    const memberIds = membros.map((m) => m.id)
    const [docsTitulo, docsConteudo, clients, juris] = await Promise.all([
      supabase
        .from('documents')
        .select('id, title, type, client_id, client_name')
        .in('lawyer_id', memberIds)
        .ilike('title', `%${term}%`)
        .limit(4),
      // Busca também dentro do texto integral da petição/documento gerado
      // (coluna `content`), não só no título.
      supabase
        .from('documents')
        .select('id, title, type, client_id, client_name, content')
        .in('lawyer_id', memberIds)
        .ilike('content', `%${term}%`)
        .limit(4),
      supabase
        .from('clients')
        .select('id, name, status')
        .eq('lawyer_id', user.id)
        .ilike('name', `%${term}%`)
        .limit(4),
      supabase
        .from('jurisprudencias')
        .select('id, assunto')
        .ilike('assunto', `%${term}%`)
        .limit(4),
    ])

    const docsPorId = new Map<string, any>()
    for (const d of docsTitulo.data || []) docsPorId.set(d.id, { ...d, encontradoNoTitulo: true })
    for (const d of docsConteudo.data || []) {
      const atual = docsPorId.get(d.id)
      if (atual) docsPorId.set(d.id, { ...atual, content: d.content, encontradoNoConteudo: true })
      else docsPorId.set(d.id, { ...d, encontradoNoConteudo: true })
    }

    const results = [
      ...Array.from(docsPorId.values())
        .slice(0, 5)
        .map((d: any) => ({
          type: 'Documento',
          label: d.title || d.type || 'Documento',
          href: d.client_id ? `/clientes/${d.client_id}` : '/documentos',
          clienteNome: d.client_name || undefined,
          trecho:
            !d.encontradoNoTitulo && d.encontradoNoConteudo
              ? trechoComTermo(d.content, term)
              : undefined,
        })),
      ...(clients.data || []).map((c: any) => ({
        type: 'Cliente',
        label: c.name,
        href: '/clientes',
        arquivado: c.status === 'archived',
      })),
      ...(juris.data || []).map((j: any) => ({
        type: 'Jurisprudência',
        label: j.assunto,
        href: '/jurisprudencia',
      })),
    ]

    const maisResultados = results.reduce((acc: any, r: any) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const top = Object.entries(maisResultados).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] as string | undefined
    setCategoriaTop(top)
    setSearchResults(results)
  }

  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0A0A' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
        />
      </div>
    )

  const docsUsed = lawyer?.docs_trial_used || 0
  const docsLimit = lawyer?.docs_limit || 5
  const isUrgent = docsUsed >= docsLimit
  const initials =
    lawyer?.name
      ?.split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'AD'
  const isAdmin = isSuperAdmin(lawyer)
  const verControladoria = podeAcessarControladoria(
    lawyer as { cargo?: string; role?: string; office_role?: string } | null
  )

  const sidebarSections = [
    {
      title: 'PRINCIPAL',
      items: filtrarPorModulos(
        [
          { href: '/dashboard', icon: LayoutGrid, label: 'Início' },
          { href: '/documentos', icon: FileText, label: 'Documentos' },
          { href: '/clientes', icon: Users, label: 'Clientes' },
        ],
        modulosAtivos
      ),
    },
    {
      title: 'GESTÃO',
      items: filtrarPorModulos(
        [
          { href: '/equipe', icon: Briefcase, label: 'Minha Equipe' },
          { href: '/chat', icon: MessageSquare, label: 'Chat Interno' },
          ...(verControladoria
            ? [{ href: '/controladoria', icon: BarChart3, label: 'Controladoria' }]
            : []),
        ],
        modulosAtivos
      ),
    },
    {
      title: 'SISTEMA',
      items: [
        ...filtrarPorModulos(
          [
            { href: '/agentes', icon: Sparkles, label: 'Agentes IA' },
            { href: '/ferramentas', icon: Calculator, label: 'Ferramentas' },
            { href: '/processos', icon: Scale, label: 'Processos' },
            { href: '/honorarios', icon: FileText, label: 'Honorários' },
            { href: '/prazos', icon: Clock, label: 'Prazos' },
            { href: '/assinatura', icon: CreditCard, label: 'Planos & Preços' },
            { href: '/jurisprudencia', icon: BookOpen, label: 'Jurisprudência' },
            { href: '/blog', icon: BookOpen, label: 'Blog Jurídico' },
            { href: '/newsletter', icon: Mail, label: 'Newsletter' },
            { href: '/jurisdicao', icon: MapPin, label: 'Jurisdição' },
            { href: '/configuracoes', icon: Settings, label: 'Configurações' },
            { href: '/suporte', icon: LifeBuoy, label: 'Suporte' },
          ],
          modulosAtivos
        ),
        ...(isAdmin
          ? [{ href: '/admin', icon: ShieldCheck, label: 'Painel Admin' }]
          : []),
      ],
    },
  ].filter((section) => section.items.length > 0)

  const topNav = filtrarPorModulos(
    [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/ia', label: 'IA Geral' },
      { href: '/agentes', label: 'IA Previdenciária' },
      { href: '/clientes', label: 'Clientes' },
      { href: '/assinatura', label: 'Ajustes' },
    ],
    modulosAtivos
  )

  const notifCount = notifs.filter((n) => !n.read).length || notifs.length

  return (
    <div className="flex min-h-screen" style={{ background: isLight ? '#F8F8F8' : '#000' }}>
      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col transition-transform duration-300 ${menuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
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
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 cursor-pointer" onClick={() => setShowSobre(true)}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(212,175,55,0.1)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
          <div>
            <div className="font-black text-lg leading-none">
              <span className="text-white">Mar</span>
              <span className="text-gradient-gold">ple</span>
            </div>
            <div className="text-[7px] tracking-[0.25em] text-gray-500 mt-0.5">
              INTELIGÊNCIA JURÍDICA
            </div>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {sidebarSections.map((section) => (
            <div key={section.title} className="mb-5">
              <div
                className="px-3 mb-2 text-[9px] font-bold tracking-[0.2em]"
                style={{ color: '#555' }}
              >
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: active
                          ? (isLight ? '#FFF4D6' : 'linear-gradient(to right, rgba(212,175,55,0.12), transparent)')
                          : 'transparent',
                        color: active ? (isLight ? '#1F1F1F' : '#D4AF37') : (isLight ? '#4F4F4F' : '#666'),
                        border: active && isLight ? '1px solid #F0D890' : 'none',
                        boxShadow: 'none',
                      }}
                    >
                      <Icon size={17} /> {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Consumo */}
        <div
          className="mx-3 mb-3 p-3 rounded-2xl"
          style={{
            background: isLight ? (isUrgent ? '#FEE2E2' : '#FFF4D6') : (isUrgent ? 'rgba(239,68,68,0.08)' : 'rgba(212,175,55,0.06)'),
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: '#D4AF37' }}>
              CONSUMO
            </span>
            <span className="text-[8px]" style={{ color: '#666' }}>
              Atualizado agora
            </span>
          </div>
          <div className="text-right text-[10px] mb-1" style={{ color: '#999' }}>
            {docsUsed} / {docsLimit}
          </div>
          <div
            className="w-full h-1.5 rounded-full mb-3"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min((docsUsed / docsLimit) * 100, 100)}%`,
                background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
              }}
            />
          </div>
          <Link
            href="/assinatura"
            className="btn-gold flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold"
          >
            <Zap size={12} /> FAZER UPGRADE
          </Link>
        </div>

        {/* Usuário */}
        <div
          className="mx-3 mb-3 p-2.5 rounded-2xl flex items-center gap-2.5"
          style={{
            background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)',
            border: isLight ? '1px solid #EDEDED' : 'none',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{lawyer?.name}</div>
            <div className="text-[9px] truncate" style={{ color: '#666' }}>
              {isAdmin ? 'Administrador' : 'Advogado'}
            </div>
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
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col lg:ml-64" style={{ marginLeft: undefined, background: isLight ? '#F8F8F8' : 'transparent' }}>
        {/* TOP NAV */}
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 h-20 mx-3 mt-3">
          <div
            className="flex items-center gap-4 flex-1 px-5 h-14 rounded-2xl"
            style={{
              background: isLight ? '#FFFFFF' : 'rgba(20,18,12,0.7)',
              backdropFilter: isLight ? 'none' : 'blur(20px)',
              border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.1)',
            }}
          >
            <button className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl mr-2" onClick={() => setMenuOpen(true)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: isLight ? '#1E1E1E' : '#fff' }}>
              <Menu size={18}/>
            </button>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <nav className="hidden lg:flex items-center gap-1">
              {topNav.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                    style={{
                      background: active
                        ? 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))'
                        : 'transparent',
                      color: active ? '#D4AF37' : '#999',
                      border: active
                        ? '1px solid rgba(212,175,55,0.4)'
                        : '1px solid transparent',
                      boxShadow: active ? '0 0 20px rgba(212,175,55,0.15)' : 'none',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="flex items-center gap-2 ml-auto relative">
              {showSearch && (
                <div className="absolute right-0 top-12 w-80 z-50">
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => doSearch(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && searchTerm) {
                        const rota = rotaMap[categoriaTop || ''] || '/jurisprudencia'
                        localStorage.setItem('marple_search', searchTerm)
                        router.push(rota)
                        setShowSearch(false)
                        setSearchTerm('')
                        setSearchResults([])
                      }
                    }}
                    placeholder="Buscar documentos, clientes, jurisprudência..."
                    className="input-glass w-full px-4 text-sm"
                    style={{ height: 44 }} spellCheck={true} />
                  {searchResults.length > 0 && (
                    <div
                      className="mt-2 rounded-2xl p-2 max-h-80 overflow-auto"
                      style={{
                        background: '#141410',
                        border: '1px solid rgba(212,175,55,0.2)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                      }}
                    >
                      {searchResults.map((r, idx) => (
                        <Link
                          key={idx}
                          href={r.href}
                          onClick={() => {
                            localStorage.setItem('marple_search', searchTerm)
                            setShowSearch(false)
                            setSearchTerm('')
                            setSearchResults([])
                          }}
                          className="flex items-start gap-3 p-2.5 rounded-lg transition-all hover:bg-white/5"
                        >
                          <span
                            className="text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 mt-0.5"
                            style={{
                              background: r.type === 'Documento' ? 'rgba(96,165,250,0.15)' : 'rgba(212,175,55,0.15)',
                              color: r.type === 'Documento' ? '#60A5FA' : '#D4AF37',
                            }}
                          >
                            {r.type}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-gray-300 truncate">{r.label}</span>
                            {r.clienteNome && (
                              <span className="block text-[10px] truncate" style={{ color: '#888' }}>
                                Cliente: {r.clienteNome}
                              </span>
                            )}
                            {r.trecho && (
                              <span className="block text-[10px] italic truncate" style={{ color: '#666' }}>
                                "{r.trecho}"
                              </span>
                            )}
                          </span>
                          {r.arquivado && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ml-auto mt-0.5"
                              style={{ background: 'rgba(136,136,136,0.2)', color: '#999' }}
                            >
                              Arquivado
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                aria-label="Buscar"
                onClick={() => {
                  setShowSearch((s) => !s)
                  setShowNotif(false)
                  setShowProfile(false)
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
                style={{ color: isLight ? '#2C2C2C' : '#999' }}
              >
                <Search size={17} />
              </button>

              <div className="relative">
                <button
                  aria-label="Notificações"
                  onClick={() => {
                    setShowNotif((s) => !s)
                    setShowSearch(false)
                    setShowProfile(false)
                  }}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
                  style={{ color: isLight ? '#2C2C2C' : '#999' }}
                >
                  <Bell size={17} />
                  {notifCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold"
                      style={{ background: '#D4AF37', color: '#000' }}
                    >
                      {notifCount}
                    </span>
                  )}
                </button>
                {showNotif && (
                  <div
                    className="absolute right-0 top-12 w-80 rounded-2xl p-4 z-40"
                    style={{ background: isLight ? '#FFFFFF' : '#141410', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)', boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.10)' : '0 12px 40px rgba(0,0,0,0.6)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Notificações</div>
                      {notifs.length > 0 && (
                        <button
                          type="button"
                          onClick={limparNotificacoes}
                          className="text-[10px] transition-opacity hover:opacity-80"
                          style={{ color: '#EF4444' }}
                        >
                          Limpar todas
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {notifs.length === 0 ? (
                        <div className="text-center py-4 text-xs text-gray-500">
                          Nenhuma notificação
                        </div>
                      ) : (
                        notifs.map((n) => {
                          const emAndamento = estaEmAndamento(n)
                          const clicavel = !emAndamento && Boolean(n.document_id || n.link)
                          const cor = emAndamento
                            ? '#D4AF37'
                            : n.type === 'success'
                              ? '#22C55E'
                              : n.type === 'warning'
                                ? '#EF4444'
                                : '#D4AF37'
                          const pct =
                            typeof n.progress === 'number'
                              ? Math.max(0, Math.min(100, n.progress))
                              : null
                          return (
                            <div
                              key={n.id}
                              role={clicavel ? 'button' : undefined}
                              tabIndex={clicavel ? 0 : undefined}
                              onClick={clicavel ? () => abrirNotificacao(n) : undefined}
                              onKeyDown={
                                clicavel
                                  ? (e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        abrirNotificacao(n)
                                      }
                                    }
                                  : undefined
                              }
                              className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors group ${clicavel ? 'cursor-pointer hover:bg-[rgba(212,175,55,0.10)]' : 'hover:bg-[rgba(212,175,55,0.05)]'}`}
                            >
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${emAndamento ? 'animate-pulse' : ''}`}
                                style={{ background: cor }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs flex-1" style={{ color: isLight ? '#374151' : undefined }}>{n.title}</span>
                                  <span className="text-[9px] flex-shrink-0 mt-0.5" style={{ color: isLight ? '#9CA3AF' : undefined }}>
                                    {new Date(n.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      apagarNotificacao(n.id)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded -mt-1"
                                    style={{ color: '#EF4444' }}
                                    aria-label="Excluir notificação"
                                    title="Excluir notificação"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                {emAndamento && (
                                  <div className="mt-1.5">
                                    <div
                                      className="w-full h-1 rounded-full overflow-hidden"
                                      style={{ background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)' }}
                                    >
                                      {pct === null ? (
                                        <motion.div
                                          className="h-full rounded-full"
                                          style={{
                                            width: '40%',
                                            background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
                                          }}
                                          animate={{ x: ['-100%', '250%'] }}
                                          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                                        />
                                      ) : (
                                        <div
                                          className="h-full rounded-full transition-all duration-500"
                                          style={{
                                            width: `${pct}%`,
                                            background: 'linear-gradient(90deg, #D4AF37, #F0D060)',
                                          }}
                                        />
                                      )}
                                    </div>
                                    <div className="text-[9px] mt-1" style={{ color: '#D4AF37' }}>
                                      {pct === null ? 'Em andamento...' : `Em andamento · ${pct}%`}
                                    </div>
                                  </div>
                                )}
                                {clicavel && n.document_id && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[9px] mt-1"
                                    style={{ color: '#D4AF37' }}
                                  >
                                    <FileText size={9} /> Ver documento
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                aria-label="Alternar tema"
                onClick={() => setDarkMode((d) => !d)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/5"
                style={{ color: isLight ? '#2C2C2C' : '#999' }}
              >
                <Moon size={17} />
              </button>

              <div className="relative">
                <button
                  aria-label="Perfil"
                  onClick={() => {
                    setShowProfile((s) => !s)
                    setShowSearch(false)
                    setShowNotif(false)
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all hover:scale-105 overflow-hidden"
                  style={{ background: lawyer?.logo_url ? '#fff' : 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000', border: lawyer?.logo_url ? '1px solid rgba(212,175,55,0.3)' : 'none' }}
                >
                  {lawyer?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lawyer.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  ) : initials}
                </button>
                {showProfile && (
                  <div
                    className="absolute right-0 top-12 w-64 rounded-2xl p-4 z-30 max-h-[calc(100vh-7rem)] overflow-y-auto"
                    style={{ background: isLight ? '#FFFFFF' : '#141410', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)', boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.10)' : '0 12px 40px rgba(0,0,0,0.6)' }}
                  >
                    <div
                      className="flex items-center gap-3 mb-3 pb-3"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
                        style={{ background: lawyer?.logo_url ? '#fff' : 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000', border: lawyer?.logo_url ? '1px solid rgba(212,175,55,0.3)' : 'none' }}
                      >
                        {lawyer?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={lawyer.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                        ) : initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{lawyer?.name}</div>
                        <div className="text-[10px] truncate" style={{ color: isLight ? '#6B7280' : '#666' }}>{lawyer?.email}</div>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs mb-3">
                      <div className="flex justify-between">
                        <span style={{ color: isLight ? '#6B7280' : '#666' }}>OAB</span>
                        <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                          {lawyer?.oab_uf} {lawyer?.oab_number}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: isLight ? '#6B7280' : '#666' }}>Plano</span>
                        <span className="capitalize" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{lawyer?.plan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: isLight ? '#6B7280' : '#666' }}>Documentos</span>
                        <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                          {docsUsed}/{docsLimit}
                        </span>
                      </div>
                    </div>
                    <div
                      className="pt-2 mb-1 space-y-0.5"
                      style={{ borderTop: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {[
                        { href: '/equipe', icon: Briefcase, label: 'Gerenciar equipe' },
                        { href: '/equipe#permissoes', icon: ShieldCheck, label: 'Permissões' },
                        { href: '/configuracoes', icon: Settings, label: 'Configurações da conta' },
                        { href: '/assinatura#historico', icon: Receipt, label: 'Emissões e faturas' },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link
                          key={label}
                          href={href}
                          onClick={() => setShowProfile(false)}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors duration-200 border border-transparent hover:border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.08)]"
                          style={{ color: isLight ? '#374151' : '#aaa' }}
                        >
                          <Icon size={14} /> {label}
                        </Link>
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut()
                        router.push('/login')
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors duration-200 border border-transparent hover:border-[rgba(239,68,68,0.25)] hover:bg-red-500/10"
                      style={{ color: isLight ? '#DC2626' : '#EF4444' }}
                    >
                      <LogOut size={14} /> Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-3 pb-3" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>{children}</main>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMenuOpen(false)}/>
      )}
      <SupportChat/>
      {docModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={fecharDocumento}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl p-8"
            style={{
              background: isLight ? '#FFFFFF' : '#0A0A0A',
              border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {notifDocLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 size={24} className="animate-spin" style={{ color: '#D4AF37' }} />
                <p className="text-xs" style={{ color: '#888' }}>Carregando documento...</p>
              </div>
            ) : notifDocError ? (
              <div className="text-center py-12">
                <FileText size={36} className="mx-auto mb-3" style={{ color: '#444' }} />
                <p className="text-sm mb-4" style={{ color: isLight ? '#374151' : '#ccc' }}>{notifDocError}</p>
                <button
                  onClick={fecharDocumento}
                  className="text-xs px-4 py-2 rounded-lg"
                  style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                >
                  Fechar
                </button>
              </div>
            ) : notifDoc ? (
              <>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                      {tituloDocumento(notifDoc)}
                    </h2>
                    <p className="text-xs mt-1" style={{ color: '#888' }}>
                      {notifDoc.client_name ? `Cliente: ${notifDoc.client_name}` : 'Sem cliente vinculado'}
                      {' · '}
                      {new Date(notifDoc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DownloadButtons
                      text={notifDoc.content || ''}
                      fileName={(notifDoc.title || 'peticao').replace(/\s+/g, '-').toLowerCase()}
                    />
                    <button
                      onClick={fecharDocumento}
                      className="text-lg ml-1 transition-colors hover:text-white"
                      style={{ color: isLight ? '#5E5E5E' : '#888' }}
                      aria-label="Fechar"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="font-mono text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: isLight ? '#374151' : '#ccc' }}
                >
                  {notifDoc.content || 'Conteúdo não disponível.'}
                </div>
                <div className="mt-6 pt-4" style={{ borderTop: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)' }}>
                  <Link
                    href="/documentos"
                    onClick={fecharDocumento}
                    className="text-xs"
                    style={{ color: '#D4AF37' }}
                  >
                    Abrir em Meus Documentos →
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={() => setShowSobre(false)}>
          <div className="w-full max-w-2xl rounded-3xl p-8 overflow-auto max-h-[85vh]" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.25)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Marple" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
                </div>
                <div>
                  <div className="text-2xl font-black"><span className="text-gradient-gold">Mar</span><span className="text-white">ple</span></div>
                  <div className="text-[10px] tracking-[0.25em] text-gray-500">INTELIGÊNCIA JURÍDICA COM IA</div>
                </div>
              </div>
              <button onClick={() => setShowSobre(false)} className="text-gray-500 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-5 text-sm text-gray-300 leading-relaxed">
              <p className="text-base text-white">O <strong className="text-gradient-gold">Marple</strong> é uma plataforma SaaS de inteligência artificial voltada para advogados especializados em Direito Previdenciário brasileiro.</p>
              <div>
                <h3 className="font-bold text-white mb-2" style={{ color: '#D4AF37' }}>🎯 Nossa Missão</h3>
                <p>Democratizar o acesso à tecnologia jurídica de ponta, permitindo que advogados previdenciaristas atuem com mais precisão, velocidade e confiança — sem abrir mão do julgamento humano.</p>
              </div>
              <div>
                <h3 className="font-bold mb-2" style={{ color: '#D4AF37' }}>⚡ O que o Marple faz</h3>
                <ul className="space-y-1.5 pl-4">
                  <li>• Geração de petições previdenciárias com IA (31 agentes especializados)</li>
                  <li>• Análise previdenciária completa com parecer técnico, histórico jurídico e antecedentes</li>
                  <li>• IA Consultora jurídica com histórico permanente de conversas</li>
                  <li>• Gestão completa de clientes com importação/exportação em massa</li>
                  <li>• Banco de jurisprudências próprio e atualizável</li>
                  <li>• Gestão de equipe com estatísticas por membro</li>
                  <li>• Pagamentos via PIX e cartão de crédito</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2" style={{ color: '#D4AF37' }}>⚠️ Importante</h3>
                <p>O Marple é um <strong className="text-white">acelerador com revisão humana</strong>. Todas as peças e análises geradas pela IA devem ser revisadas e assinadas pelo advogado responsável antes de qualquer uso profissional.</p>
              </div>
              <div>
                <h3 className="font-bold mb-2" style={{ color: '#D4AF37' }}>📞 Contato</h3>
                <p>Suporte: <span style={{ color: '#D4AF37' }}>suporte@marple.com.br</span></p>
                <p>Privacidade: <span style={{ color: '#D4AF37' }}>privacidade@marple.com.br</span></p>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-gray-500 text-center">© 2026 Marple · Versão 1.0.0 · Todos os direitos reservados</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {toastModulo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl text-xs font-medium max-w-sm"
          style={{
            background: 'rgba(40,30,10,0.96)',
            border: '1px solid rgba(212,175,55,0.45)',
            color: '#F0D060',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          Este módulo está desativado para o escritório.
        </div>
      )}
    </div>
  )
}
