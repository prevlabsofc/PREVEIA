'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, Plus, X, Loader2, Filter, HelpCircle } from 'lucide-react'
import { SECOES, diaCivilBrasil, secaoDaJurisprudencia } from '@/lib/jurisprudencia-secoes'
import { matchFuzzy, sugerirTermos } from '@/lib/jurisprudencia-busca'
import { OrigemBadge } from '@/components/jurisprudencia/OrigemBadge'
import { UrlOriginalViewer } from '@/components/jurisprudencia/UrlOriginalViewer'
import { UsoEmProcessos } from '@/components/jurisprudencia/UsoEmProcessos'
import { InserirNaPeticao } from '@/components/jurisprudencia/InserirNaPeticao'
import { ExportarPdfSelecionados } from '@/components/jurisprudencia/ExportarPdfSelecionados'
import { JurisprudenciaLista } from '@/components/jurisprudencia/JurisprudenciaLista'
import FeedbackToast from '@/components/clientes/FeedbackToast'
import type { Feedback } from '@/components/clientes/clientes-shared'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TRIBUNAIS = ['Todos', 'STF', 'STJ', 'TRF', 'TNU', 'CF/88', 'Lei 8.213/91']

export default function JurisprudenciaPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [tribunal, setTribunal] = useState('Todos')
  const [preview, setPreview] = useState<any>(null)
  const [infoRelevanciaId, setInfoRelevanciaId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tribunal: 'STF', tipo: '', numero: '', assunto: '',
    ementa: '', relevancia: 5, data_julgamento: '', url_original: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const [lawyerId, setLawyerId] = useState<string | null>(null)
  const [lidas, setLidas] = useState<Set<string>>(new Set())
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<Feedback>(null)

  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 280)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 3500)
    return () => clearTimeout(t)
  }, [feedback])

  function toast(texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') {
    setFeedback({ tipo, texto })
  }

  async function load() {
    const { data } = await supabase
      .from('jurisprudencias')
      .select('*')
      .order('created_at', { ascending: false })
      .order('relevancia', { ascending: false })
    setItems(data || [])
    setLoading(false)

    const { data: { user } } = await supabase.auth.getUser()
    setLawyerId(user?.id ?? null)
    if (user) {
      const { data: vistas, error } = await supabase
        .from('jurisprudencia_visualizacoes')
        .select('jurisprudencia_id')
        .eq('lawyer_id', user.id)
      if (error) console.error('[jurisprudencia] falha ao carregar as visualizações', error)
      else setLidas(new Set((vistas ?? []).map(v => v.jurisprudencia_id as string)))
    }

    const termoBusca = localStorage.getItem('marple_search')
    if (termoBusca) {
      setSearch(termoBusca)
      localStorage.removeItem('marple_search')
    }
  }

  function abrirEmenta(item: any) {
    setPreview(item)
    if (!lawyerId || lidas.has(item.id)) return
    setLidas(prev => new Set(prev).add(item.id))
    void supabase
      .from('jurisprudencia_visualizacoes')
      .upsert(
        { jurisprudencia_id: item.id, lawyer_id: lawyerId },
        { onConflict: 'jurisprudencia_id,lawyer_id', ignoreDuplicates: true }
      )
      .then(({ error }) => {
        if (error) console.error('[jurisprudencia] não foi possível registrar a leitura', error)
      })
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!form.assunto || !form.ementa) return
    setSaving(true)
    await supabase.from('jurisprudencias').insert({
      tribunal: form.tribunal,
      tipo: form.tipo,
      numero: form.numero,
      assunto: form.assunto,
      ementa: form.ementa,
      relevancia: form.relevancia,
      data_julgamento: form.data_julgamento || null,
      url_original: form.url_original.trim() || null,
      origem: 'manual',
      importado_em: new Date().toISOString(),
    })
    await load()
    setShowModal(false)
    setForm({ tribunal: 'STF', tipo: '', numero: '', assunto: '', ementa: '', relevancia: 5, data_julgamento: '', url_original: '' })
    setSaving(false)
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('')
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const rows = lines.slice(1)
      let count = 0
      const agora = new Date().toISOString()
      for (const row of rows) {
        const cols = row.split(',').map(c => c.trim())
        const obj: any = {}
        headers.forEach((h, i) => { obj[h] = cols[i] || '' })
        if (obj.assunto && obj.ementa) {
          await supabase.from('jurisprudencias').insert({
            tribunal: obj.tribunal || 'STF',
            tipo: obj.tipo || '',
            numero: obj.numero || '',
            assunto: obj.assunto,
            ementa: obj.ementa,
            relevancia: parseInt(obj.relevancia) || 5,
            data_julgamento: obj.data_julgamento || null,
            url_original: obj.url_original || obj.url || null,
            origem: 'manual',
            importado_em: agora,
          })
          count++
        }
      }
      setImportMsg(`${count} jurisprudências importadas com sucesso!`)
      await load()
    } catch {
      setImportMsg('Erro ao processar o arquivo CSV.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filtered = items.filter(it => {
    const matchSearch = matchFuzzy(searchDebounced, [it.assunto, it.numero, it.ementa])
    const matchTribunal = tribunal === 'Todos' || it.tribunal === tribunal
    const matchLeitura = !apenasNaoLidas || !lidas.has(it.id)
    return matchSearch && matchTribunal && matchLeitura
  })

  const sugestoes =
    searchDebounced.trim().length >= 2 && filtered.length === 0
      ? sugerirTermos(searchDebounced, items.map(i => i.assunto as string))
      : []

  const hojeBrasil = diaCivilBrasil()
  const secoes = SECOES
    .map(secao => {
      const itens = filtered.filter(it => secaoDaJurisprudencia(it, hojeBrasil) === secao.id)
      return { ...secao, itens, naoLidas: itens.filter(it => !lidas.has(it.id)).length }
    })
    .filter(secao => secao.itens.length > 0)

  const totalNaoLidas = items.filter(it => !lidas.has(it.id)).length

  const stats = [
    { label: 'Cadastradas', value: items.length },
    { label: 'Tribunais', value: new Set(items.map(i => i.tribunal)).size },
    { label: 'Não lidas', value: totalNaoLidas },
    { label: 'Este Mês', value: items.filter(i => new Date(i.created_at) > new Date(Date.now() - 30 * 864e5)).length },
  ]

  function toggleSelecionado(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(212,175,55,0.2)',
    borderRadius: 10, color: '#fff',
    width: '100%', padding: '10px 14px',
    fontSize: 13, outline: 'none',
  }

  void Plus

  return (
    <div className="p-8 max-w-7xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <FeedbackToast feedback={feedback} />

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Administração de Jurisprudência</h1>
          <p style={{ color: '#666', fontSize: 14 }}>Cadastre e gerencie decisões judiciais para a base de conhecimento.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
          + Nova Jurisprudência
        </button>
      </div>

      <div className="p-4 rounded-2xl mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-full sm:w-72 sm:flex-shrink-0">
          <label htmlFor="filtro-tribunal" className="block text-xs text-gray-400 mb-1">Tribunal</label>
          <select id="filtro-tribunal" value={tribunal} onChange={e => setTribunal(e.target.value)}
            className="input-glass w-full px-4 text-sm cursor-pointer" style={{ height: 44 }}>
            {TRIBUNAIS.map(t => (
              <option key={t} value={t} style={{ background: '#111' }}>{t === 'Todos' ? 'Todos os tribunais' : t}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:pb-2.5 flex-1">
          {tribunal === 'Todos' ? (
            <span className="text-[11px]" style={{ color: '#555' }}>Nenhum filtro de tribunal aplicado</span>
          ) : (
            <>
              <span className="text-[11px]" style={{ color: '#555' }}>Filtro ativo:</span>
              <button type="button" onClick={() => setTribunal('Todos')} title="Remover filtro de tribunal"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors hover:bg-white/5"
                style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}>
                {tribunal}
                <X size={11} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setApenasNaoLidas(v => !v)}
            className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors"
            style={{
              background: apenasNaoLidas ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${apenasNaoLidas ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: apenasNaoLidas ? '#22C55E' : '#888',
            }}
          >
            {apenasNaoLidas ? 'Mostrando não lidas' : `Não lidas (${totalNaoLidas})`}
          </button>
          <ExportarPdfSelecionados
            itens={items}
            selecionados={selecionados}
            onFeedback={(texto, tipo) => toast(texto, tipo === 'erro' ? 'erro' : 'sucesso')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded" style={{ background: '#D4AF37' }} />
              <h3 className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Busca & Filtros</h3>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>
                TÍTULO OU PALAVRA-CHAVE
              </label>
              <div className="relative">
                <Search size={14} color="#555" className="absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Ex: Aposentadoria Especial..."
                  className="w-full h-10 pl-9 pr-4 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} spellCheck={true} />
              </div>
              {sugestoes.length > 0 && (
                <div className="mt-2 text-[11px]" style={{ color: '#aaa' }}>
                  Você quis dizer:{' '}
                  {sugestoes.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSearch(s)}
                      className="font-bold underline underline-offset-2 transition-colors hover:text-[#F0D060]"
                      style={{ color: '#D4AF37' }}
                    >
                      {s}{i < sugestoes.length - 1 ? ', ' : '?'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button"
              className="w-full h-9 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
              Filtrar Base
            </button>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Filter size={14} color="#3B82F6" />
              <span className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Importação em Massa</span>
            </div>
            <p className="text-xs mb-3" style={{ color: '#666' }}>Atualize sua base via arquivos CSV.</p>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing}
              className="w-full h-9 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: '#3B82F6', color: '#fff' }}>
              {importing ? 'Importando...' : 'Selecionar Arquivo'}
            </button>
            <p className="text-[10px] mt-2 text-center" style={{ color: '#555' }}>Formatos suportados: CSV (UTF-8)</p>
            {importMsg && (
              <p className="text-[10px] mt-2 text-center" style={{ color: importMsg.includes('sucesso') ? '#22C55E' : '#EF4444' }}>{importMsg}</p>
            )}
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="p-4 rounded-xl text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xl font-black" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{value}</div>
                <div className="text-[10px] mt-1" style={{ color: '#555' }}>{label}</div>
              </div>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <BookOpen size={48} color="#2A2A2A" className="mb-4" />
              <p className="font-bold mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Nenhuma jurisprudência encontrada</p>
              <p className="text-sm" style={{ color: '#555' }}>
                {searchDebounced ? `Sem resultados para “${searchDebounced}”.` : 'Comece criando uma nova ou ajuste os filtros.'}
              </p>
              {sugestoes.length === 0 && !searchDebounced && (
                <button onClick={() => setShowModal(true)}
                  className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
                  + Nova Jurisprudência
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={28} color="#D4AF37" className="animate-spin" />
            </div>
          ) : (
            <JurisprudenciaLista
              secoes={secoes}
              lidas={lidas}
              selecionados={selecionados}
              isLight={isLight}
              onToggleSelecionado={toggleSelecionado}
              onAbrir={abrirEmenta}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: '#0A0800', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{preview.assunto}</div>
                  <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: '#666' }}>
                    <span>{preview.tribunal} · {preview.tipo} {preview.numero}</span>
                    <OrigemBadge
                      origem={preview.origem}
                      importadoEm={preview.importado_em}
                      createdAt={preview.created_at}
                    />
                  </div>
                </div>
                <button onClick={() => setPreview(null)} className="text-gray-600 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {preview.numero && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(255,255,255,0.05)', color: '#aaa' }}>
                        Nº {preview.numero}
                      </span>
                    )}
                    {preview.data_julgamento && (
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
                        📅 {new Date(preview.data_julgamento).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {preview.relevancia && (
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                            ⭐ Relevância {preview.relevancia}/5
                          </span>
                          <button type="button"
                            onClick={() => setInfoRelevanciaId(atual => atual === preview.id ? null : preview.id)}
                            aria-expanded={infoRelevanciaId === preview.id}
                            aria-controls="info-relevancia"
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
                            style={{ border: '1px solid rgba(212,175,55,0.35)', color: '#D4AF37' }}>
                            <HelpCircle size={12} aria-hidden="true" />
                            <span className="sr-only">O que significa a relevância</span>
                          </button>
                        </div>
                        <div id="info-relevancia" role="note" hidden={infoRelevanciaId !== preview.id}
                          className="rounded-lg px-3 py-2.5 text-[11px] leading-relaxed space-y-1.5"
                          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.18)', color: '#bbb' }}>
                          <p className="font-bold" style={{ color: '#D4AF37' }}>Como a relevância é definida</p>
                          <p>É uma nota de 1 a 5 informada manualmente por quem cadastrou a jurisprudência na base.</p>
                          <p>Ela não é calculada pelo sistema: não leva em conta a data do julgamento, a hierarquia do tribunal nem os termos que você pesquisou.</p>
                          <p>Quando a nota não é preenchida — por exemplo, em importações por CSV sem essa coluna — ela é gravada como 5 por padrão. Por isso, uma nota 5 nem sempre significa que alguém avaliou a decisão.</p>
                          <p>A lista da base é ordenada da maior para a menor nota.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>EMENTA COMPLETA</div>
                    <p className="text-sm leading-relaxed" style={{ color: '#ddd' }}>{preview.ementa}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>ACÓRDÃO ORIGINAL</div>
                    <UrlOriginalViewer url={preview.url_original} />
                  </div>
                  <UsoEmProcessos jurisprudenciaId={preview.id} />
                  {preview.created_at && (
                    <div className="text-[10px] pt-3" style={{ color: '#555', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      Cadastrada em {new Date(preview.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <InserirNaPeticao
                    item={preview}
                    onFeedback={(texto, tipo) => toast(texto, tipo === 'erro' ? 'erro' : 'sucesso')}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(preview.ementa)
                      toast('Ementa copiada.')
                    }}
                    className="h-10 px-4 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
              style={{ background: '#0A0800', border: '1px solid rgba(212,175,55,0.2)' }}>
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <h2 className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Nova Jurisprudência</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>TRIBUNAL*</label>
                    <select value={form.tribunal} onChange={e => setForm(p => ({ ...p, tribunal: e.target.value }))}
                      style={inputStyle}>
                      {['STF', 'STJ', 'TRF1', 'TRF2', 'TRF3', 'TRF4', 'TRF5', 'TRF6', 'TNU', 'CF/88', 'Lei 8.213/91'].map(t => (
                        <option key={t} value={t} style={{ background: '#111' }}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>TIPO</label>
                    <input type="text" value={form.tipo} placeholder="ADI, REsp, Súmula..."
                      style={inputStyle} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} spellCheck={true} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>NÚMERO</label>
                    <input type="text" value={form.numero} placeholder="2110 e 2111"
                      style={inputStyle} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} spellCheck={true} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>DATA DO JULGAMENTO</label>
                    <input type="date" value={form.data_julgamento}
                      style={inputStyle} onChange={e => setForm(p => ({ ...p, data_julgamento: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>ASSUNTO*</label>
                  <input type="text" value={form.assunto} placeholder="Tema da jurisprudência"
                    style={inputStyle} onChange={e => setForm(p => ({ ...p, assunto: e.target.value }))} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>EMENTA*</label>
                  <textarea value={form.ementa} placeholder="Texto completo da ementa..."
                    style={{ ...inputStyle, height: 120, resize: 'none' as const }}
                    onChange={e => setForm(p => ({ ...p, ementa: e.target.value }))} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={{ color: 'rgba(212,175,55,0.7)' }}>URL DO ACÓRDÃO</label>
                  <input type="url" value={form.url_original} placeholder="https://..."
                    style={inputStyle} onChange={e => setForm(p => ({ ...p, url_original: e.target.value }))} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>
                    RELEVÂNCIA: {form.relevancia}/5
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setForm(p => ({ ...p, relevancia: n }))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                        style={{
                          background: n <= form.relevancia ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${n <= form.relevancia ? '#D4AF37' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                        <span style={{ color: n <= form.relevancia ? '#D4AF37' : '#555', fontSize: 12 }}>★</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowModal(false)}
                    className="flex-1 h-11 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}>
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : '✓ Salvar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
