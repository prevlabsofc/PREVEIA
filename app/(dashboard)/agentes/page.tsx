'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Search,
  Sparkles,
  FileText,
  Scale,
  Shield,
  Clock,
  Users,
  BookOpen,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  X,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Loader2 as Loader,
  Sprout,
  Home,
  FileCheck,
  Heart,
  type LucideIcon,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { SeletorModelo } from '@/components/SeletorModelo'
import { MeusAgentesCard, type AgenteCardItem } from '@/components/agentes/MeusAgentesCard'
import { PeticaoEditorComPreview } from '@/components/peticao/PeticaoEditorComPreview'
import { ConfigurarTimelineSm } from '@/components/peticao/ConfigurarTimelineSm'
import type { DadosAdvogadoPeticao, EstiloPeticao } from '@/lib/peticao-export'
import { normalizarEstiloPeticao } from '@/lib/peticao-export'
import { injetarTimelineNoTexto, slugArquivoPeticaoSm, type TimelineData } from '@/lib/peticao-sm-rural'
import { marcarPeticaoAtiva, consumirFilaPeticao, PETICAO_INSERIR_EVENT, PETICAO_CHANNEL } from '@/lib/peticao-sessao'
import { consumirContextoPeticao } from '@/lib/extracao-documento-pdf'
import { formatarEnderecoQualificacao } from '@/lib/formatar-endereco'
import {
  formSmTemErros,
  validarDataPeticao,
  validarFormularioSm,
  validarNb,
  validarNomeCrianca,
  validarPeriodoSegurado,
  type ErrosFormSm,
} from '@/lib/validar-form-peticao'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const GRUPOS = [
  {
    id: 1, label: 'Salário-Maternidade', color: '#D4AF37', icon: Users,
    agentes: [
      { key: 'salario-maternidade-rural', nome: 'Salário-Maternidade Segurada Especial Rural', desc: 'Agricultora / Pescadora / Extrativista — JEF', tags: ['Petição Inicial', 'Réplica'] },
      { key: 'salario-maternidade-ci', nome: 'Salário-Maternidade Contribuinte Individual', desc: 'Autônoma / MEI / Diarista — JEF', tags: ['Petição Inicial', 'Recurso'] },
      { key: 'salario-maternidade-facultativa', nome: 'Salário-Maternidade Segurada Facultativa', desc: 'Dona de casa contribuinte — JEF', tags: ['Petição Inicial'] },
      { key: 'salario-maternidade-clt', nome: 'Salário-Maternidade CLT', desc: 'Empregada com carteira — Recurso INSS', tags: ['Recurso'] },
    ]
  },
  {
    id: 2, label: 'Aposentadoria Rural', color: '#22C55E', icon: BookOpen,
    agentes: [
      { key: 'apos-idade-rural-mulher', nome: 'Aposentadoria por Idade Rural — Mulher (55 anos)', desc: 'Segurada Especial — JEF', tags: ['Petição Inicial', 'Réplica'] },
      { key: 'apos-idade-rural-homem', nome: 'Aposentadoria por Idade Rural — Homem (60 anos)', desc: 'Segurado Especial — JEF', tags: ['Petição Inicial', 'Réplica'] },
      { key: 'apos-rural-pescador', nome: 'Aposentadoria Rural — Pescador Artesanal', desc: 'Pescador artesanal — JEF', tags: ['Petição Inicial'] },
      { key: 'apos-rural-garimpeiro', nome: 'Aposentadoria Rural — Garimpeiro/Extrativista', desc: 'Garimpeiro / Extrativista — JEF', tags: ['Petição Inicial'] },
    ]
  },
  {
    id: 3, label: 'Aposentadoria Urbana', color: '#3B82F6', icon: Scale,
    agentes: [
      { key: 'apos-tempo-contribuicao', nome: 'Aposentadoria por Tempo de Contribuição', desc: 'CLT / CI / Facultativo — JEF', tags: ['Petição Inicial', 'Réplica'] },
      { key: 'apos-idade-urbana', nome: 'Aposentadoria por Idade Urbana (65H/62M)', desc: 'CLT / CI / Facultativo — JEF', tags: ['Petição Inicial'] },
      { key: 'apos-especial-insalubridade', nome: 'Aposentadoria Especial — Insalubridade', desc: 'Trabalhador insalubre — JEF', tags: ['Petição Inicial', 'Laudo'] },
      { key: 'apos-invalidez', nome: 'Aposentadoria por Invalidez Permanente', desc: 'Qualquer segurado — JEF', tags: ['Petição Inicial'] },
    ]
  },
  {
    id: 4, label: 'Auxílio e Benefícios', color: '#EF4444', icon: Shield,
    agentes: [
      { key: 'auxilio-incapacidade', nome: 'Auxílio por Incapacidade Temporária (Auxílio-Doença)', desc: 'Qualquer segurado — JEF', tags: ['Petição Inicial', 'Recurso'] },
      { key: 'bpc-deficiencia', nome: 'BPC/LOAS — Pessoa com Deficiência', desc: 'Deficiente de baixa renda — JEF', tags: ['Petição Inicial', 'Estudo Social'] },
      { key: 'bpc-idoso', nome: 'BPC/LOAS — Idoso (65+ anos)', desc: 'Idoso de baixa renda — JEF', tags: ['Petição Inicial'] },
      { key: 'pensao-morte-rural', nome: 'Pensão por Morte — Dependente Rural', desc: 'Cônjuge / Filho / Dependente rural — JEF', tags: ['Petição Inicial', 'Réplica'] },
      { key: 'pensao-morte-urbano', nome: 'Pensão por Morte — Dependente Urbano', desc: 'Cônjuge / Filho / Dependente urbano — JEF', tags: ['Petição Inicial'] },
    ]
  },
  {
    id: 5, label: 'Revisões e Recursos', color: '#A855F7', icon: FileText,
    agentes: [
      { key: 'revisao-beneficio', nome: 'Revisão do Benefício — Teto Previdenciário', desc: 'Benefício calculado abaixo do correto', tags: ['Cálculo', 'Petição'] },
      { key: 'recurso-crps', nome: 'Recurso ao CRPS/Junta de Recursos', desc: 'Indeferimento INSS — Petição administrativa', tags: ['Recurso'] },
      { key: 'recurso-trf', nome: 'Recurso ao TRF (Apelação)', desc: 'Sentença desfavorável — Recurso judicial', tags: ['Recurso'] },
      { key: 'recurso-stj', nome: 'Recurso ao STJ (REsp)', desc: 'Questão de direito federal', tags: ['Recurso Especial'] },
      { key: 'recurso-tnu', nome: 'Pedido de Uniformização TNU', desc: 'Divergência entre JEFs — PU', tags: ['PU'] },
    ]
  },
  {
    id: 6, label: 'Documentos Administrativos', color: '#6B21A8', icon: Briefcase,
    agentes: [
      { key: 'requerimento-inss', nome: 'Requerimento Administrativo INSS', desc: 'Dar entrada no benefício — Carta/ofício', tags: ['Requerimento'] },
      { key: 'recurso-administrativo', nome: 'Recurso Administrativo INSS', desc: 'Contestar indeferimento', tags: ['Recurso'] },
      { key: 'pedido-reconsideracao', nome: 'Pedido de Reconsideração INSS', desc: 'Segunda chance administrativa', tags: ['Pedido'] },
      { key: 'carta-preposicao', nome: 'Carta de Preposição', desc: 'Autorizar preposto no INSS', tags: ['Carta'] },
      { key: 'procuracao-inss', nome: 'Procuração INSS', desc: 'Representar cliente no INSS', tags: ['Procuração'] },
    ]
  },
  {
    id: 7, label: 'Documentos do Escritório', color: '#888888', icon: AlertCircle,
    agentes: [
      { key: 'contrato-honorarios-exito', nome: 'Contrato de Honorários — Percentual (Êxito)', desc: 'Honorários só se ganhar', tags: ['Contrato'] },
      { key: 'contrato-honorarios-fixo', nome: 'Contrato de Honorários — Valor Fixo', desc: 'Valor fixo mensal ou por ato', tags: ['Contrato'] },
      { key: 'declaracao-hipossuficiencia', nome: 'Declaração de Hipossuficiência', desc: 'Gratuidade da justiça', tags: ['Declaração'] },
      { key: 'relatorio-audiencia', nome: 'Relatório de Audiência', desc: 'Documentar o ocorrido na audiência', tags: ['Relatório'] },
    ]
  },
]

