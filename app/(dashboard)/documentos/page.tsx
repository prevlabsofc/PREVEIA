'use client'
import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { FileText, Search, Eye, Plus, Trash2, X, Link2, User, FileSearch } from 'lucide-react'
import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import { DownloadButtons } from '@/components/DownloadButtons'
import { AvisoCitacao } from '@/components/AvisoCitacao'
import { PastasDocumentos } from '@/components/documentos/PastasDocumentos'
import { ExtracaoPdfDocumento } from '@/components/documentos/ExtracaoPdfDocumento'
import { carregarMembrosEscritorio } from '@/lib/equipe'
import { extrairNumeroProtocoloDoc, formatarCpfExibicao } from '@/lib/documentos-pastas'
import type { ProcessoParaPasta } from '@/lib/documentos-pastas'
import {
  EXTRACAO_PDF_AGENT_TYPE,
  normalizarExtracao,
  type ExtracaoDocumentoPdf,
} from '@/lib/extracao-documento-pdf'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Client {
  id: string
  name: string
  cpf?: string
  status?: string | null
}

interface Doc {
  id: string
  title?: string
  type?: string
  agent_type?: string
  client_id?: string | null
  client_name?: string | null
  content?: string
  created_at: string
  form_data?: Record<string, unknown> | null
  processo_id?: string | null
  numero_processo?: string | null
  protocolo?: string | null
  file_url?: string | null
  extracao_json?: ExtracaoDocumentoPdf | null
}

