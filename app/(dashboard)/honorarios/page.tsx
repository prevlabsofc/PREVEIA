'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Loader2, Download, Calculator, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { DownloadButtons } from '@/components/DownloadButtons'
import { ScrollFade } from '@/components/ScrollFade'
import { digitosParaCentavos, formatarCentavosBRL } from '@/lib/formatar-moeda'
import { juntarEnderecoLegado } from '@/lib/formatar-endereco'
import { TIPOS_BENEFICIO_CHECKLIST } from '@/lib/checklist-inss'
import { agentTypeContratoHonorarios } from '@/lib/contrato-honorarios'
import { useFeedback } from '@/components/clientes/clientes-shared'
import FeedbackToast from '@/components/clientes/FeedbackToast'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/**
 * Reaproveita os rótulos canônicos de tipo de benefício de lib/checklist-inss.ts
 * (mesma nomenclatura já usada na ficha do cliente e na checklist de documentos)
 * e completa com tipos de ação comuns em contratos de honorários que não são
 * "benefício" da checklist de documentos.
 */
const TIPOS_ACAO_ADICIONAIS = [
  'Aposentadoria por Tempo de Contribuição',
  'Aposentadoria por Idade (Urbana)',
  'Auxílio-Acidente',
  'Revisão de Benefício',
]
const TIPOS_ACAO = [...TIPOS_BENEFICIO_CHECKLIST, ...TIPOS_ACAO_ADICIONAIS]
const OUTRO_TIPO_ACAO = 'Outro'

/**
 * Validação leve: só se aplica ao texto livre de "Outro" (as opções pré-definidas
 * nunca caem nesses casos). Heurística simples — string só com dígitos, ou só um
 * caractere repetido — para não travar rótulos curtos alfanuméricos legítimos.
 */
function validarTipoAcao(valor: string): string | null {
  const v = valor.trim()
  if (!v) return 'Informe o tipo de ação.'
  if (/^\d+$/.test(v)) return 'Tipo de ação inválido: não pode ser só números.'
  if (/^(.)\1*$/.test(v)) return 'Tipo de ação inválido: caractere repetido não é um tipo de ação válido.'
  return null
}

/**
 * Mesmo padrão de autofill usado em /analise-previdenciaria (`camposDoCliente`)
 * e /agentes (`selecionarCliente`): ao escolher um cliente já cadastrado, os
 * campos de qualificação do contrato são preenchidos a partir da tabela
 * `clients` — mas continuam 100% editáveis depois.
 *
 * Endereço usa `juntarEnderecoLegado` (rua/número/bairro) com fallback para o
 * campo legado `address` — ver migração 20260801_clients_endereco_estruturado.
 *
 * `estadoCivil` não é preenchido: a tabela `clients` não tem essa coluna.
 */
function camposQualificacaoCliente(client: any) {
  const enderecoEstruturado = juntarEnderecoLegado({
    rua: client.rua,
    numero: client.numero,
    bairro: client.bairro,
  })
  return {
    profissao: client.profession || '',
    endereco: enderecoEstruturado || client.address || '',
    cep: client.cep || '',
    cidade: client.city || '',
    estado: client.state || '',
  }
}

/** Placeholder padrão do contrato quando o dado não está cadastrado. */
function av(valor: string): string {
  return valor && valor.trim() ? valor.trim() : '[a preencher]'
}

const CAMPOS_QUALIFICACAO = ['estadoCivil', 'profissao', 'endereco', 'cep', 'cidade', 'estado']

