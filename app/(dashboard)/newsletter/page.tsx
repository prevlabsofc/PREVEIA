'use client'
import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Plus, Trash2, Send, Users, Loader2, CheckCircle, AlertCircle, Scale, RefreshCw } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { GerarSugestaoConteudo } from '@/components/newsletter/GerarSugestaoConteudo'
import { HubJurisprudencias } from '@/components/newsletter/HubJurisprudencias'
import { EditorTagsInscrito } from '@/components/newsletter/EditorTagsInscrito'
import { FiltroTagsEnvio } from '@/components/newsletter/FiltroTagsEnvio'
import { validarEmail, normalizarEmail } from '@/lib/validar-email'
import { inscritoCasaComTags, mesclarTags, tagDeTipoBeneficio } from '@/lib/newsletter-tags'
import { consumirContextoNewsletter } from '@/lib/extracao-documento-pdf'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Segmento = 'cliente' | 'lead'
type SegmentoEnvio = Segmento | 'todos'
type Aba = 'enviar' | 'atualizacoes' | 'inscritos' | 'historico'

const ROTULO_SEGMENTO: Record<Segmento, string> = {
  cliente: 'Cliente',
  lead: 'Lead / Inscrito',
}

export default function NewsletterPage() {
  const [isLight, setIsLight] = useState(false)
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [envios, setEnvios] = useState<any[]>([])
  const [eventosPorEnvio, setEventosPorEnvio] = useState<Record<string, { opens: number; clicks: number }>>({})
  const [eventosPorInscrito, setEventosPorInscrito] = useState<Record<string, { opens: number; clicks: number }>>({})
  const [aba, setAba] = useState<Aba>('enviar')
  const [form, setForm] = useState({ assunto: '', conteudo: '', segmento: 'lead' as SegmentoEnvio })
  const [tagsFiltro, setTagsFiltro] = useState<string[]>([])
  const [jurisSelecionados, setJurisSelecionados] = useState<Set<string>>(new Set())
  const [novoSub, setNovoSub] = useState({ email: '', nome: '', segmento: 'lead' as Segmento, tags: [] as string[] })
  const [enviando, setEnviando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [adicionando, setAdicionando] = useState(false)
  const [sincronizandoTags, setSincronizandoTags] = useState(false)
  const [emailBorrado, setEmailBorrado] = useState(false)
  const [tentouAdicionar, setTentouAdicionar] = useState(false)
  const [erroServidor, setErroServidor] = useState<string | null>(null)
  const [filtroInscritos, setFiltroInscritos] = useState<SegmentoEnvio>('todos')

  const emailValidado = validarEmail(novoSub.email)
  const emailDuplicado = emailValidado.valido && subscribers.some(s => normalizarEmail(s.email) === emailValidado.email)
  const emailPodeSerEnviado = emailValidado.valido && !emailDuplicado
  const exibirValidacao = tentouAdicionar || (emailBorrado && novoSub.email.trim() !== '')
  const erroEmail = erroServidor
    || (exibirValidacao ? (emailValidado.erro || (emailDuplicado ? 'Este e-mail já está inscrito' : null)) : null)

  const [avisoExtracao, setAvisoExtracao] = useState<string | null>(null)
  const [teseExtracao, setTeseExtracao] = useState('')

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const ctx = consumirContextoNewsletter()
    if (!ctx) return
    setForm((f) => ({
      ...f,
      assunto: ctx.assunto || f.assunto,
      conteudo: ctx.conteudo || f.conteudo,
    }))
    if (ctx.tese) setTeseExtracao(ctx.tese)
    setAba('enviar')
    setAvisoExtracao('Contexto de PDF jurídico carregado. Revise o rascunho ou gere sugestão a partir da tese.')
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: subs } = await supabase.from('newsletter_subscribers').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false })
      setSubscribers(subs || [])
      const { data: env } = await supabase.from('newsletter_envios').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false })
      setEnvios(env || [])
      const ids = (env || []).map((e: any) => e.id).filter(Boolean)
      if (ids.length) {
        const { data: evs } = await supabase
          .from('newsletter_eventos')
          .select('envio_id, subscriber_id, tipo')
          .in('envio_id', ids)
        const mapEnvio: Record<string, { opens: number; clicks: number }> = {}
        const mapSub: Record<string, { opens: number; clicks: number }> = {}
        for (const ev of evs || []) {
          const eid = ev.envio_id as string | null
          if (eid) {
            if (!mapEnvio[eid]) mapEnvio[eid] = { opens: 0, clicks: 0 }
            if (ev.tipo === 'open') mapEnvio[eid].opens++
            if (ev.tipo === 'click') mapEnvio[eid].clicks++
          }
          const sid = ev.subscriber_id as string | null
          if (sid) {
            if (!mapSub[sid]) mapSub[sid] = { opens: 0, clicks: 0 }
            if (ev.tipo === 'open') mapSub[sid].opens++
            if (ev.tipo === 'click') mapSub[sid].clicks++
          }
        }
        setEventosPorEnvio(mapEnvio)
        setEventosPorInscrito(mapSub)
      }
    }
    load()
  }, [])

  const ativosNoSegmento = subscribers.filter(s => {
    if (!s.ativo) return false
    if (form.segmento !== 'todos' && (s.segmento || 'lead') !== form.segmento) return false
    return inscritoCasaComTags(s.tags, tagsFiltro)
  }).length

  const contagemTags = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of subscribers) {
      if (!s.ativo) continue
      if (form.segmento !== 'todos' && (s.segmento || 'lead') !== form.segmento) continue
      for (const t of (s.tags || []) as string[]) {
        if (!t) continue
        map[t] = (map[t] || 0) + 1
      }
    }
    return map
  }, [subscribers, form.segmento])

  const inscritosVisiveis = subscribers.filter(s => {
    if (filtroInscritos === 'todos') return true
    return (s.segmento || 'lead') === filtroInscritos
  })

  function toggleJuris(id: string) {
    setJurisSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function sincronizarTagsClientes() {
    setSincronizandoTags(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: lawyer } = await supabase.from('lawyers').select('office_id').eq('id', user.id).maybeSingle()
      let q = supabase.from('clients').select('id, email, tipo_beneficio, lawyer_id')
      if (lawyer?.office_id) {
        const { data: membros } = await supabase.from('lawyers').select('id').eq('office_id', lawyer.office_id)
        const ids = (membros || []).map(m => m.id)
        if (ids.length) q = q.in('lawyer_id', ids)
        else q = q.eq('lawyer_id', user.id)
      } else {
        q = q.eq('lawyer_id', user.id)
      }
      const { data: clients } = await q
      const porEmail = new Map<string, { id: string; tag: string | null }>()
      for (const c of clients || []) {
        if (!c.email) continue
        porEmail.set(normalizarEmail(c.email), {
          id: c.id,
          tag: tagDeTipoBeneficio(c.tipo_beneficio),
        })
      }
      const updates: { id: string; tags: string[]; client_id: string }[] = []
      for (const s of subscribers) {
        const match = porEmail.get(normalizarEmail(s.email))
        if (!match?.tag) continue
        const novas = mesclarTags(s.tags, [match.tag])
        const mudouTags = JSON.stringify([...(s.tags || [])].sort()) !== JSON.stringify([...novas].sort())
        const mudouClient = s.client_id !== match.id
        if (!mudouTags && !mudouClient) continue
        updates.push({ id: s.id, tags: novas, client_id: match.id })
      }
      for (const u of updates) {
        await supabase.from('newsletter_subscribers').update({ tags: u.tags, client_id: u.client_id }).eq('id', u.id)
      }
      if (updates.length) {
        setSubscribers(prev => prev.map(s => {
          const u = updates.find(x => x.id === s.id)
          return u ? { ...s, tags: u.tags, client_id: u.client_id } : s
        }))
      }
    } finally {
      setSincronizandoTags(false)
    }
  }

  async function gerarConteudo() {
    if (!form.assunto) { alert('Digite o assunto primeiro'); return }
    setGerando(true)
    try {
      const tom = form.segmento === 'cliente'
        ? `atualizações de casos para clientes${tagsFiltro.length ? ` com tags: ${tagsFiltro.join(', ')}` : ''}`
        : 'conteúdo institucional para leads e inscritos (educativo, sem dados de processo)'
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Escreva o conteúdo de uma newsletter jurídica sobre: "${form.assunto}". Público: ${tom}. Máximo 300 palavras. Tom profissional mas acessível.`,
          }],
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value)
        setForm(f => ({ ...f, conteudo: acc }))
      }
    } catch { alert('Erro ao gerar') }
    finally { setGerando(false) }
  }

  async function enviarNewsletter() {
    if (!form.assunto || !form.conteudo) return
    const rotulo = form.segmento === 'cliente' ? 'Clientes' : form.segmento === 'lead' ? 'Leads/Inscritos' : 'todos os inscritos'
    const tagsTxt = tagsFiltro.length ? ` com tags [${tagsFiltro.join(', ')}]` : ''
    if (!confirm(`Enviar para ${ativosNoSegmento} destinatário(s) do segmento "${rotulo}"${tagsTxt}?`)) return
    setEnviando(true)
    setResultado(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/enviar-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          assunto: form.assunto,
          conteudo: form.conteudo,
          segmento: form.segmento,
          tags: tagsFiltro,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setResultado({ ok: true, enviados: data.enviados })
        setEnvios(prev => [{
          id: data.envio_id,
          assunto: form.assunto,
          conteudo: form.conteudo,
          total_enviados: data.enviados,
          segmento: form.segmento === 'todos' ? null : form.segmento,
          tags_filtro: tagsFiltro.length ? tagsFiltro : null,
          created_at: new Date().toISOString(),
        }, ...prev])
        setForm({ assunto: '', conteudo: '', segmento: form.segmento })
      } else {
        setResultado({ ok: false, erro: data.error })
      }
    } catch { setResultado({ ok: false, erro: 'Erro ao enviar' }) }
    finally { setEnviando(false) }
  }

  async function adicionarInscrito() {
    setTentouAdicionar(true)
    setErroServidor(null)
    if (!emailPodeSerEnviado) return
    setAdicionando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/adicionar-inscrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          email: emailValidado.email,
          nome: novoSub.nome.trim(),
          segmento: novoSub.segmento,
          tags: novoSub.tags,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setErroServidor(data.error || 'Não foi possível adicionar o inscrito')
        return
      }
      setSubscribers(prev => [data.inscrito, ...prev])
      setNovoSub({ email: '', nome: '', segmento: novoSub.segmento, tags: [] })
      setEmailBorrado(false)
      setTentouAdicionar(false)
    } catch {
      setErroServidor('Não foi possível adicionar o inscrito')
    } finally {
      setAdicionando(false)
    }
  }

  async function removerInscrito(id: string) {
    await supabase.from('newsletter_subscribers').delete().eq('id', id)
    setSubscribers(prev => prev.filter(s => s.id !== id))
  }

  async function alterarSegmento(id: string, segmento: Segmento) {
    await supabase.from('newsletter_subscribers').update({ segmento }).eq('id', id)
    setSubscribers(prev => prev.map(s => s.id === id ? { ...s, segmento } : s))
  }

  async function alterarTags(id: string, tags: string[]) {
    await supabase.from('newsletter_subscribers').update({ tags }).eq('id', id)
    setSubscribers(prev => prev.map(s => s.id === id ? { ...s, tags } : s))
  }

  const inputCls = 'input-glass w-full px-4 text-sm'
  const ativos = subscribers.filter(s => s.ativo).length
  const nClientes = subscribers.filter(s => s.ativo && (s.segmento || 'lead') === 'cliente').length
  const nLeads = subscribers.filter(s => s.ativo && (s.segmento || 'lead') === 'lead').length

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <Mail size={28} color="#D4AF37"/>
          <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Newsletter </span>
          <span className="text-gradient-gold">Jurídica</span>
        </h1>
        <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Hub de atualizações, segmentação por tags e envio para clientes ou leads</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ativos', value: ativos, color: '#22C55E', icon: Users },
          { label: 'Clientes', value: nClientes, color: '#3B82F6', icon: Users },
          { label: 'Leads', value: nLeads, color: '#D4AF37', icon: Mail },
          { label: 'Envios', value: envios.length, color: '#A855F7', icon: Send },
        ].map(({ label, value, color, icon: Icon }) => (
          <GlassCard key={label} intensity={0.8} style={{ padding: 18 }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
              <Icon size={18} color={color}/>
            </div>
            <div className="text-xs text-gray-500">{label}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { id: 'enviar' as const, label: '✉ Enviar Newsletter' },
          { id: 'atualizacoes' as const, label: '⚖ Atualizações' },
          { id: 'inscritos' as const, label: `👥 Inscritos (${subscribers.length})` },
          { id: 'historico' as const, label: '📋 Histórico' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setAba(id)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: aba === id ? 'rgba(212,175,55,0.15)' : 'transparent', color: aba === id ? '#D4AF37' : '#888', border: aba === id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'atualizacoes' && (
        <GlassCard intensity={0.4} style={{ padding: 24 }}>
          <div className="flex items-center gap-2 mb-4">
            <Scale size={18} color="#D4AF37" />
            <h2 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              Hub de jurisprudências
            </h2>
          </div>
          <HubJurisprudencias
            isLight={isLight}
            selecionados={jurisSelecionados}
            onToggleSelecionado={toggleJuris}
            onUsarComoFonte={() => {
              setAba('enviar')
            }}
          />
        </GlassCard>
      )}

      {aba === 'enviar' && (
        <GlassCard intensity={0.4} style={{ padding: 28 }}>
          <div className="space-y-4">
            {avisoExtracao && (
              <div
                className="mb-3 text-xs rounded-xl px-3 py-2.5 flex items-start gap-2"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{avisoExtracao}</span>
              </div>
            )}
            <GerarSugestaoConteudo
              disabled={enviando}
              segmento={form.segmento}
              tagsContexto={tagsFiltro}
              jurisIdsSelecionados={Array.from(jurisSelecionados)}
              teseInicial={teseExtracao}
              onSugestao={({ assunto, conteudo }) => setForm(f => ({ ...f, assunto, conteudo }))}
            />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Segmento *</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'cliente' as const, label: 'Clientes', desc: 'Atualizações de casos' },
                  { id: 'lead' as const, label: 'Leads/Inscritos', desc: 'Conteúdo institucional' },
                  { id: 'todos' as const, label: 'Todos', desc: 'Ambos os segmentos' },
                ]).map(op => {
                  const ativo = form.segmento === op.id
                  return (
                    <button key={op.id} type="button" onClick={() => setForm(f => ({ ...f, segmento: op.id }))}
                      className="text-left px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: ativo ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.02)',
                        border: ativo ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}>
                      <div className="text-xs font-bold" style={{ color: ativo ? '#D4AF37' : '#ccc' }}>{op.label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: '#666' }}>{op.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
            <FiltroTagsEnvio
              selecionadas={tagsFiltro}
              onChange={setTagsFiltro}
              contagem={contagemTags}
              disabled={enviando}
            />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Assunto *</label>
              <input value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
                placeholder="Ex: Novidades sobre aposentadoria rural em 2026" className={inputCls} style={{ height: 44 }} spellCheck={true} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Conteúdo *</label>
                <button onClick={gerarConteudo} disabled={gerando || !form.assunto}
                  className="text-xs px-3 py-1 rounded-lg transition-all" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                  {gerando ? '✨ Gerando...' : '✨ Gerar com IA'}
                </button>
              </div>
              <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                placeholder="Escreva o conteúdo da newsletter ou use a IA para gerar..." className={inputCls} style={{ height: 200, resize: 'none', paddingTop: 12 }} spellCheck={true} />
            </div>

            {resultado && (
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: resultado.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${resultado.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                {resultado.ok ? <CheckCircle size={16} color="#22C55E"/> : null}
                <span className="text-sm" style={{ color: resultado.ok ? '#22C55E' : '#EF4444' }}>
                  {resultado.ok ? `✅ Enviado para ${resultado.enviados} inscritos!` : `❌ ${resultado.erro}`}
                </span>
              </div>
            )}

            <button onClick={enviarNewsletter} disabled={enviando || !form.assunto || !form.conteudo || ativosNoSegmento === 0}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold">
              {enviando ? <><Loader2 size={16} className="animate-spin"/> Enviando...</> : <><Send size={16}/> Enviar para {ativosNoSegmento} destinatário(s)</>}
            </button>
            {ativosNoSegmento === 0 && <p className="text-xs text-center text-gray-500">Nenhum inscrito ativo neste segmento/filtro</p>}
          </div>
        </GlassCard>
      )}

      {aba === 'inscritos' && (
        <div className="space-y-4">
          <GlassCard intensity={0.4} style={{ padding: 20 }}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Adicionar inscrito</h3>
              <button
                type="button"
                onClick={sincronizarTagsClientes}
                disabled={sincronizandoTags}
                className="text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50"
                style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                title="Deriva tags do tipo de benefício dos clientes com o mesmo e-mail"
              >
                {sincronizandoTags ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sincronizar tags dos clientes
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <select value={novoSub.segmento} onChange={e => setNovoSub(f => ({ ...f, segmento: e.target.value as Segmento }))}
                className={inputCls} style={{ height: 40, maxWidth: 180 }}>
                <option value="lead" style={{ background: '#111' }}>Lead / Inscrito</option>
                <option value="cliente" style={{ background: '#111' }}>Cliente</option>
              </select>
              <input value={novoSub.nome} onChange={e => setNovoSub(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome (opcional)" className={inputCls} style={{ height: 40 }} spellCheck={true} />
              <input value={novoSub.email} type="email" inputMode="email" autoComplete="off"
                aria-invalid={!!erroEmail} aria-describedby={erroEmail ? 'erro-email-inscrito' : undefined}
                onChange={e => { setNovoSub(f => ({ ...f, email: e.target.value })); setErroServidor(null) }}
                onBlur={() => setEmailBorrado(true)}
                onKeyDown={e => { if (e.key === 'Enter') { setEmailBorrado(true); adicionarInscrito() } }}
                placeholder="Email *" className={`${inputCls}${erroEmail ? ' input-erro' : ''}`} style={{ height: 40 }}/>
              <button onClick={adicionarInscrito} disabled={adicionando || !emailPodeSerEnviado}
                className="btn-gold flex items-center gap-1 px-4 rounded-xl text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                {adicionando ? <Loader2 size={15} className="animate-spin"/> : <Plus size={15}/>}
              </button>
            </div>
            <div className="mb-2">
              <p className="text-[10px] text-gray-500 mb-1">Tags do novo inscrito</p>
              <EditorTagsInscrito
                tags={novoSub.tags}
                onChange={tags => setNovoSub(f => ({ ...f, tags }))}
                compact
              />
            </div>
            <AnimatePresence>
              {erroEmail && (
                <motion.div id="erro-email-inscrito" role="alert"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl overflow-hidden"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertCircle size={14} color="#EF4444" className="flex-shrink-0"/>
                  <span style={{ color: '#EF4444', fontSize: 12 }}>{erroEmail}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          <div className="flex gap-2">
            {([
              { id: 'todos' as const, label: 'Todos' },
              { id: 'cliente' as const, label: 'Clientes' },
              { id: 'lead' as const, label: 'Leads' },
            ]).map(f => (
              <button key={f.id} type="button" onClick={() => setFiltroInscritos(f.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: filtroInscritos === f.id ? 'rgba(212,175,55,0.15)' : 'transparent',
                  color: filtroInscritos === f.id ? '#D4AF37' : '#888',
                  border: filtroInscritos === f.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {inscritosVisiveis.map(s => {
              const eng = eventosPorInscrito[s.id]
              return (
              <div key={s.id} className="p-3 rounded-xl" style={{ background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)', border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
                    {(s.nome || s.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {s.nome && <div className="text-xs font-medium" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{s.nome}</div>}
                    <div className="text-xs text-gray-500">{s.email}</div>
                    {eng && (eng.opens > 0 || eng.clicks > 0) && (
                      <div className="text-[10px] mt-0.5" style={{ color: '#888' }} title="Engajamento acumulado nas newsletters (qualificação de lead)">
                        {eng.opens} abertura(s) · {eng.clicks} clique(s)
                      </div>
                    )}
                  </div>
                  <select
                    value={(s.segmento || 'lead') as Segmento}
                    onChange={e => alterarSegmento(s.id, e.target.value as Segmento)}
                    className="text-[10px] px-2 py-1 rounded-lg outline-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}
                  >
                    <option value="cliente" style={{ background: '#111' }}>{ROTULO_SEGMENTO.cliente}</option>
                    <option value="lead" style={{ background: '#111' }}>{ROTULO_SEGMENTO.lead}</option>
                  </select>
                  <button onClick={() => removerInscrito(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all flex-shrink-0" style={{ color: '#EF4444' }}>
                    <Trash2 size={14}/>
                  </button>
                </div>
                <EditorTagsInscrito
                  tags={(s.tags || []) as string[]}
                  onChange={tags => alterarTags(s.id, tags)}
                  compact
                />
              </div>
              )
            })}
            {inscritosVisiveis.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">Nenhum inscrito neste filtro</div>
            )}
          </div>
        </div>
      )}

      {aba === 'historico' && (
        <div className="space-y-3">
          {envios.length === 0 && <div className="text-center py-10 text-gray-500 text-sm">Nenhuma newsletter enviada ainda</div>}
          {envios.map((e, i) => {
            const stats = e.id ? eventosPorEnvio[e.id] : undefined
            return (
              <GlassCard key={e.id || i} intensity={0.4} style={{ padding: 20 }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{e.assunto}</h3>
                      {e.segmento && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                          {e.segmento === 'cliente' ? 'Clientes' : 'Leads'}
                        </span>
                      )}
                      {(e.tags_filtro || []).map((t: string) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{e.conteudo?.slice(0, 80)}...</p>
                    <p className="text-[10px] text-gray-600 mt-1">{new Date(e.created_at).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] mt-1" style={{ color: '#888' }}>
                      {stats ? `${stats.opens} abertura(s) · ${stats.clicks} clique(s)` : '0 abertura(s) · 0 clique(s)'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-black" style={{ color: '#22C55E' }}>{e.total_enviados}</div>
                    <div className="text-[10px] text-gray-500">enviados</div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
