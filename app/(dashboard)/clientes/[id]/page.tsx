'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Mail, MapPin, FileText, Archive, Edit2, Save, X, Bot, Clock, Sparkles, Plus, Eye, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { GlassCard } from '@/components/GlassCard'
import HistoricoAprovacoesCliente from '@/components/clientes/HistoricoAprovacoesCliente'
import EtapaFunilCliente from '@/components/clientes/EtapaFunilCliente'
import { ResumoDocumentosCliente } from '@/components/clientes/ResumoDocumentosCliente'
import LinkAceiteCliente from '@/components/clientes/LinkAceiteCliente'
import { BadgeQualidadePendente } from '@/components/clientes/ValidacaoQualidadeImagem'
import { PastasDocumentos } from '@/components/documentos/PastasDocumentos'
import { ExtracaoPdfDocumento } from '@/components/documentos/ExtracaoPdfDocumento'
import { DownloadButtons } from '@/components/DownloadButtons'
import { EXTRACAO_PDF_AGENT_TYPE } from '@/lib/extracao-documento-pdf'
import { rotuloStatusFinal } from '@/lib/client-archive'
import { CHECKLIST_ANEXO_AGENT_TYPE, type DocChecklist } from '@/lib/checklist-inss'
import { carregarMembrosEscritorio, carregarNomesForaDaEquipe, type MembroEquipe } from '@/lib/equipe'
import { PainelCrmCliente } from '@/components/clientes/PainelCrmCliente'
import { ehContratoHonorarios, rotuloTipoContratoHonorarios } from '@/lib/contrato-honorarios'
import { useFeedback } from '@/components/clientes/clientes-shared'
import FeedbackToast from '@/components/clientes/FeedbackToast'
import type { ProcessoParaPasta } from '@/lib/documentos-pastas'
import { UFS_BRASIL } from '@/lib/estados-brasil'
import { juntarEnderecoLegado, mascaraCEP } from '@/lib/formatar-endereco'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/** Metadados para a checklist — sem `content` (texto integral da peça). */
function metaDocs(rows: any[]): DocChecklist[] {
  return (rows || []).map((d) => ({
    title: d.title,
    type: d.type,
    agent_type: d.agent_type,
    form_data: d.form_data,
    file_name: d.form_data?.file_name ?? null,
    qualidade_pendente:
      Boolean(d.qualidade_pendente) || Boolean(d.form_data?.qualidade_pendente),
  }))
}

