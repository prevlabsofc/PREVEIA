'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, FileText, Plus, Trash2, Pencil, Lock, X, BookMarked } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const SEM_PASTA = '__sem_pasta__'

/** Colunas reais em produção (probe REST): id, lawyer_id, nome, tipo, conteudo, created_at, updated_at */
const MODELOS_COLS = 'id, lawyer_id, nome, tipo, conteudo, created_at, updated_at'

interface DocPessoal {
  id: string
  title?: string | null
  type?: string | null
  agent_type?: string | null
  created_at: string
  pasta?: string | null
}

interface ModeloPessoal {
  id: string
  lawyer_id: string
  titulo: string
  categoria: string | null
  conteudo: string
  compartilhado: boolean
  created_at?: string
  updated_at: string
}

interface Props {
  lawyerId: string
  officeId: string | null
  membros: { id: string; name: string }[]
  isLight: boolean
}

const MODELO_VAZIO = { titulo: '', categoria: '', conteudo: '', compartilhado: false }

function docTitulo(d: DocPessoal) {
  return d.title || d.agent_type || 'Petição'
}

function normalizeModelo(row: Record<string, unknown> | null | undefined): ModeloPessoal | null {
  if (!row?.id) return null
  return {
    id: String(row.id),
    lawyer_id: String(row.lawyer_id ?? ''),
    titulo: String(row.nome ?? row.titulo ?? ''),
    categoria: (row.tipo ?? row.categoria ?? null) as string | null,
    conteudo: String(row.conteudo ?? ''),
    compartilhado: false,
    created_at: (row.created_at as string | undefined) ?? undefined,
    updated_at: String(row.updated_at ?? row.created_at ?? ''),
  }
}

function normalizeModelos(rows: unknown): ModeloPessoal[] {
  return ((rows as Record<string, unknown>[]) || [])
    .map(normalizeModelo)
    .filter((m): m is ModeloPessoal => Boolean(m))
}

