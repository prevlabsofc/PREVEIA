'use client'
import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import {
  Search, ExternalLink, BookmarkPlus, Trash2, Scale, Bell, RefreshCw, Loader2, BellOff,
} from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { MarkdownMessage } from '@/components/MarkdownMessage'
import { ScrollFade } from '@/components/ScrollFade'
import { ConsultaProcessoDatajud } from '@/components/ConsultaProcessoDatajud'
import { carregarMembrosEscritorio } from '@/lib/equipe'
import {
  TIPOS_ALERTA_MOVIMENTO,
  normalizarTiposAlerta,
  type TipoAlertaMovimentoId,
} from '@/lib/alertas-movimentos'
import { TRIBUNAIS_PRINCIPAIS } from '@/lib/tribunais'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TRIBUNAIS = [
  { nome: 'STF', url: 'https://portal.stf.jus.br/processos/detalhe.asp?incidente=', prefixo: 'STF', dica: 'Supremo Tribunal Federal' },
  { nome: 'STJ', url: 'https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo=', prefixo: 'STJ', dica: 'Superior Tribunal de Justiça' },
  { nome: 'TRF1', url: 'https://pje.trf1.jus.br/pje/ConsultaPublica/listView.seam?NUMERO_UNICO=', prefixo: 'TRF1', dica: 'Tribunal Regional Federal 1ª Região (MA, PA, AM, etc)' },
  { nome: 'TRF2', url: 'https://pje.trf2.jus.br/pje/ConsultaPublica/listView.seam?NUMERO_UNICO=', prefixo: 'TRF2', dica: 'Tribunal Regional Federal 2ª Região (RJ, ES)' },
  { nome: 'TRF3', url: 'https://pje.trf3.jus.br/pje/ConsultaPublica/listView.seam?NUMERO_UNICO=', prefixo: 'TRF3', dica: 'Tribunal Regional Federal 3ª Região (SP, MS)' },
  { nome: 'TRF4', url: 'https://eproc.trf4.jus.br/eproc2trf4/controlador.php?acao=consulta_processual_pesquisa&acao_origem=ir_para_home_gaveta&num_processo=', prefixo: 'TRF4', dica: 'Tribunal Regional Federal 4ª Região (RS, SC, PR)' },
  { nome: 'TRF5', url: 'https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam?NUMERO_UNICO=', prefixo: 'TRF5', dica: 'Tribunal Regional Federal 5ª Região (CE, PE, AL, etc)' },
  { nome: 'TJMA', url: 'https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam?NUMERO_UNICO=', prefixo: 'TJMA', dica: 'Tribunal de Justiça do Maranhão' },
  { nome: 'TNU', url: 'https://www.cjf.jus.br/consultas/infojud/processo.php?proc=', prefixo: 'TNU', dica: 'Turma Nacional de Uniformização' },
  { nome: 'CARF', url: 'https://carf.fazenda.gov.br/sincon/public/pages/ConsultarJurisprudencia/listarJurisprudenciaCarf.jsf?numero=', prefixo: 'CARF', dica: 'Conselho Administrativo de Recursos Fiscais' },
]

function detectarTribunal(numero: string): string {
  const n = numero.toUpperCase().replace(/\s/g, '')
  if (n.startsWith('STF') || n.includes('ADI') || n.includes('ADC') || n.includes('ADPF')) return 'STF'
  if (n.startsWith('STJ') || n.includes('RESP') || n.includes('AGRESP') || n.includes('REsp')) return 'STJ'
  if (n.startsWith('TNU') || n.includes('PEDILEF')) return 'TNU'
  if (n.startsWith('TJMA')) return 'TJMA'
  const cnjMatch = n.match(/\d{7}-\d{2}\.\d{4}\.(\d)\.\d{2}\.\d{4}/)
  if (cnjMatch) {
    const justica = cnjMatch[1]
    if (justica === '4') {
      const secao = n.match(/\d{7}-\d{2}\.\d{4}\.4\.(\d{2})\.\d{4}/)
      if (secao) {
        const cod = parseInt(secao[1])
        if (cod === 1) return 'TRF1'
        if (cod === 2) return 'TRF2'
        if (cod === 3) return 'TRF3'
        if (cod === 4) return 'TRF4'
        if (cod === 5) return 'TRF5'
      }
    }
    if (justica === '8') return 'TJMA'
  }
  return 'TRF1'
}