function docTypeLabel(d: Doc) {
  return d.title || d.agent_type || d.type || 'Petição'
}

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [processos, setProcessos] = useState<ProcessoParaPasta[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Doc | null>(null)
  const [linkingDoc, setLinkingDoc] = useState<Doc | null>(null)
  const [linkClientId, setLinkClientId] = useState('')
  const [linkManualName, setLinkManualName] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [extracaoSelecionada, setExtracaoSelecionada] = useState<{
    documentId: string
    extracao: ExtracaoDocumentoPdf
    title?: string | null
    clientId?: string | null
    clientName?: string | null
  } | null>(null)

  const [isLight, setIsLight] = useState(false)
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const membros = await carregarMembrosEscritorio(supabase, user.id)
        const memberIds = membros.map((m) => m.id)

        const docsQuery = supabase.from('documents').select('*').in('lawyer_id', memberIds).order('created_at', { ascending: false })
        const [{ data, error: docsError }, { data: clientList }, { data: procs }] = await Promise.all([
          docsQuery,
          supabase.from('clients').select('id, name, cpf, status').in('lawyer_id', memberIds).order('name'),
          supabase.from('processos').select('id, numero, tribunal, cliente_id').in('lawyer_id', memberIds),
        ])

        if (docsError) {
          console.error('[documentos] order by created_at:', docsError.message)
          const { data: fallback } = await supabase.from('documents').select('*').in('lawyer_id', memberIds)
          setDocs((fallback as Doc[]) || [])
        } else {
          setDocs((data as Doc[]) || [])
        }

        setClients((clientList as Client[]) || [])
        setProcessos((procs as ProcessoParaPasta[]) || [])
      } catch (err) {
        console.error('[documentos] load:', err)
        setDocs([])
      } finally {
        setLoading(false)
        const termoBusca = localStorage.getItem('marple_search')
        if (termoBusca) {
          setSearch(termoBusca)
          localStorage.removeItem('marple_search')
        }
      }
    }
    load()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  async function excluirDoc(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    await supabase.from('documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
    if (selected?.id === id) setSelected(null)
    if (linkingDoc?.id === id) setLinkingDoc(null)
  }

  function abrirVinculo(doc: Doc, e: React.MouseEvent) {
    e.stopPropagation()
    setLinkingDoc(doc)
    setLinkClientId(doc.client_id || '')
    setLinkManualName(doc.client_name || '')
  }

  async function salvarVinculo() {
    if (!linkingDoc) return
    const manual = linkManualName.trim()
    if (!linkClientId && !manual) {
      alert('Selecione um cliente cadastrado ou informe o nome manual.')
      return
    }
    setSavingLink(true)
    const selectedClient = clients.find(c => c.id === linkClientId)
    const updates = {
      client_id: selectedClient?.id || null,
      client_name: selectedClient?.name || manual,
    }
    const { error } = await supabase.from('documents').update(updates).eq('id', linkingDoc.id)
    setSavingLink(false)
    if (error) {
      alert('Erro ao vincular cliente.')
      return
    }
    setDocs(prev => prev.map(d => d.id === linkingDoc.id ? { ...d, ...updates } : d))
    if (selected?.id === linkingDoc.id) setSelected(prev => prev ? { ...prev, ...updates } : prev)
    setLinkingDoc(null)
  }

  const archivedClientIds = useMemo(
    () => new Set(clients.filter((c) => c.status === 'archived').map((c) => c.id)),
    [clients]
  )

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    const temBusca = term.length > 0
    const termDigits = term.replace(/\D/g, '')

    return docs.filter((d) => {
      const doClienteArquivado = Boolean(d.client_id && archivedClientIds.has(d.client_id))
      // Lista do dia a dia: esconde docs de casos arquivados. Busca e a aba
      // Arquivados continuam encontrando.
      if (!temBusca && !mostrarArquivados && doClienteArquivado) return false
      if (!temBusca && mostrarArquivados && !doClienteArquivado) return false

      if (!temBusca) return true

      const cliente = d.client_id ? clientsById.get(d.client_id) : undefined
      const protocolo = extrairNumeroProtocoloDoc(d)
      const haystack = [
        d.client_name,
        cliente?.name,
        cliente?.cpf,
        formatarCpfExibicao(cliente?.cpf),
        protocolo,
        d.agent_type,
        d.type,
        d.title,
        d.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (haystack.includes(term)) return true
      if (termDigits.length >= 3) {
        const digitos = [
          cliente?.cpf,
          protocolo,
          d.numero_processo,
          d.protocolo,
        ]
          .filter(Boolean)
          .join('')
          .replace(/\D/g, '')
        if (digitos.includes(termDigits)) return true
      }
      return false
    })
  }, [docs, debouncedSearch, archivedClientIds, mostrarArquivados, clientsById])

  const hasActiveSearch = debouncedSearch.trim().length > 0
  const isEmptyLibrary = docs.length === 0
  const isEmptySearch = !isEmptyLibrary && filtered.length === 0
  const docsExtracao = useMemo(
    () =>
      docs.filter(
        (d) =>
          d.agent_type === EXTRACAO_PDF_AGENT_TYPE ||
          Boolean(normalizarExtracao(d.extracao_json))
      ),
    [docs]
  )

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black mb-1">Meus <span className="text-gradient-gold">Documentos</span></h1>
          <p className="" style={{ color: isLight ? '#5E5E5E' : undefined }}>Organizados por cliente (CPF) e protocolo de processo</p>
        </div>
        <Link href="/agentes" className="btn-gold flex items-center gap-2 px-5 py-3 rounded-xl text-sm">
          <Plus size={16}/> Novo Documento
        </Link>
      </motion.div>

      <div className="mb-8">
        <ExtracaoPdfDocumento
          isLight={isLight}
          onConcluido={({ documentId, extracao, title }) => {
            setDocs((prev) => [
              {
                id: documentId,
                title,
                agent_type: EXTRACAO_PDF_AGENT_TYPE,
                content: extracao.resumo || '',
                created_at: new Date().toISOString(),
                extracao_json: extracao,
              },
              ...prev,
            ])
            setExtracaoSelecionada({ documentId, extracao, title })
          }}
        />
      </div>

      {docsExtracao.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
            <FileSearch size={16} color="#D4AF37" /> PDFs com extração ({docsExtracao.length})
          </h2>
          <div className="space-y-2 mb-4">
            {docsExtracao.slice(0, 12).map((d) => {
              const extr = normalizarExtracao(d.extracao_json)
              return (
                <GlassCard key={`ex-${d.id}`} intensity={0.35} style={{ padding: 14 }}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                        {d.title || 'PDF jurídico'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
                        {extr?.numero_processo ? `Proc. ${extr.numero_processo} · ` : ''}
                        {d.client_name ? `${d.client_name} · ` : ''}
                        {new Date(d.created_at).toLocaleDateString('pt-BR')}
                        {!extr ? ' · aguardando extração' : ''}
                      </div>
                    </div>
                    {extr && (
                      <button
                        type="button"
                        onClick={() =>
                          setExtracaoSelecionada({
                            documentId: d.id,
                            extracao: extr,
                            title: d.title,
                            clientId: d.client_id,
                            clientName: d.client_name,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[rgba(212,175,55,0.08)]"
                        style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                      >
                        Ver extração
                      </button>
                    )}
                  </div>
                </GlassCard>
              )
            })}
          </div>
          {extracaoSelecionada && (
            <ExtracaoPdfDocumento
              isLight={isLight}
              clientId={extracaoSelecionada.clientId}
              clientName={extracaoSelecionada.clientName}
              documentIdInicial={extracaoSelecionada.documentId}
              extracaoInicial={extracaoSelecionada.extracao}
            />
          )}
        </div>
      )}

      <div className="relative mb-6 max-w-md flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#666' }}/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, CPF, protocolo ou tipo..."
            className="input-glass w-full pl-11 pr-10 text-sm"
            style={{ height: 48 }} spellCheck={true} />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors hover:bg-white/5"
              aria-label="Limpar busca"
            >
              <X size={14} style={{ color: '#888' }}/>
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(['Ativos', 'Arquivados'] as const).map((aba) => {
            const ativo = (aba === 'Arquivados') === mostrarArquivados
            return (
              <button
                key={aba}
                type="button"
                onClick={() => setMostrarArquivados(aba === 'Arquivados')}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all"
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

      {hasActiveSearch && !isEmptySearch && (
        <p className="text-xs mb-4" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
          {filtered.length} documento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {isEmptyLibrary ? (
        <GlassCard intensity={0.3} style={{ padding: 48 }}>
          <div className="text-center">
            <FileText size={40} color="#333" className="mx-auto mb-3"/>
            <p className="mb-2" style={{ color: isLight ? '#5E5E5E' : undefined }}>Nenhum documento ainda</p>
            <Link href="/agentes" className="text-sm" style={{ color: '#D4AF37' }}>Gerar primeira peticao</Link>
          </div>
        </GlassCard>
      ) : isEmptySearch ? (
        <GlassCard intensity={0.3} style={{ padding: 48 }}>
          <div className="text-center">
            <Search size={40} color="#333" className="mx-auto mb-3"/>
            <p className="mb-1 font-medium" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Nenhum documento encontrado</p>
            <p className="text-sm mb-4" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
              Nenhum resultado para &ldquo;{debouncedSearch.trim()}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-sm transition-colors hover:opacity-80"
              style={{ color: '#D4AF37' }}
            >
              Limpar busca
            </button>
          </div>
        </GlassCard>
      ) : (
        <PastasDocumentos
          documentos={filtered}
          clientes={clients}
          processos={processos}
          isLight={isLight}
          buscaAtiva={hasActiveSearch}
          emptyMessage="Nenhum documento nestas pastas"
          renderDocumento={(d) => {
            const hasLinkedClient = Boolean(d.client_id)
            const clientLabel = d.client_name || (hasLinkedClient ? 'Cliente' : null)
            const arquivado = Boolean(d.client_id && archivedClientIds.has(d.client_id))
            return (
              <GlassCard intensity={0.6} style={{ padding: 16 }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                    <FileText size={18} color="#D4AF37"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{docTypeLabel(d as Doc)}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {clientLabel ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: isLight ? '#1E1E1E' : '#ddd' }}>
                          <User size={11} style={{ color: '#D4AF37' }}/>
                          {clientLabel}
                        </span>
                      ) : null}
                      {arquivado && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(136,136,136,0.15)', color: '#888' }}>
                          Arquivado
                        </span>
                      )}
                      {!hasLinkedClient && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                          Sem cliente vinculado
                        </span>
                      )}
                      <span className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
                        · {d.agent_type || d.type || 'Petição'} · {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  {!hasLinkedClient && (
                    <button
                      onClick={(e) => abrirVinculo(d as Doc, e)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[rgba(212,175,55,0.08)]"
                      style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                      title="Vincular cliente"
                    >
                      <Link2 size={14}/>
                    </button>
                  )}
                  <button onClick={() => setSelected(d as Doc)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                    <Eye size={14}/>
                  </button>
                  <button onClick={(e) => excluirDoc(d.id, e)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-red-500/10" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
                    <Trash2 size={14}/>
                  </button>
                </div>
              </GlassCard>
            )
          }}
        />
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setSelected(null)}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl p-8" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{docTypeLabel(selected)}</h2>
                <p className="text-xs mt-1" style={{ color: '#888' }}>
                  {selected.client_name ? `Cliente: ${selected.client_name}` : 'Sem cliente vinculado'}
                  {!selected.client_id && selected.client_name ? ' (nome manual)' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!selected.client_id && (
                  <button
                    onClick={() => { setLinkingDoc(selected); setLinkClientId(''); setLinkManualName(selected.client_name || '') }}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
                  >
                    Vincular cliente
                  </button>
                )}
                <DownloadButtons text={selected.content || ''} fileName={(selected.title || 'peticao').replace(/\s+/g, '-').toLowerCase()} />
                <button onClick={() => setSelected(null)} className="hover:text-white text-lg ml-2" style={{ color: isLight ? '#5E5E5E' : undefined }}>X</button>
              </div>
            </div>
            <AvisoCitacao text={selected.content || ''} className="mb-4"/>
            <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#ccc' }}>
              {selected.content || 'Conteudo nao disponivel.'}
            </div>
          </div>
        </div>
      )}

      {linkingDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setLinkingDoc(null)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.25)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#fff' }}>Vincular cliente</h3>
            <p className="text-xs mb-4" style={{ color: '#888' }}>{docTypeLabel(linkingDoc)}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Cliente cadastrado</label>
                <select
                  value={linkClientId}
                  onChange={e => {
                    setLinkClientId(e.target.value)
                    const c = clients.find(cl => cl.id === e.target.value)
                    if (c) setLinkManualName(c.name)
                  }}
                  className="input-glass w-full px-3 text-sm"
                  style={{ height: 44 }}
                >
                  <option value="">Selecionar cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.cpf ? ` — ${c.cpf}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Ou nome manual (sem cadastro)</label>
                <input
                  value={linkManualName}
                  onChange={e => setLinkManualName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="input-glass w-full px-3 text-sm"
                  style={{ height: 44 }}
                  disabled={Boolean(linkClientId)} spellCheck={true} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setLinkingDoc(null)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                  Cancelar
                </button>
                <button type="button" onClick={salvarVinculo} disabled={savingLink} className="btn-gold flex-1 py-2.5 rounded-xl text-sm font-bold">
                  {savingLink ? 'Salvando...' : 'Salvar vínculo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