export default function HonorariosPage() {
  const [isLight, setIsLight] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [lawyer, setLawyer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [contrato, setContrato] = useState('')
  const [valorCausaDisplay, setValorCausaDisplay] = useState('')
  const valorCausaRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    clienteId: '',
    clienteNome: '',
    clienteCPF: '',
    // Qualificação do cliente — autopreenchida ao selecionar um cadastro
    // existente (ver `camposQualificacaoCliente`), sempre editável.
    estadoCivil: '',
    profissao: '',
    endereco: '',
    cep: '',
    cidade: '',
    estado: '',
    tipoAcao: '',
    tipoHonorario: 'percentual',
    percentual: '30',
    valorFixo: '',
    valorCausa: '',
    descricaoServico: '',
    prazo: '12',
    observacoes: '',
  })
  const [autoPreenchido, setAutoPreenchido] = useState(false)
  // "Outro": se o valor inicial de tipoAcao (ex.: registro salvo antigo em texto livre)
  // não bater com nenhuma opção pré-definida, o dropdown já nasce em modo "Outro"
  // preservando o texto — nunca descarta um valor existente fora da lista.
  const [modoOutroAcao, setModoOutroAcao] = useState(
    () => !!form.tipoAcao && !TIPOS_ACAO.includes(form.tipoAcao)
  )
  const [tipoAcaoOutroTexto, setTipoAcaoOutroTexto] = useState(
    () => (form.tipoAcao && !TIPOS_ACAO.includes(form.tipoAcao)) ? form.tipoAcao : ''
  )
  const [tipoAcaoOutroBorrado, setTipoAcaoOutroBorrado] = useState(false)
  const [tentouGerar, setTentouGerar] = useState(false)
  const [lawyerId, setLawyerId] = useState('')
  const [salvandoContrato, setSalvandoContrato] = useState(false)
  const [feedback, mostrarFeedback] = useFeedback()

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
      setLawyerId(user.id)
      const { data: l } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setLawyer(l)
      // select('*') — mesmo formato de query de /analise-previdenciaria e
      // /agentes, necessário para ter todos os campos de qualificação do
      // cliente disponíveis localmente ao selecioná-lo (sem round-trip extra).
      const { data: cli } = await supabase.from('clients').select('*').eq('lawyer_id', user.id).order('name')
      setClientes(cli || [])
    }
    load()
  }, [])

  function set(k: string, v: string) {
    // Edição manual de um campo de qualificação desfaz o aviso de autofill,
    // mesmo padrão usado em /analise-previdenciaria.
    if (CAMPOS_QUALIFICACAO.includes(k)) setAutoPreenchido(false)
    setForm(f => ({ ...f, [k]: v }))
  }

  // Máscara de moeda: os dígitos digitados/colados são sempre lidos como centavos
  // (padrão de apps bancários); o valor limpo em reais vai pro form, a exibição fica à parte.
  function handleValorCausaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const centavos = digitosParaCentavos(e.target.value)
    if (!centavos) {
      setValorCausaDisplay('')
      set('valorCausa', '')
      return
    }
    setValorCausaDisplay(formatarCentavosBRL(centavos))
    set('valorCausa', (centavos / 100).toFixed(2))
  }

  useEffect(() => {
    const el = valorCausaRef.current
    if (el && document.activeElement === el) {
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [valorCausaDisplay])

  function selecionarCliente(id: string) {
    const cli = clientes.find(c => c.id === id)
    if (!cli) return
    setForm(f => ({
      ...f,
      clienteId: id,
      clienteNome: cli.name,
      clienteCPF: cli.cpf || '',
      ...camposQualificacaoCliente(cli),
    }))
    setAutoPreenchido(true)
  }

  // `form.tipoAcao` continua sendo a mesma string simples usada pelo prompt de
  // geração de contrato — o dropdown só decide COMO ela é preenchida.
  function selecionarTipoAcao(valor: string) {
    if (valor === OUTRO_TIPO_ACAO) {
      setModoOutroAcao(true)
      set('tipoAcao', tipoAcaoOutroTexto)
    } else {
      setModoOutroAcao(false)
      set('tipoAcao', valor)
    }
  }

  function digitarTipoAcaoOutro(valor: string) {
    setTipoAcaoOutroTexto(valor)
    set('tipoAcao', valor)
  }

  function calcularHonorario() {
    if (form.tipoHonorario === 'percentual' && form.valorCausa) {
      const valor = parseFloat(form.valorCausa) * (parseFloat(form.percentual) / 100)
      return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    if (form.tipoHonorario === 'fixo' && form.valorFixo) {
      return `R$ ${parseFloat(form.valorFixo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
    return null
  }

  async function gerarContrato() {
    setTentouGerar(true)
    if (!form.clienteNome) { alert('Preencha o nome do cliente'); return }
    const erroTipoAcao = validarTipoAcao(form.tipoAcao)
    if (erroTipoAcao) { alert(erroTipoAcao); return }
    setLoading(true)
    setContrato('')

    const honorarioCalc = calcularHonorario()
    const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

    const prompt = `Você é um advogado previdenciarista especializado. Gere um contrato de honorários advocatícios COMPLETO e FORMAL seguindo as normas do Estatuto da OAB e Código de Ética, com a seguinte estrutura:

DADOS DO CONTRATO:
- Advogado: ${lawyer?.name || 'Dr(a). [Nome]'}
- OAB: ${lawyer?.oab_number || '[Número]'}/${lawyer?.oab_uf || 'MA'}
- Escritório: ${lawyer?.office_name || 'Escritório de Advocacia'}
- Email: ${lawyer?.email || ''}
- Telefone: ${lawyer?.phone || ''}
- Cliente: ${form.clienteNome}
- CPF do Cliente: ${form.clienteCPF || 'Não informado'}
- Estado Civil: ${av(form.estadoCivil)}
- Profissão: ${av(form.profissao)}
- Endereço: ${av(form.endereco)}
- CEP: ${av(form.cep)}
- Cidade: ${av(form.cidade)}
- Estado: ${av(form.estado)}
- Tipo de Ação: ${form.tipoAcao}
- Tipo de Honorário: ${form.tipoHonorario === 'percentual' ? `${form.percentual}% sobre o valor da condenação` : `Valor fixo de ${form.valorFixo}`}
- Valor estimado dos honorários: ${honorarioCalc || 'A definir'}
- Prazo estimado: ${form.prazo} meses
- Descrição dos serviços: ${form.descricaoServico || 'Patrocínio da causa previdenciária acima indicada, incluindo elaboração de petição inicial, acompanhamento processual, recursos e atos necessários'}
- Data: ${hoje}
- Observações: ${form.observacoes || 'Nenhuma'}

Gere o contrato COMPLETO com:
1. QUALIFICAÇÃO DAS PARTES
2. OBJETO DO CONTRATO
3. DOS HONORÁRIOS ADVOCATÍCIOS
4. DAS OBRIGAÇÕES DO ADVOGADO
5. DAS OBRIGAÇÕES DO CLIENTE
6. DA RESCISÃO
7. DAS DISPOSIÇÕES GERAIS
8. DO FORO
9. ASSINATURAS (com espaço para data e assinaturas)

O contrato deve ser formal, juridicamente correto e seguir as normas da OAB.`

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
        setContrato(acc)
      }
      await salvarContratoGerado(acc, honorarioCalc)
    } catch {
      setContrato('Erro ao gerar contrato. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Persiste o contrato recém-gerado em `documents`, no mesmo padrão de outros
   * fluxos de geração (ver /api/gerar-documento e a ficha do cliente): sem isso
   * o contrato se perde ao sair de /honorarios. Falha ao salvar não apaga o
   * texto já exibido — o advogado ainda pode baixá-lo manualmente.
   */
  async function salvarContratoGerado(texto: string, honorarioCalc: string | null) {
    if (!texto.trim() || texto.startsWith('Erro ao gerar')) return
    if (!lawyerId) {
      mostrarFeedback('erro', 'Contrato gerado, mas não foi possível identificar o advogado logado para salvar.')
      return
    }
    setSalvandoContrato(true)
    try {
      const { error } = await supabase.from('documents').insert({
        lawyer_id: lawyerId,
        client_id: form.clienteId || null,
        client_name: form.clienteNome,
        agent_type: agentTypeContratoHonorarios(form.tipoHonorario),
        title: `Contrato de Honorários — ${form.clienteNome}`,
        content: texto,
        form_data: { ...form, honorarioCalc: honorarioCalc || null, origem: 'honorarios' },
        status: 'generated',
      })
      if (error) {
        mostrarFeedback('erro', 'Contrato gerado, mas houve um erro ao salvar no histórico do cliente.')
        return
      }
      mostrarFeedback('sucesso', 'Contrato salvo no histórico do cliente.')
    } catch {
      mostrarFeedback('erro', 'Contrato gerado, mas houve um erro ao salvar no histórico do cliente.')
    } finally {
      setSalvandoContrato(false)
    }
  }

  const inputCls = "input-glass w-full px-4 text-sm"
  const erroTipoAcao = validarTipoAcao(form.tipoAcao)
  const exibirErroTipoAcao = tentouGerar || (modoOutroAcao && tipoAcaoOutroBorrado && tipoAcaoOutroTexto.trim() !== '')

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <FileText size={28} color="#D4AF37"/>
          <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Contrato de </span>
          <span className="text-gradient-gold">Honorários</span>
        </h1>
        <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Gere contratos de honorários advocatícios personalizados com IA</p>
      </motion.div>

      <div className="grid grid-cols-5 gap-6">
        {/* FORMULÁRIO */}
        <div className="col-span-2">
          <GlassCard intensity={0.4} style={{ padding: 24 }}>
            <h3 className="font-bold mb-4" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Dados do Contrato</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cliente</label>
                <select onChange={e => selecionarCliente(e.target.value)} className={inputCls} style={{ height: 44 }}>
                  <option value="" style={{ background: '#111' }}>Selecionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.name}</option>)}
                </select>
              </div>
              {!form.clienteId && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ou digite o nome</label>
                  <input value={form.clienteNome} onChange={e => set('clienteNome', e.target.value)}
                    placeholder="Nome completo do cliente" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
              )}

              {/* Qualificação do cliente — autopreenchida ao selecionar um
                  cadastro existente (mesmo padrão de /analise-previdenciaria),
                  sempre editável manualmente. */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Estado civil</label>
                  <input value={form.estadoCivil} onChange={e => set('estadoCivil', e.target.value)}
                    placeholder="Ex: Casado(a)" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Profissão</label>
                  <input value={form.profissao} onChange={e => set('profissao', e.target.value)}
                    placeholder="Ex: Agricultor(a)" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Endereço (rua, número, bairro)</label>
                <input value={form.endereco} onChange={e => set('endereco', e.target.value)}
                  placeholder="Rua, número, bairro" className={inputCls} style={{ height: 44 }} spellCheck={true} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">CEP</label>
                  <input value={form.cep} onChange={e => set('cep', e.target.value)}
                    placeholder="00000-000" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cidade</label>
                  <input value={form.cidade} onChange={e => set('cidade', e.target.value)}
                    placeholder="Cidade" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">UF</label>
                  <input value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase())} maxLength={2}
                    placeholder="MA" className={inputCls} style={{ height: 44 }} spellCheck={true} />
                </div>
              </div>
              {autoPreenchido && form.clienteId && (
                <p className="text-[11px] leading-snug" style={{ color: '#8a8a8a' }}>
                  Dados do cadastro de <span style={{ color: '#D4AF37' }}>{form.clienteNome}</span> preenchidos automaticamente — você pode editar qualquer campo.
                </p>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de ação *</label>
                <select
                  value={modoOutroAcao ? OUTRO_TIPO_ACAO : form.tipoAcao}
                  onChange={e => selecionarTipoAcao(e.target.value)}
                  aria-invalid={exibirErroTipoAcao && !!erroTipoAcao}
                  aria-describedby={exibirErroTipoAcao && erroTipoAcao ? 'erro-tipo-acao' : undefined}
                  className={`${inputCls}${exibirErroTipoAcao && erroTipoAcao ? ' input-erro' : ''}`}
                  style={{ height: 44 }}
                >
                  <option value="" style={{ background: '#111' }}>Selecionar...</option>
                  {TIPOS_ACAO.map(t => (
                    <option key={t} value={t} style={{ background: '#111' }}>{t}</option>
                  ))}
                  <option value={OUTRO_TIPO_ACAO} style={{ background: '#111' }}>Outro</option>
                </select>
                {modoOutroAcao && (
                  <input
                    value={tipoAcaoOutroTexto}
                    onChange={e => digitarTipoAcaoOutro(e.target.value)}
                    onBlur={() => setTipoAcaoOutroBorrado(true)}
                    placeholder="Descreva o tipo de ação"
                    aria-invalid={exibirErroTipoAcao && !!erroTipoAcao}
                    aria-describedby={exibirErroTipoAcao && erroTipoAcao ? 'erro-tipo-acao' : undefined}
                    className={`${inputCls} mt-2${exibirErroTipoAcao && erroTipoAcao ? ' input-erro' : ''}`}
                    style={{ height: 44 }} spellCheck={true} />
                )}
                <AnimatePresence>
                  {exibirErroTipoAcao && erroTipoAcao && (
                    <motion.div id="erro-tipo-acao" role="alert"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl overflow-hidden"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <AlertCircle size={14} color="#EF4444" className="flex-shrink-0"/>
                      <span style={{ color: '#EF4444', fontSize: 12 }}>{erroTipoAcao}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de honorário</label>
                <select value={form.tipoHonorario} onChange={e => set('tipoHonorario', e.target.value)} className={inputCls} style={{ height: 44 }}>
                  <option value="percentual" style={{ background: '#111' }}>Percentual sobre condenação</option>
                  <option value="fixo" style={{ background: '#111' }}>Valor fixo</option>
                  <option value="misto" style={{ background: '#111' }}>Misto (fixo + percentual)</option>
                </select>
              </div>
              {form.tipoHonorario !== 'fixo' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Percentual (%)</label>
                  <input type="number" value={form.percentual} onChange={e => set('percentual', e.target.value)}
                    placeholder="Ex: 30" className={inputCls} style={{ height: 44 }}/>
                </div>
              )}
              {form.tipoHonorario !== 'percentual' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Valor fixo (R$)</label>
                  <input type="number" value={form.valorFixo} onChange={e => set('valorFixo', e.target.value)}
                    placeholder="Ex: 2000" className={inputCls} style={{ height: 44 }}/>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor estimado da causa</label>
                <input ref={valorCausaRef} type="text" inputMode="numeric" value={valorCausaDisplay} onChange={handleValorCausaChange}
                  placeholder="R$ 0,00" className={inputCls} style={{ height: 44 }} spellCheck={true}/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prazo estimado (meses)</label>
                <input type="number" value={form.prazo} onChange={e => set('prazo', e.target.value)}
                  placeholder="Ex: 12" className={inputCls} style={{ height: 44 }}/>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
                  placeholder="Condições especiais, parcelamento, etc..." className={inputCls} style={{ height: 70, resize: 'none', paddingTop: 10 }} spellCheck={true} />
              </div>

              {calcularHonorario() && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <div className="flex items-center gap-2">
                    <Calculator size={14} color="#D4AF37"/>
                    <span className="text-xs text-gray-400">Honorários estimados:</span>
                    <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>{calcularHonorario()}</span>
                  </div>
                </div>
              )}

              <button onClick={gerarContrato} disabled={loading || !form.clienteNome || !!erroTipoAcao}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold">
                {loading ? <><Loader2 size={16} className="animate-spin"/> Gerando contrato...</> : <><FileText size={16}/> Gerar Contrato</>}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* CONTRATO GERADO */}
        <div className="col-span-3">
          <GlassCard intensity={0.3} style={{ padding: 24, minHeight: 500 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                📄 Contrato Gerado
                {salvandoContrato && (
                  <span className="flex items-center gap-1 text-[11px] font-normal" style={{ color: '#888' }}>
                    <Loader2 size={11} className="animate-spin"/> Salvando no histórico...
                  </span>
                )}
              </h3>
              {contrato && (
                <DownloadButtons text={contrato} fileName={`contrato-honorarios-${form.clienteNome.replace(/\s/g, '-').toLowerCase()}`}/>
              )}
            </div>

            {!contrato && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={40} color="#333" className="mx-auto mb-3"/>
                <p className="text-sm text-gray-500">Preencha os dados e gere o contrato</p>
                <p className="text-xs text-gray-600 mt-1">O contrato seguirá as normas da OAB e do Código de Ética</p>
              </div>
            )}

            {loading && !contrato && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin mx-auto mb-3" color="#D4AF37"/>
                  <p className="text-sm text-gray-400">Gerando contrato personalizado...</p>
                </div>
              </div>
            )}

            {contrato && (
              <ScrollFade className="pr-1" style={{ maxHeight: 520 }}>
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono" style={{ color: isLight ? '#1E1E1E' : '#ccc' }}>
                  {contrato}
                </div>
              </ScrollFade>
            )}
          </GlassCard>
        </div>
      </div>
      <FeedbackToast feedback={feedback} />
    </div>
  )
}