interface Processo {
  id: string
  numero: string
  tribunal: string
  cliente: string
  cliente_id?: string | null
  obs: string
  created_at: string
  alertas_movimentos?: TipoAlertaMovimentoId[] | unknown
  alertas_desde?: string | null
  ultima_consulta_movimentos_em?: string | null
}

function MultiSelectAlertas({
  value,
  onChange,
  isLight,
  compact = false,
}: {
  value: TipoAlertaMovimentoId[]
  onChange: (v: TipoAlertaMovimentoId[]) => void
  isLight: boolean
  compact?: boolean
}) {
  function toggle(id: TipoAlertaMovimentoId) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else onChange([...value, id])
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {!compact && (
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Selecione os tipos de movimento que geram aviso automático ao cliente por e-mail.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {TIPOS_ALERTA_MOVIMENTO.map((t) => {
          const ativo = value.includes(t.id)
          return (
            <button
              key={t.id}
              type="button"
              title={t.descricao}
              onClick={() => toggle(t.id)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
              style={{
                background: ativo ? 'rgba(212,175,55,0.18)' : isLight ? '#F3F3F3' : 'rgba(255,255,255,0.04)',
                color: ativo ? '#D4AF37' : '#888',
                border: `1px solid ${ativo ? 'rgba(212,175,55,0.45)' : isLight ? '#E5E5E5' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProcessosPage() {
  const [isLight, setIsLight] = useState(false)
  const [numero, setNumero] = useState('')
  const [tribunalSel, setTribunalSel] = useState('')
  const [tribunalDetectado, setTribunalDetectado] = useState('')
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteSel, setClienteSel] = useState('')
  const [obs, setObs] = useState('')
  const [alertasNovos, setAlertasNovos] = useState<TipoAlertaMovimentoId[]>([])
  const [processos, setProcessos] = useState<Processo[]>([])
  const [salvando, setSalvando] = useState(false)
  const [userId, setUserId] = useState('')
  const [analiseNum, setAnaliseNum] = useState('')
  const [analiseInfo, setAnaliseInfo] = useState('')
  const [analiseResult, setAnaliseResult] = useState('')
  const [analisando, setAnalisando] = useState(false)
  const [buscaProcessos, setBuscaProcessos] = useState('')
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [editandoAlertasId, setEditandoAlertasId] = useState<string | null>(null)
  const [alertasEdit, setAlertasEdit] = useState<TipoAlertaMovimentoId[]>([])
  const [salvandoAlertas, setSalvandoAlertas] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [msgVerificacao, setMsgVerificacao] = useState('')

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
      setUserId(user.id)
      const membros = await carregarMembrosEscritorio(supabase, user.id)
      const memberIds = membros.map((m) => m.id)
      const [{ data: cli }, { data: procs }] = await Promise.all([
        supabase.from('clients').select('id, name, status, email').in('lawyer_id', memberIds).order('name'),
        supabase.from('processos').select('*').in('lawyer_id', memberIds).order('created_at', { ascending: false }),
      ])
      setClientes(cli || [])
      setProcessos((procs as Processo[]) || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (numero.length > 5) {
      const det = detectarTribunal(numero)
      setTribunalDetectado(det)
      if (!tribunalSel) setTribunalSel(det)
    }
  }, [numero])

  function abrirNoTribunal() {
    const tribunal = TRIBUNAIS.find(t => t.nome === (tribunalSel || tribunalDetectado))
    if (!tribunal) return
    const url = tribunal.url + encodeURIComponent(numero.trim())
    window.open(url, '_blank')
  }

  /**
   * Ao escolher um tribunal no <select>, além de guardar a seleção, já abrimos
   * o portal oficial (mapa `TRIBUNAIS` acima) quando já existe um número digitado —
   * sem isso a troca de tribunal não tinha nenhum efeito perceptível na tela e
   * dependia do advogado notar e clicar no botão "Abrir no Tribunal" logo abaixo.
   * Não existe API oficial única para os ~10 tribunais aqui listados (o Datajud do
   * CNJ cobre STJ/TRF1-5/TJMA, mas não STF/TNU/CARF — ver lib/datajud.ts), então o
   * redirecionamento ao portal público continua sendo a via honesta para esses casos.
   */
  function selecionarTribunal(nome: string) {
    setTribunalSel(nome)
    if (!nome || !numero.trim()) return
    const tribunal = TRIBUNAIS.find(t => t.nome === nome)
    if (!tribunal) return
    window.open(tribunal.url + encodeURIComponent(numero.trim()), '_blank', 'noopener,noreferrer')
  }

  async function salvarProcesso() {
    if (!numero || !tribunalSel) return
    setSalvando(true)
    const cliente = clientes.find(c => c.id === clienteSel)
    const tipos = normalizarTiposAlerta(alertasNovos)
    const { data } = await supabase.from('processos').insert({
      lawyer_id: userId,
      numero: numero.trim(),
      tribunal: tribunalSel,
      cliente: cliente?.name || '',
      cliente_id: clienteSel || null,
      obs: obs.trim(),
      alertas_movimentos: tipos,
      alertas_desde: tipos.length > 0 ? new Date().toISOString() : null,
    }).select().single()
    if (data) setProcessos(prev => [data as Processo, ...prev])
    setNumero(''); setTribunalSel(''); setClienteSel(''); setObs(''); setAlertasNovos([])
    setSalvando(false)
  }

  async function excluirProcesso(id: string) {
    await supabase.from('processos').delete().eq('id', id)
    setProcessos(prev => prev.filter(p => p.id !== id))
  }

  function abrirProcessoSalvo(p: Processo) {
    const tribunal = TRIBUNAIS.find(t => t.nome === p.tribunal)
    if (!tribunal) return
    window.open(tribunal.url + encodeURIComponent(p.numero), '_blank')
  }

  function abrirEdicaoAlertas(p: Processo) {
    setEditandoAlertasId(p.id)
    setAlertasEdit(normalizarTiposAlerta(p.alertas_movimentos))
  }

  async function salvarAlertasProcesso(id: string) {
    setSalvandoAlertas(true)
    const tipos = normalizarTiposAlerta(alertasEdit)
    const patch = {
      alertas_movimentos: tipos,
      alertas_desde: tipos.length > 0 ? new Date().toISOString() : null,
    }
    const { data, error } = await supabase
      .from('processos')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setProcessos(prev => prev.map(p => (p.id === id ? (data as Processo) : p)))
      setEditandoAlertasId(null)
    }
    setSalvandoAlertas(false)
  }

  async function verificarAgora() {
    setVerificando(true)
    setMsgVerificacao('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setMsgVerificacao('Faça login novamente para verificar.')
        return
      }
      const res = await fetch('/api/monitorar-processos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgVerificacao(data?.error || 'Falha ao verificar movimentos.')
        return
      }
      setMsgVerificacao(
        `Verificados: ${data.verificados}. Avisos enviados: ${data.alertas_enviados}. Sem e-mail: ${data.sem_email}.`,
      )
      const membros = await carregarMembrosEscritorio(supabase, userId)
      const memberIds = membros.map((m) => m.id)
      const { data: procs } = await supabase
        .from('processos')
        .select('*')
        .in('lawyer_id', memberIds)
        .order('created_at', { ascending: false })
      setProcessos((procs as Processo[]) || [])
    } catch {
      setMsgVerificacao('Erro de conexão ao verificar.')
    } finally {
      setVerificando(false)
    }
  }

  async function analisarProcesso() {
    if (!analiseNum && !analiseInfo) return
    setAnalisando(true)
    setAnaliseResult('')
    const prompt = `Você é um especialista em Direito Previdenciário brasileiro. Analise o processo abaixo e forneça um parecer completo:

NÚMERO DO PROCESSO: ${analiseNum || 'Não informado'}
TRIBUNAL: ${tribunalSel || 'Não identificado'}
INFORMAÇÕES DO CASO: ${analiseInfo}

Forneça:
1. TIPO DE AÇÃO — Identifique o tipo de ação previdenciária
2. ANÁLISE PRELIMINAR — O que o número/informações revelam sobre o caso
3. PROBABILIDADE DE ÊXITO — Estime em % com justificativa baseada em jurisprudência atual (STJ, STF, TNU)
4. PONTOS FAVORÁVEIS — O que fortalece o caso
5. RISCOS — O que pode comprometer
6. JURISPRUDÊNCIAS APLICÁVEIS — Decisões relevantes do STJ/STF/TNU
7. ESTRATÉGIA RECOMENDADA — Melhor abordagem processual
8. PRÓXIMOS PASSOS — O que fazer agora`

    try {
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value)
        setAnaliseResult(acc)
      }
    } catch {
      setAnaliseResult('Erro ao analisar. Tente novamente.')
    } finally {
      setAnalisando(false)
    }
  }

  const archivedClientIds = useMemo(
    () => new Set(clientes.filter((c: any) => c.status === 'archived').map((c: any) => c.id as string)),
    [clientes]
  )

  const processosVisiveis = useMemo(() => {
    const termo = buscaProcessos.trim().toLowerCase()
    const temBusca = termo.length > 0

    return processos.filter((p) => {
      const arquivado = Boolean(p.cliente_id && archivedClientIds.has(p.cliente_id))
      if (!temBusca && !mostrarArquivados && arquivado) return false
      if (!temBusca && mostrarArquivados && !arquivado) return false
      if (!temBusca) return true

      const hay = [p.numero, p.tribunal, p.cliente, p.obs].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(termo)
    })
  }, [processos, archivedClientIds, mostrarArquivados, buscaProcessos])

  const inputCls = "input-glass w-full px-4 text-sm"
  const clienteSemEmail = clienteSel
    ? !String(clientes.find((c) => c.id === clienteSel)?.email || '').trim()
    : false

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <Scale size={28} color="#D4AF37"/>
          <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Consulta de </span>
          <span className="text-gradient-gold">Processos</span>
        </h1>
        <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Acesse processos nos tribunais e monitore seus casos</p>
      </motion.div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-4">
          <GlassCard intensity={0.4} style={{ padding: 24 }}>
            <h3 className="font-bold mb-4" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Buscar Processo</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Número do processo</label>
                <input value={numero} onChange={e => setNumero(e.target.value)}
                  placeholder="Ex: 0000000-00.0000.4.01.0000" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                {tribunalDetectado && (
                  <p className="text-[10px] mt-1" style={{ color: '#D4AF37' }}>
                    Tribunal detectado: {tribunalDetectado}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tribunal</label>
                <select value={tribunalSel} onChange={e => selecionarTribunal(e.target.value)} className={inputCls} style={{ height: 44 }}>
                  <option value="" style={{ background: '#111' }}>Selecionar tribunal...</option>
                  {TRIBUNAIS.map(t => <option key={t.nome} value={t.nome} style={{ background: '#111' }}>{t.nome} — {t.dica}</option>)}
                </select>
                {tribunalSel && (
                  <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: '#888' }}>
                    {numero.trim()
                      ? <>Portal aberto em nova aba — <span style={{ color: '#D4AF37' }}>{TRIBUNAIS.find(t => t.nome === tribunalSel)?.dica}</span></>
                      : <>Digite o número do processo para abrir direto no portal do <span style={{ color: '#D4AF37' }}>{tribunalSel}</span></>}
                  </p>
                )}
              </div>
              <button onClick={abrirNoTribunal} disabled={!numero || !tribunalSel}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold">
                <ExternalLink size={16}/> Abrir no Tribunal
              </button>

              <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs text-gray-500 mb-3">Salvar processo no monitoramento:</p>
                <div className="space-y-2">
                  <select value={clienteSel} onChange={e => setClienteSel(e.target.value)} className={inputCls} style={{ height: 40 }}>
                    <option value="" style={{ background: '#111' }}>Vincular a cliente (opcional)</option>
                    {clientes.map(c => <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.name}</option>)}
                  </select>
                  {clienteSemEmail && alertasNovos.length > 0 && (
                    <p className="text-[10px]" style={{ color: '#F59E0B' }}>
                      Este cliente não tem e-mail. Os avisos serão ignorados até cadastrar o e-mail.
                    </p>
                  )}
                  <input value={obs} onChange={e => setObs(e.target.value)}
                    placeholder="Observação (opcional)" className={inputCls} style={{ height: 40 }} spellCheck={true} />
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.02)',
                      border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Bell size={12} color="#D4AF37" />
                      <span className="text-[11px] font-bold" style={{ color: isLight ? '#1E1E1E' : '#ccc' }}>
                        Avisar cliente por e-mail
                      </span>
                    </div>
                    <MultiSelectAlertas
                      value={alertasNovos}
                      onChange={setAlertasNovos}
                      isLight={isLight}
                    />
                  </div>
                  <button onClick={salvarProcesso} disabled={salvando || !numero || !tribunalSel}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors hover:bg-white/5"
                    style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                    <BookmarkPlus size={15}/> {salvando ? 'Salvando...' : 'Salvar para monitorar'}
                  </button>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard intensity={0.3} style={{ padding: 20 }}>
            <ConsultaProcessoDatajud isLight={isLight} numeroInicial={numero} />
          </GlassCard>
        </div>

        <div className="col-span-3">
          <GlassCard intensity={0.3} style={{ padding: 24, minHeight: 400 }}>
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="font-bold flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                <Scale size={16} color="#D4AF37"/> Processos Monitorados ({processosVisiveis.length})
              </h3>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  onClick={verificarAgora}
                  disabled={verificando}
                  className="px-3 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5"
                  style={{
                    background: 'rgba(212,175,55,0.12)',
                    color: '#D4AF37',
                    border: '1px solid rgba(212,175,55,0.3)',
                  }}
                >
                  {verificando ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Verificar agora
                </button>
                {(['Ativos', 'Arquivados'] as const).map((aba) => {
                  const ativo = (aba === 'Arquivados') === mostrarArquivados
                  return (
                    <button
                      key={aba}
                      type="button"
                      onClick={() => setMostrarArquivados(aba === 'Arquivados')}
                      className="px-3 py-1 rounded-full text-[10px] font-bold transition-colors"
                      style={{
                        background: ativo ? '#D4AF37' : 'rgba(255,255,255,0.04)',
                        color: ativo ? '#000' : '#888',
                        border: `1px solid ${ativo ? '#D4AF37' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {aba}
                    </button>
                  )
                })}
              </div>
            </div>
            {msgVerificacao && (
              <p className="text-[10px] mb-3" style={{ color: '#888' }}>{msgVerificacao}</p>
            )}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#666' }} />
              <input
                value={buscaProcessos}
                onChange={(e) => setBuscaProcessos(e.target.value)}
                placeholder="Buscar processo (inclui arquivados)..."
                className={inputCls}
                style={{ height: 40, paddingLeft: 36 }} spellCheck={true} />
            </div>
            {processosVisiveis.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Scale size={36} color="#333" className="mx-auto mb-3"/>
                <p className="text-sm text-gray-500">
                  {buscaProcessos.trim()
                    ? 'Nenhum processo encontrado'
                    : mostrarArquivados
                      ? 'Nenhum processo de caso arquivado'
                      : 'Nenhum processo salvo ainda'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {buscaProcessos.trim() ? 'Tente outro termo.' : 'Busque um processo e salve para monitorar'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {processosVisiveis.map(p => {
                  const arquivado = Boolean(p.cliente_id && archivedClientIds.has(p.cliente_id))
                  const tipos = normalizarTiposAlerta(p.alertas_movimentos)
                  const editando = editandoAlertasId === p.id
                  return (
                  <div key={p.id} className="p-3 rounded-xl transition-colors hover:bg-white/5"
                    style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{p.tribunal}</span>
                          {arquivado && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(136,136,136,0.15)', color: '#888' }}>Arquivado</span>
                          )}
                          {tipos.length > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                              <Bell size={9} /> {tipos.length} alerta{tipos.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: 'rgba(136,136,136,0.1)', color: '#777' }}>
                              <BellOff size={9} /> Sem alerta
                            </span>
                          )}
                          <span className="text-xs font-mono truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{p.numero}</span>
                        </div>
                        {p.cliente && <div className="text-[10px] text-gray-500">👤 {p.cliente}</div>}
                        {p.obs && <div className="text-[10px] text-gray-600 truncate">{p.obs}</div>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => (editando ? setEditandoAlertasId(null) : abrirEdicaoAlertas(p))}
                          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                          style={{ color: '#D4AF37' }}
                          title="Configurar alertas ao cliente"
                        >
                          <Bell size={14}/>
                        </button>
                        <button onClick={() => abrirProcessoSalvo(p)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#D4AF37' }}>
                          <ExternalLink size={14}/>
                        </button>
                        <button onClick={() => excluirProcesso(p.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#EF4444' }}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                    {editando && (
                      <div
                        className="mt-3 pt-3"
                        style={{ borderTop: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <MultiSelectAlertas
                          value={alertasEdit}
                          onChange={setAlertasEdit}
                          isLight={isLight}
                          compact
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => salvarAlertasProcesso(p.id)}
                            disabled={salvandoAlertas}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            style={{ background: '#D4AF37', color: '#000' }}
                          >
                            {salvandoAlertas ? 'Salvando...' : 'Salvar alertas'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoAlertasId(null)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                            style={{ color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <div className="mt-6">
        <GlassCard gold intensity={0.5} style={{ padding: 28 }}>
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
            🧠 Análise de Processo via IA
          </h3>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              Informações do Caso <span style={{ color: '#D4AF37' }}>*</span>
            </label>
            <textarea
              value={analiseInfo}
              onChange={e => setAnaliseInfo(e.target.value)}
              placeholder={"Descreva o caso com o máximo de detalhes: tipo de benefício, idade do cliente, tempo de contribuição, documentos disponíveis, indeferimentos anteriores, particularidades relevantes...\n\nEx: Aposentadoria rural, cliente 60 anos, trabalhou 30 anos no campo..."}
              rows={9}
              className={`${inputCls} font-mono leading-relaxed resize-y`}
              style={{ minHeight: 220, maxHeight: 420, paddingTop: 14, paddingBottom: 14 }} spellCheck={true} />
            <p className="text-[10px] mt-1.5" style={{ color: '#666' }}>
              Quanto mais detalhes, mais precisa será a análise da IA — este é o principal campo desta etapa.
            </p>
          </div>
          <div className="mb-4" style={{ maxWidth: 360 }}>
            <label className="block text-xs text-gray-400 mb-1">Número do processo (opcional)</label>
            <input value={analiseNum} onChange={e => setAnaliseNum(e.target.value)}
              placeholder="Ex: 0000000-00.0000.4.01.0000" className={inputCls} style={{ height: 40 }} spellCheck={true} />
          </div>
          <button onClick={analisarProcesso} disabled={analisando || (!analiseNum && !analiseInfo)}
            className="btn-gold flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold mb-4">
            {analisando ? <><span className="animate-spin">⚡</span> Analisando...</> : '⚡ Analisar com IA'}
          </button>
          {analiseResult && (
            <ScrollFade
              className="p-4"
              style={{ maxHeight: 400 }}
              radius={16}
              fadeRgb={isLight ? '248,248,248' : '6,6,6'}
              wrapperStyle={{ background: isLight ? '#F8F8F8' : 'rgba(0,0,0,0.3)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)' }}
            >
              <MarkdownMessage content={analiseResult} isLight={isLight} fontes />
            </ScrollFade>
          )}
        </GlassCard>
      </div>

      <div className="mt-6">
        <GlassCard intensity={0.2} style={{ padding: 20 }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Acesso rápido</h3>
          <p className="text-[10px] text-gray-500 mb-3 -mt-1.5">Atalhos para os portais oficiais dos tribunais</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {TRIBUNAIS_PRINCIPAIS.map(t => (
              <a
                key={t.sigla}
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${t.sigla} — ${t.nome}`}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-colors hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.06]"
                style={{
                  background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.03)',
                  border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                  style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
                >
                  {t.sigla}
                </span>
                <span className="text-[10px] leading-tight line-clamp-2" style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>
                  {t.nome}
                </span>
                <ExternalLink size={10} style={{ color: '#666' }} />
              </a>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