export default function ClienteDetalhesPage() {
  const { id } = useParams()
  const router = useRouter()
  const [client, setClient] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [processos, setProcessos] = useState<ProcessoParaPasta[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [isLight, setIsLight] = useState(false)
  const [showAddPeticao, setShowAddPeticao] = useState(false)
  const [novaPeticao, setNovaPeticao] = useState({ titulo: '', conteudo: '', created_at: '' })
  const [salvandoPeticao, setSalvandoPeticao] = useState(false)
  const [contratoAberto, setContratoAberto] = useState<any>(null)
  const [contratoConteudo, setContratoConteudo] = useState('')
  const [carregandoContrato, setCarregandoContrato] = useState(false)
  const [editandoContrato, setEditandoContrato] = useState(false)
  const [salvandoContrato, setSalvandoContrato] = useState(false)
  const [feedback, mostrarFeedback] = useFeedback()
  const [membros, setMembros] = useState<MembroEquipe[]>([])
  const [nomesExtras, setNomesExtras] = useState<Record<string, string>>({})

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
      if (!user || !id) return
      const membrosLista = await carregarMembrosEscritorio(supabase, user.id)
      const memberIds = membrosLista.map((m) => m.id)
      setMembros(membrosLista)

      const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
      if (c?.assigned_lawyer_id && !membrosLista.some((m) => m.id === c.assigned_lawyer_id)) {
        const extras = await carregarNomesForaDaEquipe(supabase, [c.assigned_lawyer_id])
        setNomesExtras(extras)
      } else {
        setNomesExtras({})
      }

      // Só metadados: bastam para matching da checklist e não carregam o texto da peça.
      const [{ data: d }, { data: procs }] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, type, agent_type, form_data, status, created_at, client_id, client_name')
          .in('lawyer_id', memberIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('processos')
          .select('id, numero, tribunal, cliente_id')
          .eq('cliente_id', id)
          .in('lawyer_id', memberIds),
      ])
      const clientDocs = (d || []).filter((doc: any) => doc.client_id === id || doc.client_name === c?.name)
      setClient(c)
      setForm(c || {})
      setDocs(clientDocs)
      setProcessos((procs as ProcessoParaPasta[]) || [])
      setLoading(false)
    }
    if (id) load()
  }, [id])

  async function salvar() {
    setSaving(true)
    // Mantém `address` (legado) em sincronia com rua+número+bairro, para não
    // quebrar telas que ainda só leem esse campo — ver comentário na migração
    // 20260801_clients_endereco_estruturado.sql.
    const payload = { ...form, address: juntarEnderecoLegado(form) || form.address || '' }
    await supabase.from('clients').update(payload).eq('id', id)
    setClient(payload); setForm(payload); setEditing(false); setSaving(false)
  }

  async function arquivar() {
    const novoStatus = client.status === 'archived' ? 'active' : 'archived'
    await supabase.from('clients').update({ status: novoStatus }).eq('id', id)
    setClient({ ...client, status: novoStatus })
  }

  function gerarPeticao() {
    const params = new URLSearchParams({
      clienteId: id as string,
      clienteNome: client?.name || '',
      clienteCPF: client?.cpf || '',
    })
    router.push(`/agentes?${params.toString()}`)
  }

  async function adicionarPeticaoManual() {
    if (!novaPeticao.titulo || !novaPeticao.conteudo) return
    setSalvandoPeticao(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('documents').insert({
      lawyer_id: user.id,
      client_id: id,
      client_name: client?.name,
      agent_type: 'manual',
      title: novaPeticao.titulo,
      content: novaPeticao.conteudo,
      status: 'generated',
      created_at: novaPeticao.created_at ? new Date(novaPeticao.created_at).toISOString() : new Date().toISOString(),
    })
    setShowAddPeticao(false)
    setNovaPeticao({ titulo: '', conteudo: '', created_at: '' })
    setSalvandoPeticao(false)
    const membros = await carregarMembrosEscritorio(supabase, user.id)
    const memberIds = membros.map((m) => m.id)
    const { data: d } = await supabase
      .from('documents')
      .select('id, title, type, agent_type, form_data, status, created_at, client_id, client_name')
      .in('lawyer_id', memberIds)
      .order('created_at', { ascending: false })
    const clientDocs = (d || []).filter((doc: any) => doc.client_id === id || doc.client_name === client?.name)
    setDocs(clientDocs)
  }

  /**
   * O texto integral do contrato não vem na consulta de listagem (só metadados,
   * ver `metaDocs`) — busca sob demanda ao abrir, no mesmo padrão de
   * ExtracaoPdfDocumento para não pesar a carga inicial da ficha.
   */
  async function abrirContrato(doc: any) {
    setContratoAberto(doc)
    setEditandoContrato(false)
    setCarregandoContrato(true)
    const { data, error } = await supabase.from('documents').select('content').eq('id', doc.id).single()
    setContratoConteudo(error ? '' : (data?.content || ''))
    setCarregandoContrato(false)
  }

  function fecharContrato() {
    setContratoAberto(null)
    setContratoConteudo('')
    setEditandoContrato(false)
  }

  async function salvarEdicaoContrato() {
    if (!contratoAberto) return
    setSalvandoContrato(true)
    const { error } = await supabase.from('documents').update({ content: contratoConteudo }).eq('id', contratoAberto.id)
    setSalvandoContrato(false)
    if (error) {
      mostrarFeedback('erro', 'Não foi possível salvar as alterações do contrato.')
      return
    }
    mostrarFeedback('sucesso', 'Contrato atualizado.')
    setEditandoContrato(false)
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
    </div>
  )

  if (!client) return (
    <div className="p-8 text-center text-gray-400">Cliente não encontrado</div>
  )

  const statusColor = client.status === 'archived' ? '#888' : '#22C55E'
  const contratos = docs.filter((d: any) => ehContratoHonorarios(d.agent_type))
  const peticoes = docs.filter(
    (d: any) =>
      d.agent_type !== CHECKLIST_ANEXO_AGENT_TYPE &&
      d.agent_type !== EXTRACAO_PDF_AGENT_TYPE &&
      !ehContratoHonorarios(d.agent_type)
  )

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/clientes" className="flex items-center gap-2 text-sm transition-all hover:opacity-70" style={{ color: '#D4AF37' }}>
            <ArrowLeft size={16}/> Voltar
          </Link>
          <div className="flex-1"/>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: `${statusColor}18`, color: statusColor }}>
              {client.status === 'archived' ? 'Arquivado' : 'Ativo'}
            </span>
            {rotuloStatusFinal(client.status_final) && (
              <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                {rotuloStatusFinal(client.status_final)}
              </span>
            )}
            <button onClick={arquivar} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 flex items-center gap-1.5" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
              <Archive size={13}/> {client.status === 'archived' ? 'Reativar' : 'Arquivar'}
            </button>
          </div>
        </div>

        {/* PERFIL */}
        <GlassCard intensity={0.5} style={{ padding: 28, marginBottom: 20 }}>
          <div className="flex items-start gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8941F)', color: '#000' }}>
              {client.name?.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase()}
            </div>
            <div className="flex-1">
              {editing ? (
                <input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} className="input-glass w-full px-4 text-lg font-bold mb-2" style={{ height: 48 }} spellCheck={true} />
              ) : (
                <h1 className="text-2xl font-bold mb-1" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{client.name}</h1>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-400">CPF: {client.cpf}</span>
                {client.zona && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{client.zona === 'rural' ? '🌾 Rural' : '🏢 Urbano'}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button onClick={salvar} disabled={saving} className="btn-gold flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm">
                    <Save size={15}/> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => { setEditing(false); setForm(client) }} className="px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                    <X size={15}/>
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-gold flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold">
                  <Edit2 size={17}/> Editar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Mail, label: 'Email', field: 'email', type: 'email' },
              { icon: Phone, label: 'Telefone', field: 'phone', type: 'tel' },
              { icon: MapPin, label: 'Rua', field: 'rua', type: 'text' },
              { icon: MapPin, label: 'Número', field: 'numero', type: 'text' },
              { icon: MapPin, label: 'Bairro', field: 'bairro', type: 'text' },
              { icon: MapPin, label: 'CEP', field: 'cep', type: 'text' },
              { icon: MapPin, label: 'Cidade', field: 'city', type: 'text' },
              { icon: MapPin, label: 'Estado (UF)', field: 'state', type: 'text' },
            ].map(({ icon: Icon, label, field, type }) => (
              <div key={field} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)' }}>
                <Icon size={15} color="#D4AF37" className="flex-shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                  {editing ? (
                    field === 'state' ? (
                      <select value={form.state || ''} onChange={e => setForm((f: any) => ({ ...f, state: e.target.value }))} className="input-glass w-full px-3 text-sm" style={{ height: 36, cursor: 'pointer' }}>
                        <option value="">—</option>
                        {UFS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    ) : field === 'cep' ? (
                      <input type="text" value={form.cep || ''} placeholder="00000-000" maxLength={9}
                        onChange={e => setForm((f: any) => ({ ...f, cep: mascaraCEP(e.target.value) }))}
                        className="input-glass w-full px-3 text-sm" style={{ height: 36 }} spellCheck={true} />
                    ) : (
                      <input type={type} value={form[field] || ''} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} className="input-glass w-full px-3 text-sm" style={{ height: 36 }} spellCheck={type === 'text'}/>
                    )
                  ) : (
                    <div className="text-sm truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{client[field] || '—'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <PainelCrmCliente
          clientId={String(id)}
          ultimoContato={client.last_contact_at}
          responsavelId={client.assigned_lawyer_id}
          membros={membros}
          nomesExtras={nomesExtras}
          isLight={isLight}
          onAtualizar={(patch) => {
            setClient((c: any) => ({ ...c, ...patch }))
            setForm((f: any) => ({ ...f, ...patch }))
          }}
        />

        <div className="mb-6">
          <EtapaFunilCliente
            clientId={String(id)}
            stage={client.stage}
            isLight={isLight}
            onAtualizar={(patch) => setClient((c: any) => ({ ...c, ...patch }))}
          />
        </div>

        {/* CHECKLIST INSS — resumo X/Y + pendências + upload */}
        <ResumoDocumentosCliente
          clientId={id as string}
          clientName={client.name}
          phone={client.whatsapp || client.phone}
          tipoBeneficio={client.tipo_beneficio}
          documentos={metaDocs(docs)}
          isLight={isLight}
          onTipoBeneficioChange={(valor) => {
            setClient((c: any) => ({ ...c, tipo_beneficio: valor || null }))
            setForm((f: any) => ({ ...f, tipo_beneficio: valor || null }))
          }}
          onDocsAtualizados={(docsAtuais) => {
            // Mantém ids/created_at dos docs já carregados; anexa os novos metadados.
            setDocs((prev) => {
              const existentes = new Set(prev.map((d: any) => `${d.title}|${d.agent_type}|${d.form_data?.file_name}`))
              const extras = docsAtuais
                .filter((m) => !existentes.has(`${m.title}|${m.agent_type}|${m.file_name}`))
                .map((m, i) => ({
                  id: `local-${Date.now()}-${i}`,
                  title: m.title,
                  type: m.type,
                  agent_type: m.agent_type,
                  form_data: m.form_data,
                  qualidade_pendente: Boolean(m.qualidade_pendente),
                  created_at: new Date().toISOString(),
                  client_id: id,
                  client_name: client.name,
                  status: 'uploaded',
                }))
              return [...extras, ...prev]
            })
          }}
        />

        {/* Extração de sentenças / acórdãos / petições longas */}
        <div className="mb-6">
          <ExtracaoPdfDocumento
            clientId={id as string}
            clientName={client.name}
            clientCpf={client.cpf}
            isLight={isLight}
            onConcluido={({ documentId, extracao, title }) => {
              setDocs((prev) => [
                {
                  id: documentId,
                  title,
                  agent_type: EXTRACAO_PDF_AGENT_TYPE,
                  form_data: { file_name: title, origem: 'extracao-pdf' },
                  created_at: new Date().toISOString(),
                  client_id: id,
                  client_name: client.name,
                  status: 'extracted',
                  extracao_json: extracao,
                },
                ...prev,
              ])
            }}
          />
        </div>

        {/* Anexos de prova com marcador de qualidade */}
        {docs.some((d: any) => d.agent_type === CHECKLIST_ANEXO_AGENT_TYPE) && (
          <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
            <h3 className="font-bold flex items-center gap-2 mb-3" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              <FileText size={18} color="#D4AF37" /> Documentos anexados
            </h3>
            <div className="space-y-2">
              {docs
                .filter((d: any) => d.agent_type === CHECKLIST_ANEXO_AGENT_TYPE)
                .map((d: any, i: number) => {
                  const qualidade =
                    Boolean(d.qualidade_pendente) || Boolean(d.form_data?.qualidade_pendente)
                  return (
                    <div
                      key={d.id || i}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                          {d.title || d.form_data?.file_name || 'Anexo'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}
                        </div>
                      </div>
                      {qualidade && <BadgeQualidadePendente />}
                    </div>
                  )
                })}
            </div>
          </GlassCard>
        )}

        {/* AÇÕES RÁPIDAS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button onClick={gerarPeticao} className="btn-gold flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold">
            <Bot size={18}/> Gerar Petição
          </button>
          <Link href={`/ia?cliente=${encodeURIComponent(client.name)}`} className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all hover:bg-white/5" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
            <Sparkles size={18}/> Consultar IA
          </Link>
          <Link href={`/jurisprudencia`} className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
            <FileText size={18}/> Jurisprudência
          </Link>
        </div>

        <LinkAceiteCliente clientId={id as string} isLight={isLight} />

        {/* CONTRATOS SALVOS — gerados em /honorarios (ou no catálogo de /agentes) */}
        <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="font-bold flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              <Briefcase size={18} color="#D4AF37"/> Contratos Salvos ({contratos.length})
            </h3>
            <Link href="/honorarios" className="btn-gold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
              <Plus size={13}/> Gerar novo contrato
            </Link>
          </div>
          {contratos.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase size={32} color="#333" className="mx-auto mb-2"/>
              <p className="text-sm text-gray-500 mb-3">Nenhum contrato salvo ainda</p>
              <Link href="/honorarios" className="btn-gold px-5 py-2 rounded-xl text-sm inline-block">
                Gerar contrato de honorários →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {contratos.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                    <Briefcase size={15} color="#D4AF37"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{d.title || 'Contrato de Honorários'}</div>
                    <div className="text-xs text-gray-500">
                      {rotuloTipoContratoHonorarios(d.agent_type)} · {d.created_at ? new Date(d.created_at).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                  <button onClick={() => abrirContrato(d)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 flex items-center gap-1.5" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                    <Eye size={13}/> Abrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* HISTÓRICO DE PETIÇÕES — centralizado por protocolo */}
        <GlassCard intensity={0.3} style={{ padding: 24 }}>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="font-bold flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              <Clock size={18} color="#D4AF37"/> Histórico de Petições ({peticoes.length})
            </h3>
            <button onClick={() => setShowAddPeticao(true)} className="btn-gold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
              <Plus size={13}/> Adicionar petição antiga
            </button>
          </div>
          {peticoes.length === 0 && processos.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={32} color="#333" className="mx-auto mb-2"/>
              <p className="text-sm text-gray-500 mb-3">Nenhuma petição gerada ainda</p>
              <button onClick={gerarPeticao} className="btn-gold px-5 py-2 rounded-xl text-sm">
                Gerar primeira petição →
              </button>
            </div>
          ) : (
            <PastasDocumentos
              documentos={peticoes}
              clientes={[{ id: String(id), name: client.name, cpf: client.cpf, status: client.status }]}
              processos={processos}
              isLight={isLight}
              modoCliente
              clientIdFiltro={String(id)}
              emptyMessage="Nenhuma petição neste histórico"
              renderDocumento={(d) => (
                <div className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                    <FileText size={15} color="#D4AF37"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{d.title || d.type || 'Petição'}</div>
                    <div className="text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Concluído</span>
                </div>
              )}
            />
          )}
        </GlassCard>

        <HistoricoAprovacoesCliente clientId={id as string} isLight={isLight} />
      </motion.div>

      {showAddPeticao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowAddPeticao(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-4">Adicionar Petição ao Histórico</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Título *</label>
                <input value={novaPeticao.titulo} onChange={e => setNovaPeticao(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Aposentadoria Rural — 2024" className="input-glass w-full px-4 text-sm" style={{ height: 44 }} spellCheck={true} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data (opcional)</label>
                <input type="date" value={novaPeticao.created_at} onChange={e => setNovaPeticao(p => ({ ...p, created_at: e.target.value }))} className="input-glass w-full px-4 text-sm" style={{ height: 44 }}/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Conteúdo / Histórico *</label>
                <textarea value={novaPeticao.conteudo} onChange={e => setNovaPeticao(p => ({ ...p, conteudo: e.target.value }))} placeholder="Cole aqui o texto da petição ou um resumo do histórico..." className="input-glass w-full px-4 text-sm" style={{ height: 120, resize: 'none', paddingTop: 10 }} spellCheck={true} />
              </div>
              <div className="flex gap-2">
                <button onClick={adicionarPeticaoManual} disabled={salvandoPeticao} className="btn-gold flex-1 py-2.5 rounded-xl text-sm font-bold">
                  {salvandoPeticao ? 'Salvando...' : 'Salvar no histórico'}
                </button>
                <button onClick={() => setShowAddPeticao(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contratoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={fecharContrato}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl p-8" style={{ background: '#0A0A0A', border: '1px solid rgba(212,175,55,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{contratoAberto.title || 'Contrato de Honorários'}</h2>
                <p className="text-xs mt-1" style={{ color: '#888' }}>
                  {rotuloTipoContratoHonorarios(contratoAberto.agent_type)}
                  {contratoAberto.created_at ? ` · ${new Date(contratoAberto.created_at).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!carregandoContrato && !editandoContrato && (
                  <button onClick={() => setEditandoContrato(true)} className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                    <Edit2 size={13}/> Editar
                  </button>
                )}
                {!carregandoContrato && (
                  <DownloadButtons text={contratoConteudo} fileName={(contratoAberto.title || 'contrato-honorarios').replace(/\s+/g, '-').toLowerCase()} />
                )}
                <button onClick={fecharContrato} className="hover:text-white text-lg ml-1 text-gray-400">X</button>
              </div>
            </div>

            {carregandoContrato ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}/>
              </div>
            ) : editandoContrato ? (
              <div>
                <textarea
                  value={contratoConteudo}
                  onChange={e => setContratoConteudo(e.target.value)}
                  className="input-glass w-full px-4 py-3 text-sm font-mono"
                  style={{ height: 420, resize: 'vertical' }} spellCheck={true} />
                <div className="flex gap-2 mt-3">
                  <button onClick={salvarEdicaoContrato} disabled={salvandoContrato} className="btn-gold flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Save size={15}/> {salvandoContrato ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                  <button onClick={() => setEditandoContrato(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#ccc' }}>
                {contratoConteudo || 'Conteúdo não disponível.'}
              </div>
            )}
          </div>
        </div>
      )}

      <FeedbackToast feedback={feedback} />
    </div>
  )
}