const AREAS = [
  { label: 'Previdenciário', grupos: [1, 4] },
  { label: 'Rural', grupos: [2] },
  { label: 'Urbano', grupos: [3] },
  { label: 'Recursos', grupos: [5] },
  { label: 'Documentos', grupos: [6, 7] },
]

/** Ícone temático por slug/nome do agente (fallback: Scale). */
const ICONES_AGENTE_POR_KEY: Record<string, LucideIcon> = {
  'salario-maternidade-rural': Sprout,
  'salario-maternidade-ci': Briefcase,
  'salario-maternidade-facultativa': Home,
  'salario-maternidade-clt': FileCheck,
}

function iconeDoAgente(key: string, nome?: string): LucideIcon {
  const exact = ICONES_AGENTE_POR_KEY[key]
  if (exact) return exact

  const blob = `${key} ${nome || ''}`.toLowerCase()
  if (blob.includes('bpc') || blob.includes('loas')) return Heart
  if (blob.includes('apos') || blob.includes('aposentadoria')) return Clock
  return Scale
}

// Valor do filtro: 'Todos' | rótulo de área | `grupo-<id>`
function gruposDoFiltro(valor: string): number[] | null {
  if (valor === 'Todos') return null
  if (valor.startsWith('grupo-')) return [Number(valor.slice(6))]
  return AREAS.find(a => a.label === valor)?.grupos ?? null
}

function rotuloDoFiltro(valor: string): string {
  if (valor === 'Todos') return 'Todas as categorias'
  if (valor.startsWith('grupo-')) return GRUPOS.find(g => g.id === Number(valor.slice(6)))?.label ?? valor
  return valor
}

export default function AgentesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/></div>}>
      <AgentesPageContent/>
    </Suspense>
  )
}

