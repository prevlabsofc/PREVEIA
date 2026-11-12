'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, FileText, Loader2, Save, X, ChevronDown } from 'lucide-react'
import { DownloadButtons } from '@/components/DownloadButtons'
import { PeticaoEditorComPreview } from '@/components/peticao/PeticaoEditorComPreview'
import {
  listarModelosEscritorio,
  listarModelosUnificados,
  gerarDocumentoDeModelo,
  extrairVariaveisDoTexto,
  variavelPorChave,
  variaveisPendentes,
  agentTypeDoModelo,
  rotuloTipoModelo,
  type TipoModeloDocumento,
  type ModeloListagem,
  type CamposExtrasModelo,
} from '@/lib/modelos'
import {
  agentesParaBotaoCliente,
  rotuloTipoDocumentoAgente,
  tipoDocumentoAgentePorId,
  type BotaoClienteDocumento,
} from '@/lib/agentes/tipos-documento-agente'
import type { EstiloPeticao } from '@/lib/peticao-export'

function botaoDoTipoModelo(tipo: TipoModeloDocumento): BotaoClienteDocumento {
  if (tipo === 'contrato_servicos') return 'contrato'
  if (tipo === 'contrato_honorarios') return 'honorarios'
  return 'peticao'
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
  open: boolean
  onClose: () => void
  tipo: TipoModeloDocumento
  cliente: Record<string, any>
  isLight?: boolean
  onSalvo?: (doc: { id: string; title: string; agent_type: string }) => void
}

const CAMPOS_EXTRAS: { chave: string; label: string; placeholder?: string }[] = [
  { chave: 'beneficio', label: 'Benefício / tipo de ação', placeholder: 'Ex: Salário-maternidade rural' },
  { chave: 'tipo_acao', label: 'Tipo de ação (alias)', placeholder: 'Ex: Salário-maternidade rural' },
  { chave: 'motivo_indeferimento', label: 'Motivo do indeferimento', placeholder: 'Ex: Falta de carência' },
  { chave: 'data_parto', label: 'Data do parto', placeholder: 'dd/mm/aaaa' },
  { chave: 'valor_causa', label: 'Valor da causa', placeholder: 'R$ …' },
  { chave: 'comarca', label: 'Comarca / subseção', placeholder: 'São Luís' },
  { chave: 'objeto_contrato', label: 'Objeto do contrato', placeholder: 'Prestação de serviços…' },
  { chave: 'descricao_servico', label: 'Descrição dos serviços', placeholder: 'Patrocínio da causa…' },
  { chave: 'data_contrato', label: 'Data do contrato', placeholder: 'São Luís, 12 de novembro de 2026' },
  { chave: 'tipo_honorario', label: 'Tipo de honorário', placeholder: 'percentual | fixo | misto' },
  { chave: 'percentual_exito', label: 'Percentual de êxito (%)', placeholder: '30' },
  { chave: 'valor_fixo', label: 'Valor fixo', placeholder: 'R$ 2.000,00' },
  { chave: 'valor_honorarios', label: 'Valor dos honorários', placeholder: 'R$ …' },
  { chave: 'forma_pagamento', label: 'Forma de pagamento', placeholder: 'À vista / parcelado / no êxito' },
  { chave: 'prazo', label: 'Prazo estimado', placeholder: '12 meses' },
  { chave: 'estado_civil', label: 'Estado civil', placeholder: 'Casado(a)' },
  { chave: 'nacionalidade', label: 'Nacionalidade', placeholder: 'brasileiro(a)' },
  { chave: 'observacoes', label: 'Observações', placeholder: 'Cláusulas extras…' },
]