export function EspacoIndividual({ lawyerId, officeId: _officeId, membros: _membros, isLight }: Props) {
  const [aba, setAba] = useState<'peticoes' | 'modelos'>('peticoes')
  const [docs, setDocs] = useState<DocPessoal[]>([])
  const [meusModelos, setMeusModelos] = useState<ModeloPessoal[]>([])
  const [carregando, setCarregando] = useState(true)
  const [semMigracao, setSemMigracao] = useState(false)

  const [pastaAtiva, setPastaAtiva] = useState<string | null>(null)
  const [docEmMovimento, setDocEmMovimento] = useState<DocPessoal | null>(null)
  const [pastaDigitada, setPastaDigitada] = useState('')
  const [salvandoPasta, setSalvandoPasta] = useState(false)

  const [editandoModelo, setEditandoModelo] = useState<ModeloPessoal | null>(null)
  const [formModelo, setFormModelo] = useState(MODELO_VAZIO)
  const [modalModelo, setModalModelo] = useState(false)
  const [salvandoModelo, setSalvandoModelo] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const { data: docsData, error: docsErro } = await supabase
          .from('documents')
          .select('id, title, agent_type, created_at, pasta')
          .eq('lawyer_id', lawyerId)
          .order('created_at', { ascending: false })

        if (docsErro) {
          console.error('[EspacoIndividual] documents:', docsErro.message)
          const { data: fallback, error: fallbackErro } = await supabase
            .from('documents')
            .select('id, title, agent_type, created_at')
            .eq('lawyer_id', lawyerId)
            .order('created_at', { ascending: false })
          if (fallbackErro) {
            console.error('[EspacoIndividual] documents fallback:', fallbackErro.message)
            const { data: semOrdem } = await supabase
              .from('documents')
              .select('id, title, agent_type, created_at')
              .eq('lawyer_id', lawyerId)
            setDocs((semOrdem as DocPessoal[]) || [])
          } else {
            setDocs((fallback as DocPessoal[]) || [])
          }
        } else {
          setDocs((docsData as DocPessoal[]) || [])
        }

        const { data: meus, error: modelosErro } = await supabase
          .from('modelos_pessoais')
          .select(MODELOS_COLS)
          .eq('lawyer_id', lawyerId)
          .order('updated_at', { ascending: false })

        if (modelosErro) {
          console.error('[EspacoIndividual] modelos_pessoais:', modelosErro.message)
          const { data: meusFallback, error: meusFallbackErro } = await supabase
            .from('modelos_pessoais')
            .select('*')
            .eq('lawyer_id', lawyerId)
            .limit(50)
          if (meusFallbackErro) {
            console.error('[EspacoIndividual] modelos_pessoais fallback:', meusFallbackErro.message)
            setSemMigracao(true)
            setMeusModelos([])
          } else {
            setMeusModelos(normalizeModelos(meusFallback))
          }
        } else {
          setMeusModelos(normalizeModelos(meus))
        }
      } catch (err) {
        console.error('[EspacoIndividual] carregar:', err)
        setDocs([])
        setMeusModelos([])
        setSemMigracao(true)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [lawyerId])

  const pastas = useMemo(() => {
    const nomes = new Set<string>()
    docs.forEach(d => { if (d.pasta) nomes.add(d.pasta) })
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [docs])

  const docsFiltrados = useMemo(() => {
    if (!pastaAtiva) return docs
    if (pastaAtiva === SEM_PASTA) return docs.filter(d => !d.pasta)
    return docs.filter(d => d.pasta === pastaAtiva)
  }, [docs, pastaAtiva])

  const semPastaTotal = docs.filter(d => !d.pasta).length

  function abrirMoverPasta(doc: DocPessoal) {
    setDocEmMovimento(doc)
    setPastaDigitada(doc.pasta || '')
  }

  async function salvarPasta(valor: string | null) {
    if (!docEmMovimento) return
    setSalvandoPasta(true)
    const { error } = await supabase.from('documents').update({ pasta: valor }).eq('id', docEmMovimento.id)
    setSalvandoPasta(false)
    if (error) { alert('Não foi possível salvar a pasta.'); return }
    setDocs(prev => prev.map(d => d.id === docEmMovimento.id ? { ...d, pasta: valor } : d))
    setDocEmMovimento(null)
  }

  function abrirNovoModelo() {
    setEditandoModelo(null)
    setFormModelo(MODELO_VAZIO)
    setModalModelo(true)
  }

  function abrirEdicaoModelo(m: ModeloPessoal) {
    setEditandoModelo(m)
    setFormModelo({ titulo: m.titulo, categoria: m.categoria || '', conteudo: m.conteudo, compartilhado: false })
    setModalModelo(true)
  }

  async function salvarModelo() {
    if (!formModelo.titulo.trim()) { alert('Informe um título para o modelo.'); return }
    setSalvandoModelo(true)
    const payload = {
      nome: formModelo.titulo.trim(),
      tipo: formModelo.categoria.trim() || null,
      conteudo: formModelo.conteudo,
      updated_at: new Date().toISOString(),
    }

    if (editandoModelo) {
      const { data, error } = await supabase.from('modelos_pessoais').update(payload).eq('id', editandoModelo.id).select(MODELOS_COLS).single()
      setSalvandoModelo(false)
      if (error) { alert('Não foi possível salvar o modelo.'); return }
      const normalizado = normalizeModelo(data as Record<string, unknown>)
      if (normalizado) setMeusModelos(prev => prev.map(m => m.id === editandoModelo.id ? normalizado : m))
    } else {
      const { data, error } = await supabase
        .from('modelos_pessoais')
        .insert({ ...payload, lawyer_id: lawyerId })
        .select(MODELOS_COLS)
        .single()
      setSalvandoModelo(false)
      if (error) { alert('Não foi possível criar o modelo.'); return }
      const normalizado = normalizeModelo(data as Record<string, unknown>)
      if (normalizado) setMeusModelos(prev => [normalizado, ...prev])
    }
    setModalModelo(false)
  }

  async function excluirModelo(id: string) {
    if (!confirm('Excluir este modelo pessoal?')) return
    const { error } = await supabase.from('modelos_pessoais').delete().eq('id', id)
    if (error) { alert('Não foi possível excluir o modelo.'); return }
    setMeusModelos(prev => prev.filter(m => m.id !== id))
  }

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corSecundaria = isLight ? '#5E5E5E' : '#9ca3af'
  const fundoItem = isLight ? '#FFFFFF' : 'rgba(255,255,255,0.02)'
  const bordaItem = isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.05)'

  function chip(rotulo: string, ativo: boolean, onClick: () => void) {
    return (
      <button
        key={rotulo}
        onClick={onClick}
        className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
        style={{
          background: ativo ? 'rgba(212,175,55,0.14)' : (isLight ? '#F3F3F3' : 'rgba(255,255,255,0.04)'),
          border: `1px solid ${ativo ? 'rgba(212,175,55,0.4)' : (isLight ? '#EDEDED' : 'rgba(255,255,255,0.07)')}`,
          color: ativo ? '#D4AF37' : corSecundaria,
        }}
      >
        {rotulo}
      </button>
    )
  }

  return (
    <>
      <GlassCard intensity={0.3} style={{ padding: 24 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} color="#D4AF37"/>
            <div>
              <h3 className="font-bold" style={{ color: corTexto }}>Meu Espaço</h3>
              <p className="text-xs" style={{ color: corSecundaria }}>
                Suas pastas e modelos pessoais — visíveis apenas para você, dentro do escritório
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: isLight ? '#F3F3F3' : 'rgba(255,255,255,0.04)' }}>
            {([['peticoes', 'Minhas petições'], ['modelos', 'Meus modelos']] as const).map(([id, rotulo]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{
                  background: aba === id ? 'rgba(212,175,55,0.16)' : 'transparent',
                  color: aba === id ? '#D4AF37' : corSecundaria,
                }}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {semMigracao && (
          <div className="mb-4 p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}>
            Recursos do espaço individual indisponíveis no momento. Tente recarregar a página.
          </div>
        )}

        {carregando ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
          </div>
        ) : aba === 'peticoes' ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {chip(`Todas (${docs.length})`, pastaAtiva === null, () => setPastaAtiva(null))}
              {pastas.map(p => chip(`${p} (${docs.filter(d => d.pasta === p).length})`, pastaAtiva === p, () => setPastaAtiva(p)))}
              {semPastaTotal > 0 && chip(`Sem pasta (${semPastaTotal})`, pastaAtiva === SEM_PASTA, () => setPastaAtiva(SEM_PASTA))}
            </div>

            <div className="space-y-2">
              {docsFiltrados.slice(0, 30).map(d => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: fundoItem, border: bordaItem }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                    <FileText size={16} color="#D4AF37"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: corTexto }}>{docTitulo(d)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {d.pasta && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                          {d.pasta}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
                        {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirMoverPasta(d)}
                    disabled={semMigracao}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[rgba(212,175,55,0.08)] disabled:opacity-40"
                    style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                    title="Organizar em pasta"
                  >
                    <FolderOpen size={14}/>
                  </button>
                </div>
              ))}

              {docsFiltrados.length === 0 && (
                <div className="text-center py-10">
                  <FileText size={32} color="#333" className="mx-auto mb-3"/>
                  <p className="text-sm" style={{ color: corSecundaria }}>
                    {docs.length === 0 ? 'Você ainda não gerou petições' : 'Nenhuma petição nesta pasta'}
                  </p>
                </div>
              )}

              {docsFiltrados.length > 30 && (
                <p className="text-xs pt-1" style={{ color: corSecundaria }}>
                  Mostrando as 30 petições mais recentes de {docsFiltrados.length}.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={abrirNovoModelo}
              disabled={semMigracao}
              className="btn-gold flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm mb-4 disabled:opacity-40"
            >
              <Plus size={15}/> Novo modelo pessoal
            </button>

            <div className="space-y-2">
              {meusModelos.map(m => (
                <div key={m.id} className="p-4 rounded-2xl" style={{ background: fundoItem, border: bordaItem }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                      <BookMarked size={16} color="#D4AF37"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: corTexto }}>{m.titulo}</span>
                        {m.categoria && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>
                            {m.categoria}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#888' }}>
                          <Lock size={10}/> Privado
                        </span>
                      </div>
                      {m.conteudo && (
                        <p className="text-xs mt-1.5" style={{ color: corSecundaria }}>
                          {m.conteudo.slice(0, 160)}{m.conteudo.length > 160 ? '…' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => abrirEdicaoModelo(m)}
                        className="px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[rgba(212,175,55,0.08)]"
                        style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                        title="Editar modelo">
                        <Pencil size={13}/>
                      </button>
                      <button onClick={() => excluirModelo(m.id)}
                        className="px-2.5 py-1.5 rounded-lg transition-colors hover:bg-[rgba(239,68,68,0.1)]"
                        style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                        title="Excluir modelo">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {meusModelos.length === 0 && !semMigracao && (
                <div className="text-center py-10">
                  <BookMarked size={32} color="#333" className="mx-auto mb-3"/>
                  <p className="text-sm" style={{ color: corSecundaria }}>Nenhum modelo pessoal ainda</p>
                  <p className="text-xs mt-1" style={{ color: '#666' }}>Salve seus estilos de petição para reutilizar depois</p>
                </div>
              )}
            </div>
          </>
        )}
      </GlassCard>

      <AnimatePresence>
        {docEmMovimento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setDocEmMovimento(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ background: isLight ? '#fff' : '#0A0A0A', border: '1px solid rgba(212,175,55,0.25)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: corTexto }}>Organizar em pasta</h3>
                <button onClick={() => setDocEmMovimento(null)} className="p-1 rounded-lg hover:bg-white/5">
                  <X size={16} color="#888"/>
                </button>
              </div>
              <p className="text-xs mb-3 truncate" style={{ color: corSecundaria }}>{docTitulo(docEmMovimento)}</p>
              <input
                value={pastaDigitada}
                onChange={e => setPastaDigitada(e.target.value)}
                placeholder="Nome da pasta (ex: SM Rural 2024)"
                className="input-glass w-full px-4 text-sm mb-3"
                style={{ height: 44 }}
                spellCheck={true}
              />
              {pastas.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {pastas.map(p => (
                    <button key={p} onClick={() => setPastaDigitada(p)}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => salvarPasta(pastaDigitada.trim() || null)}
                  disabled={salvandoPasta}
                  className="btn-gold flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {salvandoPasta ? 'Salvando…' : 'Salvar'}
                </button>
                {docEmMovimento.pasta && (
                  <button
                    onClick={() => salvarPasta(null)}
                    disabled={salvandoPasta}
                    className="px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
                    style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                  >
                    Remover pasta
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalModelo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setModalModelo(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg rounded-2xl p-6"
              style={{ background: isLight ? '#fff' : '#0A0A0A', border: '1px solid rgba(212,175,55,0.25)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: corTexto }}>
                  {editandoModelo ? 'Editar modelo' : 'Novo modelo pessoal'}
                </h3>
                <button onClick={() => setModalModelo(false)} className="p-1 rounded-lg hover:bg-white/5">
                  <X size={16} color="#888"/>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: corSecundaria }}>Título</label>
                  <input value={formModelo.titulo} onChange={e => setFormModelo(f => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Estilo SM Rural — Custódio" className="input-glass w-full px-4 text-sm" style={{ height: 44 }} spellCheck={true} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: corSecundaria }}>Tipo / categoria</label>
                  <input value={formModelo.categoria} onChange={e => setFormModelo(f => ({ ...f, categoria: e.target.value }))}
                    placeholder="Ex: salário-maternidade" className="input-glass w-full px-4 text-sm" style={{ height: 44 }} spellCheck={true} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: corSecundaria }}>Conteúdo / instruções</label>
                  <textarea value={formModelo.conteudo} onChange={e => setFormModelo(f => ({ ...f, conteudo: e.target.value }))}
                    rows={6} placeholder="Cole aqui o estilo, trechos ou instruções do modelo…"
                    className="input-glass w-full px-4 py-3 text-sm resize-none" spellCheck={true} />
                </div>
              </div>
              <button
                onClick={salvarModelo}
                disabled={salvandoModelo || !formModelo.titulo.trim()}
                className="btn-gold w-full py-3 rounded-xl text-sm font-bold mt-4 disabled:opacity-50"
              >
                {salvandoModelo ? 'Salvando…' : 'Salvar modelo'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