function AgentesPageContent() {
  const [openGroups, setOpenGroups] = useState<number[]>([1])
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [tab, setTab] = useState<'pdf' | 'form'>('form')
  const [contexto, setContexto] = useState('')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [formErrors, setFormErrors] = useState<ErrosFormSm>({})
  const [provas, setProvas] = useState<string[]>([])
  const [imagensProva, setImagensProva] = useState<File[]>([])
  const [imagensPreview, setImagensPreview] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const [result, setResult] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [clientes, setClientes] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [customAgents, setCustomAgents] = useState<any[]>([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customInstrucoes, setCustomInstrucoes] = useState('')
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [uploadingCustom, setUploadingCustom] = useState(false)
  const [customError, setCustomError] = useState('')
  const [selectedCustom, setSelectedCustom] = useState<any>(null)
  const [customFormData, setCustomFormData] = useState<Record<string, string>>({})
  const [customResult, setCustomResult] = useState('')
  const [loadingCustom, setLoadingCustom] = useState(false)
  const [corPeticao, setCorPeticao] = useState('#1d4ed8')
  const [estiloPeticao, setEstiloPeticao] = useState<EstiloPeticao>('moderno')
  const [advPeticao, setAdvPeticao] = useState<DadosAdvogadoPeticao>({})
  const [showTimelineConfig, setShowTimelineConfig] = useState(false)

  const searchParams = useSearchParams()

  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function loadUserAndCustomAgents() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: lawyer } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setCorPeticao(lawyer?.cor_peticao || '#1d4ed8')
      setEstiloPeticao(normalizarEstiloPeticao(lawyer?.estilo_peticao))
      setAdvPeticao({
        name: lawyer?.name,
        office_name: lawyer?.office_name,
        oab_number: lawyer?.oab_number,
        oab_uf: lawyer?.oab_uf,
        email: lawyer?.email,
        whatsapp: lawyer?.whatsapp || lawyer?.phone,
        phone: lawyer?.phone,
        cidade: lawyer?.cidade,
        estado: lawyer?.estado || lawyer?.oab_uf,
        logo_url: lawyer?.logo_url,
        banner_url: lawyer?.banner_url,
        signature_url: lawyer?.signature_url,
        cor_peticao: lawyer?.cor_peticao,
        estilo_peticao: lawyer?.estilo_peticao,
      })
      const { data: clis } = await supabase.from('clients').select('*').eq('lawyer_id', user.id).order('name')
      setClientes(clis || [])
      const { data: cAgents } = await supabase.from('custom_agents').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false })
      setCustomAgents(cAgents || [])
    }
    loadUserAndCustomAgents()
  }, [])

  useEffect(() => {
    const clienteNome = searchParams.get('clienteNome')
    const clienteCPF = searchParams.get('clienteCPF')
    const clienteId = searchParams.get('clienteId')
    const numeroProcesso = searchParams.get('numeroProcesso')
    const ctx = consumirContextoPeticao()
    setFormData((prev: Record<string, string>) => ({
      ...prev,
      ...(ctx?.formPrefill || {}),
      nome: clienteNome || ctx?.formPrefill?.nome || prev.nome || '',
      cpf: clienteCPF || ctx?.formPrefill?.cpf || prev.cpf || '',
      clienteId: clienteId || ctx?.clientId || ctx?.formPrefill?.clienteId || prev.clienteId || '',
      ...(numeroProcesso
        ? { numero_processo: numeroProcesso, nb: numeroProcesso }
        : {}),
    }))
    if (ctx?.texto) {
      setResult((prev) => (prev ? `${prev.trim()}\n\n${ctx.texto}` : ctx.texto))
    }
    if (ctx?.clientId) setSelectedClientId(ctx.clientId)
  }, [searchParams])

  // A10 — sessão ativa de petição: permanece marcada enquanto o modal estiver
  // aberto (mesmo se o advogado navegar para /jurisprudencia e voltar).
  useEffect(() => {
    const ativa = Boolean(selectedAgent || selectedCustom)
    if (ativa) marcarPeticaoAtiva(true)
    else marcarPeticaoAtiva(false)
    if (!ativa) return

    function anexar(texto: string) {
      if (!texto?.trim()) return
      setResult(prev => (prev ? `${prev.trim()}\n\n${texto.trim()}` : texto.trim()))
      setCustomResult(prev => (prev ? `${prev.trim()}\n\n${texto.trim()}` : texto.trim()))
    }

    for (const t of consumirFilaPeticao()) anexar(t)

    function onInserir(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      if (typeof detail === 'string') anexar(detail)
    }
    window.addEventListener(PETICAO_INSERIR_EVENT, onInserir)

    let ch: BroadcastChannel | null = null
    try {
      ch = new BroadcastChannel(PETICAO_CHANNEL)
      ch.onmessage = (ev) => {
        if (ev.data?.type === 'inserir' && typeof ev.data.texto === 'string') anexar(ev.data.texto)
      }
    } catch { /* ignore */ }

    // Não limpa marcarPeticaoAtiva(false) no unmount da página: o flag fica em
    // sessionStorage para /jurisprudencia detectar sessão ativa e enfileirar.
    return () => {
      window.removeEventListener(PETICAO_INSERIR_EVENT, onInserir)
      ch?.close()
    }
  }, [selectedAgent, selectedCustom])

  function toggleGroup(id: number) {
    setOpenGroups(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function openAgent(agent: any, grupo: any) {
    setSelectedAgent({ ...agent, grupo })
    setResult('')
    setContexto('')
    setFormData({})
    setFormErrors({})
    setProvas([])
    setSelectedClientId('')
    setSelectedClient('')
    setTab('form')
    marcarPeticaoAtiva(true)
  }

  function selecionarCliente(clienteId: string) {
    setSelectedClientId(clienteId)
    if (!clienteId) {
      setSelectedClient('')
      return
    }
    const cli = clientes.find(c => c.id === clienteId)
    if (!cli) return
    setSelectedClient(clienteId)
    setFormData(prev => ({
      ...prev,
      nome: cli.name || prev.nome,
      cpf: cli.cpf || prev.cpf,
      telefone: cli.phone || prev.telefone,
      email: cli.email || prev.email,
      // Linha de endereço já formatada para a qualificação da parte na
      // petição (ver `formatarEnderecoQualificacao` — usa rua/número/bairro
      // separados quando existem, com fallback "[a preencher]" por sub-campo
      // faltante; usa o `address` legado como rua se o cliente ainda não
      // tiver os campos separados).
      endereco: formatarEnderecoQualificacao(cli) || prev.endereco,
    }))
  }

  const provasOpcoes = [
    'Certidão de nascimento da criança (zona rural)',
    'Certidão eleitoral (endereço rural)',
    'Declaração de sindicato rural',
    'Declaração de associação de moradores',
    'ITR/INCRA em nome do cônjuge ou pais',
    'Contrato de arrendamento ou parceria rural',
    'Homologação de atividade rural',
    'Notas de venda de produtos rurais',
    'Fotos de atividade agrícola',
    'Testemunhas disponíveis',
  ]

  function handleImagemUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setImagensProva(prev => [...prev, ...files])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setImagensPreview(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removerImagem(i: number) {
    setImagensProva(prev => prev.filter((_, idx) => idx !== i))
    setImagensPreview(prev => prev.filter((_, idx) => idx !== i))
  }

  function iniciarGeracao() {
    if (!selectedAgent) return
    const nomeManual = (formData.nome || '').trim()
    if (!selectedClient && !nomeManual) {
      alert('Selecione um cliente cadastrado ou informe o nome do cliente no formulário.')
      return
    }
    // Valida campos SM antes de gerar (bloqueia lixo de teclado)
    if (selectedAgent.key.includes('salario-maternidade')) {
      const erros = validarFormularioSm(formData)
      setFormErrors(erros)
      if (formSmTemErros(erros)) {
        alert('Corrija os campos destacados em vermelho antes de gerar o documento.')
        return
      }
    }
    // SM rural: configurar timeline antes de gerar o documento final
    if (selectedAgent.key === 'salario-maternidade-rural') {
      setShowTimelineConfig(true)
      return
    }
    void handleGenerate(null)
  }

  async function handleGenerate(timeline: TimelineData | null) {
    if (!selectedAgent) return
    const nomeManual = (formData.nome || '').trim()
    if (!selectedClient && !nomeManual) {
      alert('Selecione um cliente cadastrado ou informe o nome do cliente no formulário.')
      return
    }
    if (selectedAgent.key.includes('salario-maternidade')) {
      const erros = validarFormularioSm(formData)
      setFormErrors(erros)
      if (formSmTemErros(erros)) {
        setShowTimelineConfig(false)
        alert('Corrija os campos destacados em vermelho antes de gerar o documento.')
        return
      }
    }
    setShowTimelineConfig(false)
    setStreaming(true)
    setResult('')

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    const token = session?.access_token

    // Evita enviar `Bearer undefined`, que faz o backend retornar `unauthorized`.
    if (sessionError || !token) {
      setResult('Sua sessão expirou. Refaça login para gerar a petição.')
      setStreaming(false)
      return
    }

    try {
      const response = await fetch('/api/gerar-documento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentType: selectedAgent.key,
          formData: {
            ...formData,
            provas,
            contexto: contexto + (imagensPreview.length > 0 ? `\n\n[${imagensPreview.length} imagem(ns) de prova anexada(s) pelo advogado]` : ''),
            ...(timeline
              ? {
                  timeline_estilo: timeline.estilo || 'horizontal',
                  timeline_json: JSON.stringify(timeline),
                }
              : {}),
          },
          clientId: selectedClient || null,
          clientName: nomeManual || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (err.error === 'trial_expired') {
          setResult('⚠️ Seu trial expirou ou você atingiu o limite de petições. Assine um plano para continuar.')
          setStreaming(false)
          return
        }
        setResult(`⚠️ ${err.error || 'Erro ao gerar petição. Verifique os dados do cliente.'}`)
        setStreaming(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      let acumulado = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        acumulado += chunk
        setResult(acumulado)
      }

      // Sobrescreve o bloco TIMELINE da IA com a configuração do usuário
      if (timeline) {
        const comTimeline = injetarTimelineNoTexto(acumulado, timeline)
        setResult(comTimeline)
      }
    } catch {
      setResult('Erro ao gerar petição. Tente novamente.')
    }
    setStreaming(false)
  }

  async function handlePDFUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('pdf', file)
    try {
      const res = await fetch('/api/extrair-pdf', { method: 'POST', body: fd })
      const data = await res.json()
      if (data && !data.error) {
        setFormData(prev => ({ ...prev, ...data }))
        setTab('form')
      }
    } catch {}
    setUploading(false)
  }

  async function uploadCustomAgent() {
    if (!customName || !customFile) { setCustomError('Preencha o nome e selecione um PDF'); return }
    setUploadingCustom(true)
    setCustomError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fd = new FormData()
      fd.append('file', customFile)
      fd.append('name', customName)
      fd.append('instrucoes', customInstrucoes)
      const res = await fetch('/api/criar-agente-custom', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCustomAgents(prev => [data.agent, ...prev])
      setShowCustomForm(false)
      setCustomName('')
      setCustomInstrucoes('')
      setCustomFile(null)
    } catch (e: any) {
      setCustomError(e.message || 'Erro ao processar PDF')
    } finally {
      setUploadingCustom(false)
    }
  }

  async function excluirCustomAgent(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Excluir este agente?')) return
    await supabase.from('custom_agents').delete().eq('id', id)
    setCustomAgents(prev => prev.filter(a => a.id !== id))
    if (selectedCustom?.id === id) setSelectedCustom(null)
  }

  const itensCustomAgents: AgenteCardItem[] = customAgents.map(agent => ({
    id: agent.id,
    nome: agent.name,
    resumo: `${(agent.fields || []).length} campos identificados`,
    meta: `Criado em ${new Date(agent.created_at).toLocaleDateString('pt-BR')}`,
  }))

  function alternarCustomAgent(item: AgenteCardItem) {
    if (selectedCustom?.id === item.id) {
      setSelectedCustom(null)
      return
    }
    const agent = customAgents.find(a => a.id === item.id)
    if (!agent) return
    setSelectedCustom(agent)
    setCustomFormData({})
    setCustomResult('')
  }

  async function gerarComCustom() {
    if (!selectedCustom) return
    setLoadingCustom(true)
    setCustomResult('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/gerar-agente-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ agentId: selectedCustom.id, formData: customFormData }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value)
        setCustomResult(acc)
      }
    } catch {
      setCustomResult('Erro ao gerar petição.')
    } finally {
      setLoadingCustom(false)
    }
  }

  const gruposFiltrados = gruposDoFiltro(categoriaFiltro)

  const filteredGroups = GRUPOS.map(g => ({
    ...g,
    agentes: g.agentes.filter(a =>
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(g => g.agentes.length > 0).filter(g => gruposFiltrados === null || gruposFiltrados.includes(g.id))

  const optionStyle: React.CSSProperties = isLight
    ? { background: '#FFFFFF', color: '#1E1E1E' }
    : { background: '#111', color: '#ccc' }

  // Suprimir warnings de imports reservados para uso futuro
  void CheckCircle2; void Trash2

  const SelectedAgentIcon = selectedAgent
    ? iconeDoAgente(selectedAgent.key, selectedAgent.nome)
    : Scale

  return (
    <div className={`p-8 max-w-7xl mx-auto ${isLight ? 'bg-[#F8F8F8]' : 'bg-transparent'}`}>

      {/* HEADER */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={`text-3xl font-black mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>Agentes de Inteligência Artificial</h1>
          <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>Selecione um agente para iniciar ou gerencie os agentes disponíveis.</p>
        </div>
        <button onClick={() => setShowCustomForm(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
          <Plus size={16}/> Novo Agente
        </button>
      </div>

      {/* BUSCA + FILTRO DE CATEGORIA */}
      <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1 min-w-48 relative">
          <Search size={15} color={isLight ? '#9CA3AF' : '#555'} className="absolute left-3 top-1/2 -translate-y-1/2"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar agente..."
            className="input-glass w-full h-9 pl-9 pr-4 rounded-xl text-sm outline-none"
            spellCheck={true} />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0">
          <label htmlFor="filtro-categoria" className={`text-xs whitespace-nowrap ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
            Filtrar por categoria
          </label>
          <select id="filtro-categoria" value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}
            className="input-glass h-9 px-3 rounded-xl text-xs font-medium outline-none cursor-pointer transition-colors"
            style={{
              border: `1px solid ${categoriaFiltro === 'Todos' ? (isLight ? '#EDEDED' : 'rgba(255,255,255,0.08)') : 'rgba(212,175,55,0.45)'}`,
              color: categoriaFiltro === 'Todos' ? (isLight ? '#6B7280' : '#888') : '#D4AF37',
              maxWidth: 240,
            }}>
            <option value="Todos" style={optionStyle}>Todas as categorias</option>
            <optgroup label="Área" style={optionStyle}>
              {AREAS.map(a => (
                <option key={a.label} value={a.label} style={optionStyle}>{a.label}</option>
              ))}
            </optgroup>
            <optgroup label="Grupo" style={optionStyle}>
              {GRUPOS.map(g => (
                <option key={g.id} value={`grupo-${g.id}`} style={optionStyle}>{g.label}</option>
              ))}
            </optgroup>
          </select>
          {categoriaFiltro !== 'Todos' && (
            <button onClick={() => setCategoriaFiltro('Todos')}
              title="Remover filtro de categoria"
              className="flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold transition-colors hover:bg-white/5"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}>
              {rotuloDoFiltro(categoriaFiltro)}
              <X size={12}/>
            </button>
          )}
        </div>
      </div>

        {/* MEUS AGENTES */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              ⭐ Meus Agentes Personalizados
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{customAgents.length}</span>
            </h2>
          </div>

          {showCustomForm && (
            <div className="p-5 rounded-2xl mb-4" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: '#D4AF37' }}>Criar Agente Personalizado</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nome do agente *</label>
                  <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex: Meu modelo de aposentadoria" className="input-glass w-full px-3 text-sm" style={{ height: 40 }} spellCheck={true} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Instruções do escritório (opcional)</label>
                <textarea value={customInstrucoes} onChange={e => setCustomInstrucoes(e.target.value)}
                  placeholder="Ex: Sempre use linguagem formal. O escritório fica em São Luís/MA. OAB/MA 886/2016. Sempre incluir cláusula de honorários de 30%. Tom técnico mas acessível..."
                  className="input-glass w-full px-4 text-sm" style={{ height: 80, resize: 'none', paddingTop: 10 }} spellCheck={true} />
                <p className="text-[10px] text-gray-600 mt-1">Essas instruções serão usadas em todas as petições geradas por este agente</p>
              </div>
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">PDF do modelo *</label>
                <input type="file" accept=".pdf" onChange={e => setCustomFile(e.target.files?.[0] || null)} className="input-glass w-full px-3 text-sm" style={{ height: 40, paddingTop: 8 }}/>
              </div>
              {customError && <p className="text-xs mb-2" style={{ color: '#EF4444' }}>{customError}</p>}
              <div className="flex gap-2">
                <button onClick={uploadCustomAgent} disabled={uploadingCustom} className="btn-gold flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
                  {uploadingCustom ? <><Loader size={14} className="animate-spin"/> Analisando PDF...</> : <><Upload size={14}/> Criar Agente</>}
                </button>
                <button onClick={() => { setShowCustomForm(false); setCustomError('') }} className="px-4 py-2 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Cancelar</button>
              </div>
              {uploadingCustom && <p className="text-xs text-gray-500 mt-2">⏳ A IA está analisando seu PDF e identificando os campos... isso pode levar alguns segundos.</p>}
            </div>
          )}

          {!(showCustomForm && customAgents.length === 0) && (
            <MeusAgentesCard
              itens={itensCustomAgents}
              expandidoId={selectedCustom?.id ?? null}
              onToggle={alternarCustomAgent}
              onCriar={() => setShowCustomForm(true)}
              onExcluir={excluirCustomAgent}
              isLight={isLight}
              renderDetalhes={() => selectedCustom && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {(selectedCustom.fields || []).map((field: any) => (
                      <div key={field.id}>
                        <label className="block text-xs text-gray-400 mb-1">{field.label}{field.required && ' *'}</label>
                        <input value={customFormData[field.id] || ''} onChange={e => setCustomFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.label} className="input-glass w-full px-3 text-sm" style={{ height: 40 }} spellCheck={true} />
                      </div>
                    ))}
                  </div>
                  <button onClick={gerarComCustom} disabled={loadingCustom} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold mb-4">
                    {loadingCustom ? <><Loader size={15} className="animate-spin"/> Gerando...</> : '⚡ Gerar Petição'}
                  </button>
                  {customResult && (
                    <PeticaoEditorComPreview
                      text={customResult}
                      onChange={setCustomResult}
                      fileName={`peticao-${selectedCustom?.name?.replace(/\s/g, '-').toLowerCase() || 'custom'}`}
                      estilo={estiloPeticao}
                      streaming={loadingCustom}
                      isLight={isLight}
                      adv={advPeticao}
                      corPeticao={corPeticao}
                    />
                  )}
                </div>
              )}
            />
          )}
        </div>

      {/* GRUPOS ACCORDION */}
      <div className="space-y-3">
        {categoriaFiltro !== 'Todos' && (
          <p className="text-xs mb-4" style={{ color: '#666' }}>
            Exibindo apenas <span style={{ color: '#D4AF37' }}>{rotuloDoFiltro(categoriaFiltro)}</span>
            {' · '}
            <button onClick={() => setCategoriaFiltro('Todos')} className="underline transition-colors hover:text-white" style={{ color: '#888' }}>
              ver todas as categorias
            </button>
          </p>
        )}
        {filteredGroups.map(grupo => {
          const Icon = grupo.icon
          const isOpen = openGroups.includes(grupo.id)
          return (
            <div key={grupo.id} className="rounded-2xl overflow-hidden"
              style={{ border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => toggleGroup(grupo.id)}
                className="w-full flex items-center justify-between px-6 py-4 transition-all hover:bg-black/[0.02]"
                style={{ background: isOpen
                  ? `rgba(${grupo.color === '#D4AF37' ? '212,175,55' : grupo.color === '#22C55E' ? '34,197,94' : grupo.color === '#3B82F6' ? '59,130,246' : grupo.color === '#EF4444' ? '239,68,68' : grupo.color === '#A855F7' ? '168,85,247' : '100,100,100'},0.08)`
                  : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)') }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${grupo.color}18`, border: `1px solid ${grupo.color}30` }}>
                    <Icon size={16} color={grupo.color}/>
                  </div>
                  <span className={`font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{grupo.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${grupo.color}15`, color: grupo.color }}>
                    {grupo.agentes.length} agentes
                  </span>
                </div>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={18} color="#555"/>
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 p-5 pt-0"
                      style={{ background: isLight ? '#FFFFFF' : 'rgba(0,0,0,0.2)', border: isLight ? '1px solid #EDEDED' : 'none' }}>
                      {grupo.agentes.map(agent => {
                        const AgentIcon = iconeDoAgente(agent.key, agent.nome)
                        return (
                        <motion.div key={agent.key}
                          whileHover={{ scale: 1.02, borderColor: grupo.color }}
                          className="p-4 rounded-xl cursor-pointer transition-all"
                          style={{
                            background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.03)',
                            border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.07)',
                          }}
                          onClick={() => openAgent(agent, grupo)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center relative"
                              style={{ background: `${grupo.color}15`, border: `1px solid ${grupo.color}25` }}>
                              <AgentIcon size={16} color={grupo.color}/>
                              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500"/>
                            </div>
                          </div>
                          <div className={`text-sm font-bold mb-1 leading-snug ${isLight ? 'text-gray-900' : 'text-white'}`}>{agent.nome}</div>
                          <div className={`text-xs mb-3 leading-relaxed ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{agent.desc}</div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {agent.tags.map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: `${grupo.color}10`, color: grupo.color, border: `1px solid ${grupo.color}20` }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <button className="w-full py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                            style={{ border: `1px solid ${grupo.color}40`, color: grupo.color,
                                     background: `${grupo.color}08` }}>
                            Iniciar Agente →
                          </button>
                        </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {filteredGroups.length === 0 && (
          <div className="p-8 rounded-2xl text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-sm mb-3" style={{ color: '#888' }}>Nenhum agente encontrado com os filtros atuais.</p>
            <button onClick={() => { setCategoriaFiltro('Todos'); setSearch('') }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* MODAL DO AGENTE */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: isLight ? 'rgba(15,15,15,0.45)' : 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl ${isLight ? 'bg-white' : 'bg-[#0A0800]'}`}
              style={{
                border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.2)',
                boxShadow: isLight ? '0 24px 64px rgba(0,0,0,0.18)' : '0 0 80px rgba(180,120,10,0.15)',
              }}>

              {/* Header modal */}
              <div className="flex items-start justify-between p-6 border-b"
                style={{ borderColor: isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${selectedAgent.grupo.color}18`,
                             border: `1px solid ${selectedAgent.grupo.color}30` }}>
                    <SelectedAgentIcon size={18} color={selectedAgent.grupo.color}/>
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedAgent.nome}</div>
                    <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{selectedAgent.desc}</div>
                  </div>
                </div>
                <button onClick={() => { setSelectedAgent(null); marcarPeticaoAtiva(false) }}
                  className={`transition-colors ${isLight ? 'text-gray-400 hover:text-gray-900' : 'text-gray-600 hover:text-white'}`}>
                  <X size={20}/>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b" style={{ borderColor: isLight ? '#EDEDED' : 'rgba(255,255,255,0.06)' }}>
                {(['form', 'pdf'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="flex-1 py-3 text-sm font-medium transition-all"
                    style={{
                      color: tab === t ? '#D4AF37' : (isLight ? '#9CA3AF' : '#555'),
                      borderBottom: tab === t ? '2px solid #D4AF37' : '2px solid transparent',
                    }}>
                    {t === 'form' ? '✏️ Preencher Manualmente' : '📄 Importar PDF do INSS'}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* ABA PDF */}
                {tab === 'pdf' && (
                  <div>
                    <label className="flex flex-col items-center justify-center cursor-pointer rounded-xl transition-all"
                      style={{
                        border: '1px dashed rgba(212,175,55,0.3)',
                        background: isLight ? 'rgba(212,175,55,0.06)' : 'rgba(212,175,55,0.02)',
                        height: 160,
                      }}>
                      {uploading ? (
                        <div className="text-center">
                          <Loader2 size={32} color="#D4AF37" className="mx-auto mb-2 animate-spin"/>
                          <p className="text-sm" style={{ color: '#D4AF37' }}>Extraindo dados com IA...</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload size={32} color="rgba(212,175,55,0.4)" className="mx-auto mb-2"/>
                          <p className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Arraste o PDF aqui ou clique para selecionar</p>
                          <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>Aceita .pdf — máx 10MB</p>
                        </div>
                      )}
                      <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload}/>
                    </label>
                  </div>
                )}

                {/* ABA FORMULÁRIO */}
                {tab === 'form' && (
                  <div className="space-y-4">

                    <div>
                      <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>
                        👤 CLIENTE * <span className="font-normal normal-case tracking-normal" style={{ color: '#888' }}>(cadastrado ou nome manual abaixo)</span>
                      </label>
                      <select value={selectedClientId} onChange={e => selecionarCliente(e.target.value)}
                        className="input-glass w-full text-sm"
                        style={{ height: 44 }}>
                        <option value="" style={optionStyle}>Sem cliente cadastrado — usar nome manual</option>
                        {clientes.map(c => (
                          <option key={c.id} value={c.id} style={optionStyle}>{c.name} {c.cpf ? `— ${c.cpf}` : ''}</option>
                        ))}
                      </select>
                      {selectedClientId ? (
                        <p className="text-[10px] mt-1" style={{ color: '#22C55E' }}>✅ Cliente vinculado — dados preenchidos automaticamente</p>
                      ) : (
                        <p className="text-[10px] mt-1" style={{ color: '#F59E0B' }}>Informe o nome do cliente no campo abaixo se ainda não estiver cadastrado</p>
                      )}
                    </div>

                    {/* Seletor de modelos prontos */}
                    <SeletorModelo
                      agentType={selectedAgent.key}
                      onSelect={desc => setContexto(desc)}
                      isLight={isLight}
                    />

                    {/* Campos específicos do agente */}
                    {selectedAgent.key.includes('salario-maternidade') && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                              style={{ color: 'rgba(212,175,55,0.7)' }}>NOME DA CRIANÇA*</label>
                            <input
                              type="text"
                              placeholder="João da Silva"
                              className="input-glass w-full text-sm"
                              value={formData.nome_crianca || ''}
                              onChange={e => {
                                const v = e.target.value
                                setFormData(p => ({ ...p, nome_crianca: v }))
                              }}
                              onBlur={e => {
                                const msg = validarNomeCrianca(e.target.value)
                                setFormErrors(p => ({ ...p, nome_crianca: msg || undefined }))
                              }}
                              style={formErrors.nome_crianca ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                              spellCheck={true}
                            />
                            {formErrors.nome_crianca ? (
                              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.nome_crianca}</p>
                            ) : null}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                              style={{ color: 'rgba(212,175,55,0.7)' }}>DATA DE NASCIMENTO DA CRIANÇA*</label>
                            <input
                              type="date"
                              min="1900-01-01"
                              max="2100-12-31"
                              className="input-glass w-full text-sm"
                              value={formData.data_nascimento_crianca || ''}
                              onChange={e => setFormData(p => ({ ...p, data_nascimento_crianca: e.target.value }))}
                              onBlur={e => {
                                const msg = validarDataPeticao(e.target.value, true)
                                setFormErrors(p => ({ ...p, data_nascimento_crianca: msg || undefined }))
                              }}
                              style={formErrors.data_nascimento_crianca ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                            />
                            {formErrors.data_nascimento_crianca ? (
                              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_nascimento_crianca}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                              style={{ color: 'rgba(212,175,55,0.7)' }}>NB (NÚMERO DO BENEFÍCIO)</label>
                            <input
                              type="text"
                              placeholder="232.919.244-9"
                              className="input-glass w-full text-sm"
                              value={formData.nb || ''}
                              onChange={e => {
                                const v = e.target.value.replace(/[^\d.\-]/g, '')
                                setFormData(p => ({ ...p, nb: v }))
                              }}
                              onBlur={e => {
                                const msg = validarNb(e.target.value)
                                setFormErrors(p => ({ ...p, nb: msg || undefined }))
                              }}
                              style={formErrors.nb ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                              inputMode="numeric"
                              spellCheck={false}
                            />
                            {formErrors.nb ? (
                              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.nb}</p>
                            ) : null}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                              style={{ color: 'rgba(212,175,55,0.7)' }}>DATA DO REQUERIMENTO*</label>
                            <input
                              type="date"
                              min="1900-01-01"
                              max="2100-12-31"
                              className="input-glass w-full text-sm"
                              value={formData.data_requerimento || ''}
                              onChange={e => setFormData(p => ({ ...p, data_requerimento: e.target.value }))}
                              onBlur={e => {
                                const msg = validarDataPeticao(e.target.value, true)
                                setFormErrors(p => ({ ...p, data_requerimento: msg || undefined }))
                              }}
                              style={formErrors.data_requerimento ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                            />
                            {formErrors.data_requerimento ? (
                              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_requerimento}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                              style={{ color: 'rgba(212,175,55,0.7)' }}>DATA DO INDEFERIMENTO*</label>
                            <input
                              type="date"
                              min="1900-01-01"
                              max="2100-12-31"
                              className="input-glass w-full text-sm"
                              value={formData.data_indeferimento || ''}
                              onChange={e => setFormData(p => ({ ...p, data_indeferimento: e.target.value }))}
                              onBlur={e => {
                                const msg = validarDataPeticao(e.target.value, true)
                                setFormErrors(p => ({ ...p, data_indeferimento: msg || undefined }))
                              }}
                              style={formErrors.data_indeferimento ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                            />
                            {formErrors.data_indeferimento ? (
                              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_indeferimento}</p>
                            ) : null}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                              style={{ color: 'rgba(212,175,55,0.7)' }}>PERÍODO DE ATIVIDADE RURAL*</label>
                            <input
                              type="text"
                              placeholder="Desde os 12 anos de idade"
                              className="input-glass w-full text-sm"
                              value={formData.periodo_segurado || ''}
                              onChange={e => setFormData(p => ({ ...p, periodo_segurado: e.target.value }))}
                              onBlur={e => {
                                const msg = validarPeriodoSegurado(e.target.value)
                                setFormErrors(p => ({ ...p, periodo_segurado: msg || undefined }))
                              }}
                              style={formErrors.periodo_segurado ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                              spellCheck={true}
                            />
                            {formErrors.periodo_segurado ? (
                              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.periodo_segurado}</p>
                            ) : null}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                            style={{ color: 'rgba(212,175,55,0.7)' }}>MOTIVO DO INDEFERIMENTO INSS*</label>
                          <textarea placeholder="Ex: Falta de período de carência anterior ao nascimento"
                            className="input-glass w-full text-sm" style={{ height: 80, resize: 'none' }}
                            value={formData.motivo_inss || ''}
                            onChange={e => setFormData(p => ({ ...p, motivo_inss: e.target.value }))} spellCheck={true} />
                        </div>
                      </>
                    )}

                    {/* Nome e CPF do cliente (todos os agentes) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                          style={{ color: 'rgba(212,175,55,0.7)' }}>NOME DO CLIENTE*</label>
                        <input type="text" placeholder="Maria da Silva" className="input-glass w-full text-sm"
                          value={formData.nome || ''}
                          onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} spellCheck={true} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                          style={{ color: 'rgba(212,175,55,0.7)' }}>CPF DO CLIENTE*</label>
                        <input type="text" placeholder="000.000.000-00" className="input-glass w-full text-sm"
                          value={formData.cpf || ''}
                          onChange={e => setFormData(p => ({ ...p, cpf: e.target.value }))} spellCheck={true} />
                      </div>
                    </div>

                    {/* Provas (apenas rural) */}
                    {(selectedAgent.key.includes('rural') || selectedAgent.key.includes('pescador') || selectedAgent.key.includes('maternidade')) && (
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest mb-2"
                          style={{ color: 'rgba(212,175,55,0.7)' }}>PROVAS DISPONÍVEIS</label>
                        <div className="space-y-2">
                          {provasOpcoes.map(prova => (
                            <label key={prova} className="flex items-center gap-2 cursor-pointer">
                              <div onClick={() => setProvas(p => p.includes(prova) ? p.filter(x => x !== prova) : [...p, prova])}
                                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  background: provas.includes(prova) ? '#D4AF37' : 'transparent',
                                  border: `1px solid ${provas.includes(prova) ? '#D4AF37' : (isLight ? '#D1D5DB' : 'rgba(255,255,255,0.15)')}`,
                                }}>
                                {provas.includes(prova) && <span className="text-black text-[9px] font-black">✓</span>}
                              </div>
                              <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{prova}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contexto adicional */}
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest mb-1.5"
                        style={{ color: 'rgba(212,175,55,0.7)' }}>CONTEXTO ADICIONAL / OBSERVAÇÕES</label>
                      <textarea
                        placeholder="Descreva detalhes do caso, contexto da cliente, informações relevantes..."
                        className="input-glass w-full text-sm" style={{ height: 100, resize: 'none' }}
                        value={contexto}
                        onChange={e => setContexto(e.target.value)} spellCheck={true} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>
                        ✨ O QUE MAIS VOCÊ QUER NA PETIÇÃO?
                      </label>
                      <textarea
                        placeholder="Ex: Incluir pedido de tutela de urgência, citar ADI 2110, enfatizar trabalho em regime de economia familiar, mencionar laudos específicos..."
                        className="input-glass w-full text-sm" style={{ height: 80, resize: 'none' }}
                        value={formData.extras || ''}
                        onChange={e => setFormData(p => ({ ...p, extras: e.target.value }))} spellCheck={true} />
                      <p className={`text-[10px] mt-1 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>A IA vai incluir essas instruções específicas na petição</p>
                    </div>

                    {/* Upload de imagens/provas */}
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>
                        📎 ANEXAR IMAGENS DE PROVA (opcional)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl transition-all hover:bg-white/5" style={{ border: '1px dashed rgba(212,175,55,0.3)', display: 'inline-flex' }}>
                        <Upload size={14} color="#D4AF37"/>
                        <span className="text-xs" style={{ color: '#D4AF37' }}>Selecionar imagens</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagemUpload}/>
                      </label>
                      {imagensPreview.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {imagensPreview.map((src, i) => (
                            <div key={i} className="relative">
                              <img src={src} alt={`prova-${i}`} className="w-16 h-16 object-cover rounded-lg" style={{ border: '1px solid rgba(212,175,55,0.3)' }}/>
                              <button onClick={() => removerImagem(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]" style={{ background: '#EF4444', color: '#fff' }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>ESTILO DE FORMATAÇÃO</label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { id: 'moderno' as const, label: 'Moderno', desc: 'Barras coloridas' },
                            { id: 'classico' as const, label: 'Clássico/Sóbrio', desc: 'Preto · negrito · sublinhado' },
                          ]).map(op => {
                            const ativo = estiloPeticao === op.id
                            return (
                              <button
                                key={op.id}
                                type="button"
                                onClick={() => setEstiloPeticao(op.id)}
                                className="text-left px-3 py-2.5 rounded-xl transition-all"
                                style={{
                                  background: ativo
                                    ? 'rgba(212,175,55,0.12)'
                                    : (isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)'),
                                  border: ativo
                                    ? '1px solid rgba(212,175,55,0.4)'
                                    : (isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.08)'),
                                }}
                              >
                                <div className={`text-xs font-bold ${ativo ? 'text-[#D4AF37]' : (isLight ? 'text-gray-900' : 'text-gray-300')}`}>{op.label}</div>
                                <div className={`text-[10px] mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{op.desc}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {estiloPeticao === 'moderno' && (
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.7)' }}>COR DA BARRA</label>
                          <input type="color" value={corPeticao} onChange={e => setCorPeticao(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}/>
                          <div className="flex items-center gap-1">
                            {['#1d4ed8', '#D4AF37', '#16a34a', '#dc2626', '#7c3aed', '#000000'].map(cor => (
                              <button key={cor} onClick={() => setCorPeticao(cor)}
                                className="w-5 h-5 rounded-full transition-all hover:scale-110"
                                style={{ background: cor, border: corPeticao === cor ? `2px solid ${isLight ? '#1E1E1E' : '#fff'}` : '2px solid transparent' }}/>
                            ))}
                          </div>
                          <div className="flex-1 h-6 rounded" style={{ background: `linear-gradient(135deg, ${corPeticao}, ${corPeticao}dd)` }}>
                            <span className="text-white text-[9px] font-bold px-2 leading-6 inline-block">PRÉVIA</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botão gerar */}
                    <button onClick={iniciarGeracao} disabled={streaming}
                      className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: streaming ? '#333' : 'linear-gradient(135deg,#D4AF37,#F0D060)',
                        color: streaming ? '#888' : '#000',
                      }}>
                      {streaming
                        ? <><Loader2 size={16} className="animate-spin"/> Gerando petição...</>
                        : <><Sparkles size={16}/> Gerar Petição</>}
                    </button>
                  </div>
                )}

                {/* EDITOR + PRÉVIA PDF */}
                {result && (
                  <div className="mt-6">
                    <PeticaoEditorComPreview
                      text={result}
                      onChange={setResult}
                      fileName={slugArquivoPeticaoSm(
                        (formData.nome || '').trim() || 'cliente',
                      )}
                      estilo={estiloPeticao}
                      streaming={streaming}
                      isLight={isLight}
                      adv={advPeticao}
                      corPeticao={corPeticao}
                      agentType={selectedAgent?.key || null}
                      clientId={selectedClient || null}
                      clientName={(formData.nome || '').trim() || null}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTimelineConfig && (
        <ConfigurarTimelineSm
          formData={formData}
          isLight={isLight}
          onCancel={() => setShowTimelineConfig(false)}
          onConfirm={(data) => void handleGenerate(data)}
        />
      )}
    </div>
  )
}