export function GerarDocumentoModelo({
  open,
  onClose,
  tipo,
  cliente,
  isLight = false,
  onSalvo,
}: Props) {
  const [lawyerId, setLawyerId] = useState('')
  const [advogado, setAdvogado] = useState<Record<string, any> | null>(null)
  const [modelos, setModelos] = useState<ModeloListagem[]>([])
  const [modeloId, setModeloId] = useState('')
  const [agentesIa, setAgentesIa] = useState<any[]>([])
  const [extras, setExtras] = useState<CamposExtrasModelo>({
    percentual_exito: '30',
    tipo_honorario: tipo === 'contrato_honorarios' ? 'percentual' : '',
    prazo: '12 meses',
    nacionalidade: 'brasileiro(a)',
  })
  const [passo, setPasso] = useState<'escolher' | 'extras' | 'editar'>('escolher')
  const [documento, setDocumento] = useState('')
  const [titulo, setTitulo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [docId, setDocId] = useState<string | null>(null)

  const precisaExtras =
    tipo === 'contrato_servicos' || tipo === 'contrato_honorarios' || tipo === 'peticao'

  useEffect(() => {
    if (!open) return
    setPasso('escolher')
    setDocumento('')
    setDocId(null)
    setErro('')
    setTitulo(`${rotuloTipoModelo(tipo)} — ${cliente?.name || 'Cliente'}`)

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setLawyerId(user.id)
      const { data: l } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setAdvogado(l)
      const { data: copias } = await listarModelosEscritorio(supabase, user.id)
      const todos = listarModelosUnificados(copias).filter((m) => m.tipo === tipo)
      setModelos(todos)
      const preferido =
        todos.find((m) => m.origem === 'escritorio') ||
        todos.find((m) => m.origem === 'padrao') ||
        todos[0]
      setModeloId(preferido?.id || '')
      const { data: agents } = await supabase
        .from('custom_agents')
        .select('id, name, document_type, document_type_label')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false })
      setAgentesIa(
        agentesParaBotaoCliente(agents || [], botaoDoTipoModelo(tipo))
      )
      if (l?.cidade || cliente?.city) {
        setExtras((e) => ({
          ...e,
          cidade_foro: e.cidade_foro || l?.cidade || cliente?.city || '',
          comarca: e.comarca || l?.cidade || cliente?.city || '',
        }))
      }
    }
    load()
  }, [open, tipo, cliente?.name, cliente?.city])

  const modeloSel = useMemo(
    () => modelos.find((m) => m.id === modeloId) || null,
    [modelos, modeloId]
  )

  const camposExtrasVisiveis = useMemo(() => {
    if (!modeloSel) return CAMPOS_EXTRAS
    const usadas = new Set(extrairVariaveisDoTexto(modeloSel.conteudo))
    const filtrados = CAMPOS_EXTRAS.filter((c) => usadas.has(c.chave))
    // Petição: só campos extras realmente usados; contratos: fallback completo
    if (filtrados.length > 0) return filtrados
    if (tipo === 'peticao') return CAMPOS_EXTRAS.filter((c) =>
      ['beneficio', 'motivo_indeferimento', 'data_parto', 'valor_causa', 'comarca'].includes(c.chave)
    )
    return CAMPOS_EXTRAS
  }, [modeloSel, tipo])

  const pendentes = useMemo(
    () => (passo === 'editar' ? variaveisPendentes(documento) : []),
    [passo, documento]
  )

  function avancarDeEscolha() {
    if (!modeloSel) {
      setErro('Selecione um modelo.')
      return
    }
    setErro('')
    if (precisaExtras) setPasso('extras')
    else gerar()
  }

  function gerar() {
    if (!modeloSel) return
    const texto = gerarDocumentoDeModelo(modeloSel.conteudo, {
      cliente,
      advogado,
      extras,
    })
    setDocumento(texto)
    setPasso('editar')
  }

  async function salvarDocumento() {
    if (!lawyerId || !documento.trim()) return
    setSalvando(true)
    setErro('')
    const agent_type = agentTypeDoModelo(tipo)
    const payload = {
      lawyer_id: lawyerId,
      client_id: cliente?.id || null,
      client_name: cliente?.name || null,
      agent_type,
      title: titulo.trim() || rotuloTipoModelo(tipo),
      content: documento,
      form_data: {
        origem: 'modelos',
        modelo_id: modeloSel?.id || null,
        modelo_nome: modeloSel?.nome || null,
        tipo_modelo: tipo,
        extras,
      },
      status: 'generated',
    }

    if (docId) {
      const { error } = await supabase
        .from('documents')
        .update({
          title: payload.title,
          content: payload.content,
          form_data: payload.form_data,
        })
        .eq('id', docId)
      setSalvando(false)
      if (error) {
        setErro(error.message)
        return
      }
      onSalvo?.({ id: docId, title: payload.title, agent_type })
      return
    }

    const { data, error } = await supabase.from('documents').insert(payload).select('id, title, agent_type').single()
    setSalvando(false)
    if (error || !data) {
      setErro(error?.message || 'Não foi possível salvar o documento.')
      return
    }
    setDocId(data.id)
    onSalvo?.({ id: data.id, title: data.title || payload.title, agent_type: data.agent_type || agent_type })
  }

  if (!open) return null

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corSec = isLight ? '#5E5E5E' : '#9ca3af'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-5xl max-h-[92vh] overflow-auto rounded-2xl p-6"
          style={{
            background: isLight ? '#FFFFFF' : '#0A0A0A',
            border: isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: corTexto }}>
                <FileText size={20} color="#D4AF37" />
                Gerar {rotuloTipoModelo(tipo).toLowerCase()}
              </h2>
              <p className="text-xs mt-1" style={{ color: corSec }}>
                Cliente: {cliente?.name || '—'} · CPF: {cliente?.cpf || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5"
              style={{ color: corSec }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {passo === 'escolher' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: corSec }}>
                  Modelo
                </label>
                <div className="relative">
                  <select
                    value={modeloId}
                    onChange={(e) => setModeloId(e.target.value)}
                    className="input-glass w-full px-4 text-sm appearance-none"
                    style={{ height: 44, cursor: 'pointer' }}
                  >
                    {modelos.length === 0 && <option value="">Nenhum modelo disponível</option>}
                    {modelos.map((m) => (
                      <option key={m.id} value={m.id} style={{ background: '#111' }}>
                        {m.origem === 'padrao' ? '⭐ ' : '📁 '}
                        {m.nome}
                        {m.origem === 'padrao' ? ' (padrão do sistema)' : ' (seu modelo)'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#888' }}
                  />
                </div>
                {modeloSel?.descricao && (
                  <p className="text-[11px] mt-1.5" style={{ color: corSec }}>
                    {modeloSel.descricao}
                  </p>
                )}
              </div>

              {agentesIa.length > 0 && (
                <div>
                  <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#D4AF37' }}>
                    <Bot size={13} /> Agentes próprios deste tipo
                  </p>
                  <div className="space-y-1.5">
                    {agentesIa.map((a) => {
                      const cor = tipoDocumentoAgentePorId(a.document_type)?.cor || '#D4AF37'
                      const rotulo = rotuloTipoDocumentoAgente(a.document_type, a.document_type_label)
                      const href = `/agentes?custom=${encodeURIComponent(a.id)}${
                        cliente?.id ? `&clienteId=${encodeURIComponent(cliente.id)}` : ''
                      }`
                      return (
                        <Link
                          key={a.id}
                          href={href}
                          onClick={onClose}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors hover:bg-white/5"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <span className="font-semibold truncate" style={{ color: corTexto }}>
                            {a.name}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                            style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}55` }}
                          >
                            {rotulo}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {erro && (
                <p className="text-xs" style={{ color: '#EF4444' }}>
                  {erro}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
                >
                  Cancelar
                </button>
                <button type="button" onClick={avancarDeEscolha} className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold">
                  {precisaExtras ? 'Continuar' : 'Gerar documento'}
                </button>
              </div>
            </div>
          )}

          {passo === 'extras' && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: corSec }}>
                Preencha os campos extras. Dados do cliente e do advogado já serão aplicados automaticamente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {camposExtrasVisiveis.map((c) => {
                  const meta = variavelPorChave(c.chave)
                  return (
                    <div key={c.chave} className={c.chave === 'observacoes' || c.chave === 'descricao_servico' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs mb-1" style={{ color: corSec }}>
                        {c.label}
                        {meta && (
                          <span className="ml-1" style={{ color: '#D4AF37' }}>
                            {`{{${c.chave}}}`}
                          </span>
                        )}
                      </label>
                      {c.chave === 'observacoes' || c.chave === 'descricao_servico' ? (
                        <textarea
                          value={extras[c.chave] || ''}
                          onChange={(e) => setExtras((x) => ({ ...x, [c.chave]: e.target.value }))}
                          placeholder={c.placeholder}
                          className="input-glass w-full px-3 py-2 text-sm"
                          style={{ height: 72, resize: 'none' }}
                          spellCheck
                        />
                      ) : c.chave === 'tipo_honorario' ? (
                        <select
                          value={extras.tipo_honorario || 'percentual'}
                          onChange={(e) => setExtras((x) => ({ ...x, tipo_honorario: e.target.value }))}
                          className="input-glass w-full px-3 text-sm"
                          style={{ height: 40 }}
                        >
                          <option value="percentual" style={{ background: '#111' }}>
                            Percentual (êxito)
                          </option>
                          <option value="fixo" style={{ background: '#111' }}>
                            Valor fixo
                          </option>
                          <option value="misto" style={{ background: '#111' }}>
                            Misto
                          </option>
                        </select>
                      ) : (
                        <input
                          value={extras[c.chave] || ''}
                          onChange={(e) => setExtras((x) => ({ ...x, [c.chave]: e.target.value }))}
                          placeholder={c.placeholder}
                          className="input-glass w-full px-3 text-sm"
                          style={{ height: 40 }}
                          spellCheck
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setPasso('escolher')}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
                >
                  Voltar
                </button>
                <button type="button" onClick={gerar} className="btn-gold px-5 py-2.5 rounded-xl text-sm font-bold">
                  Gerar documento
                </button>
              </div>
            </div>
          )}

          {passo === 'editar' && (
            <div>
              {pendentes.length > 0 && (
                <div
                  className="mb-3 px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: 'rgba(250,204,21,0.12)',
                    border: '1px solid rgba(250,204,21,0.45)',
                    color: '#854D0E',
                  }}
                >
                  <strong>Campos em amarelo:</strong> dados faltando — preencha manualmente no editor
                  antes de exportar:{' '}
                  {pendentes.map((p) => (
                    <span
                      key={p}
                      className="inline-block mx-0.5 px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: '#FEF08A', border: '1px solid #FACC15' }}
                    >
                      {`{{${p}}}`}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="input-glass flex-1 min-w-[200px] px-3 text-sm"
                  style={{ height: 40 }}
                  placeholder="Título do documento"
                  spellCheck
                />
                <button
                  type="button"
                  onClick={salvarDocumento}
                  disabled={salvando}
                  className="btn-gold px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {docId ? 'Atualizar' : 'Salvar'}
                </button>
                <DownloadButtons
                  text={documento}
                  fileName={(titulo || 'documento').replace(/\s+/g, '-').toLowerCase()}
                  agentType={agentTypeDoModelo(tipo)}
                  previewFirst
                />
              </div>
              {erro && (
                <p className="text-xs mb-2" style={{ color: '#EF4444' }}>
                  {erro}
                </p>
              )}
              {docId && !erro && (
                <p className="text-[11px] mb-2" style={{ color: '#22C55E' }}>
                  Documento salvo no histórico do cliente.
                </p>
              )}
              <PeticaoEditorComPreview
                text={documento}
                onChange={setDocumento}
                fileName={(titulo || 'documento').replace(/\s+/g, '-').toLowerCase()}
                estilo={'moderno' as EstiloPeticao}
                editable
                isLight={isLight}
                adv={advogado}
                agentType={agentTypeDoModelo(tipo)}
                clientId={cliente?.id}
                clientName={cliente?.name}
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setPasso(precisaExtras ? 'extras' : 'escolher')}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
                >
                  Voltar
                </button>
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm ml-auto" style={{ color: corSec }}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
