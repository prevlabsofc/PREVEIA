'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Edit2, Trash2, Eye, X, Save, Loader2 } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { MarkdownMessage } from '@/components/MarkdownMessage'
import { DestinoPublicacao, type DestinoPublicacaoId } from '@/components/blog/DestinoPublicacao'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORIAS = ['Previdenciário', 'Aposentadoria', 'BPC/LOAS', 'Jurisprudência', 'INSS', 'Processo', 'Geral']

interface Artigo {
  id: string; titulo: string; conteudo: string; categoria: string
  publicado: boolean; created_at: string; lawyer_id: string
  destino_publicacao?: DestinoPublicacaoId
}

export default function BlogPage() {
  const [isLight, setIsLight] = useState(false)
  const [artigos, setArtigos] = useState<Artigo[]>([])
  const [lawyer, setLawyer] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Artigo | null>(null)
  const [visualizando, setVisualizando] = useState<Artigo | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [form, setForm] = useState<{
    titulo: string; conteudo: string; categoria: string
    publicado: boolean; destino_publicacao: DestinoPublicacaoId
  }>({ titulo: '', conteudo: '', categoria: 'Previdenciário', publicado: false, destino_publicacao: 'portal_cliente' })

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
      const { data: l } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setLawyer(l)
      const { data: a } = await supabase.from('artigos').select('*').eq('lawyer_id', user.id).order('created_at', { ascending: false })
      setArtigos((a as Artigo[]) || [])
    }
    load()
  }, [])

  async function gerarComIA() {
    if (!form.titulo) { alert('Digite o título primeiro'); return }
    setGerando(true)
    try {
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Escreva um artigo jurídico completo sobre: "${form.titulo}". O artigo deve ser voltado para advogados previdenciaristas brasileiros, com linguagem técnica mas acessível. Inclua: introdução, desenvolvimento com fundamentos legais e jurisprudência, e conclusão. Aproximadamente 500-800 palavras.` }] }),
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
    } catch { alert('Erro ao gerar conteúdo') }
    finally { setGerando(false) }
  }

  async function salvar() {
    if (!form.titulo || !form.conteudo) return
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editando) {
      const { data } = await supabase.from('artigos').update(form).eq('id', editando.id).select().single()
      if (data) setArtigos(prev => prev.map(a => a.id === editando.id ? data as Artigo : a))
    } else {
      const { data } = await supabase.from('artigos').insert({ ...form, lawyer_id: user.id }).select().single()
      if (data) setArtigos(prev => [data as Artigo, ...prev])
    }
    setForm({ titulo: '', conteudo: '', categoria: 'Previdenciário', publicado: false, destino_publicacao: 'portal_cliente' })
    setShowForm(false); setEditando(null); setSalvando(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir artigo?')) return
    await supabase.from('artigos').delete().eq('id', id)
    setArtigos(prev => prev.filter(a => a.id !== id))
  }

  async function togglePublicado(id: string, atual: boolean) {
    await supabase.from('artigos').update({ publicado: !atual }).eq('id', id)
    setArtigos(prev => prev.map(a => a.id === id ? { ...a, publicado: !atual } : a))
  }

  function abrirEdicao(a: Artigo) {
    setEditando(a)
    setForm({
      titulo: a.titulo,
      conteudo: a.conteudo,
      categoria: a.categoria,
      publicado: a.publicado,
      destino_publicacao: a.destino_publicacao || 'portal_cliente',
    })
    setShowForm(true)
  }

  const inputCls = "input-glass w-full px-4 text-sm"

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
              <BookOpen size={28} color="#D4AF37"/>
              <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Blog </span>
              <span className="text-gradient-gold">Jurídico</span>
            </h1>
            <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Publique artigos e conteúdo jurídico para seus clientes</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditando(null); setForm({ titulo: '', conteudo: '', categoria: 'Previdenciário', publicado: false, destino_publicacao: 'portal_cliente' }) }}
            className="btn-gold flex items-center gap-2 px-5 py-3 rounded-xl text-sm">
            <Plus size={16}/> Novo Artigo
          </button>
        </div>
      </motion.div>

      {artigos.length === 0 && !showForm && (
        <GlassCard intensity={0.3} style={{ padding: 48 }}>
          <div className="text-center">
            <BookOpen size={40} color="#333" className="mx-auto mb-3"/>
            <p className="text-gray-400 mb-3">Nenhum artigo publicado ainda</p>
            <button onClick={() => setShowForm(true)} className="btn-gold px-5 py-2.5 rounded-xl text-sm">Criar primeiro artigo</button>
          </div>
        </GlassCard>
      )}

      <div className="space-y-3">
        {artigos.map(a => (
          <GlassCard key={a.id} intensity={0.4} style={{ padding: 20 }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{a.titulo}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{a.categoria}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: a.publicado ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', color: a.publicado ? '#22C55E' : '#888' }}>
                    {a.publicado ? '✅ Publicado' : '📝 Rascunho'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{a.conteudo?.slice(0, 100)}...</p>
                <p className="text-[10px] text-gray-600 mt-1">{new Date(a.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setVisualizando(a)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: '#D4AF37' }}>
                  <Eye size={15}/>
                </button>
                <button onClick={() => abrirEdicao(a)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: '#3B82F6' }}>
                  <Edit2 size={15}/>
                </button>
                <button onClick={() => togglePublicado(a.id, a.publicado)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all text-[10px] px-2 py-1 font-bold" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                  {a.publicado ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={() => excluir(a.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all" style={{ color: '#EF4444' }}>
                  <Trash2 size={15}/>
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* MODAL FORM */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-auto"
              style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">{editando ? 'Editar Artigo' : 'Novo Artigo'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Título *</label>
                  <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Aposentadoria Rural: O que você precisa saber" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Categoria</label>
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inputCls} style={{ height: 44 }}>
                      {CATEGORIAS.map(c => <option key={c} value={c} style={{ background: '#111' }}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button onClick={gerarComIA} disabled={gerando || !form.titulo} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', height: 44 }}>
                      {gerando ? <><Loader2 size={14} className="animate-spin"/> Gerando...</> : '✨ Gerar com IA'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Conteúdo *</label>
                  <textarea value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                    placeholder="Escreva o conteúdo do artigo aqui ou use a IA para gerar..." className={inputCls} style={{ height: 250, resize: 'none', paddingTop: 12 }} spellCheck={true} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="publicado" checked={form.publicado} onChange={e => setForm(f => ({ ...f, publicado: e.target.checked }))} className="w-4 h-4"/>
                    <label htmlFor="publicado" className="text-sm text-gray-400">Publicar imediatamente</label>
                  </div>
                  <DestinoPublicacao
                    value={form.destino_publicacao}
                    onChange={v => setForm(f => ({ ...f, destino_publicacao: v }))}
                    oab={lawyer?.oab_number}
                    siteUrl={lawyer?.site_url}
                    linkedinUrl={lawyer?.linkedin_url}
                    publicado={form.publicado}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={salvar} disabled={salvando || !form.titulo || !form.conteudo}
                    className="btn-gold flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold">
                    {salvando ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : <><Save size={15}/> {editando ? 'Salvar alterações' : 'Criar artigo'}</>}
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Cancelar</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL VISUALIZAR */}
      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={() => setVisualizando(null)}>
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-auto" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{visualizando.categoria}</span>
              <button onClick={() => setVisualizando(null)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">{visualizando.titulo}</h2>
            <MarkdownMessage content={visualizando.conteudo} />
          </div>
        </div>
      )}
    </div>
  )
}