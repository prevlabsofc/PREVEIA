'use client'
import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Loader2, FileText, Search, User, Clock, Shield, AlertTriangle, AlertCircle, X } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { ParecerAccordion } from '@/components/ParecerAccordion'
import { ScrollFade } from '@/components/ScrollFade'
import { ConsultaProcessoDatajud } from '@/components/ConsultaProcessoDatajud'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const TIPOS_BENEFICIO = [
  'Aposentadoria por Idade (Rural)',
  'Aposentadoria por Idade (Urbana)',
  'Aposentadoria por Tempo de Contribuição',
  'Aposentadoria por Incapacidade Permanente',
  'Auxílio por Incapacidade Temporária',
  'Auxílio-Acidente',
  'Salário-Maternidade',
  'Pensão por Morte',
  'BPC/LOAS (Deficiência)',
  'BPC/LOAS (Idoso)',
]

const CASOS_EXEMPLO = [
  {
    label: 'Aposentadoria rural — 30 anos na roça',
    tipoBeneficio: 'Aposentadoria por Idade (Rural)',
    situacaoAtual: 'Trabalhou na roça por 30 anos, sem registro em carteira. Possui declaração de sindicato rural.',
    tempoContribuicao: '30 anos',
  },
  {
    label: 'BPC/LOAS — renda familiar baixa',
    tipoBeneficio: 'BPC/LOAS (Deficiência)',
    situacaoAtual: 'Pessoa com deficiência, renda per capita abaixo de meio salário mínimo.',
    rendaFamiliar: '800',
  },
  {
    label: 'Auxílio-doença — laudo médico recente',
    tipoBeneficio: 'Auxílio por Incapacidade Temporária',
    situacaoAtual: 'Afastado do trabalho por doença, com laudo médico de 90 dias.',
    tempoContribuicao: '12 anos',
  },
  {
    label: 'Pensão por morte — dependente',
    tipoBeneficio: 'Pensão por Morte',
    situacaoAtual: 'Cônjuge supérstite, segurado faleceu após 10 anos de contribuição.',
    tempoContribuicao: '10 anos (do falecido)',
  },
  {
    label: 'Salário-maternidade — gestante CLT',
    tipoBeneficio: 'Salário-Maternidade',
    situacaoAtual: 'Empregada gestante, afastamento previsto para daqui a 2 meses.',
    tempoContribuicao: '5 anos',
  },
  {
    label: 'Aposentadoria urbana — 65 anos',
    tipoBeneficio: 'Aposentadoria por Idade (Urbana)',
    situacaoAtual: 'Completou 65 anos, 18 anos de contribuição registrada.',
    tempoContribuicao: '18 anos',
  },
]

const FORM_VAZIO = {
  clienteId: '',
  tipoBeneficio: '',
  dataNascimento: '',
  dataRequerimento: '',
  tempoContribuicao: '',
  rendaFamiliar: '',
  situacaoAtual: '',
  observacoes: '',
}

/** Campos do formulário alimentados pelo cadastro do cliente. A tabela `clients`
 *  não possui colunas para requerimento, tempo de contribuição, renda familiar
 *  nem situação atual — esses campos são zerados na troca de cliente para não
 *  levar dados do segurado anterior para a nova análise. */
function camposDoCliente(client: any) {
  return {
    clienteId: client.id,
    dataNascimento: client.birth_date ? String(client.birth_date).slice(0, 10) : '',
    observacoes: client.notes || '',
    dataRequerimento: '',
    tempoContribuicao: '',
    rendaFamiliar: '',
    situacaoAtual: '',
  }
}

function descricaoZona(client: any) {
  return client?.zone === 'rural' ? 'Rural (Segurado Especial)' : 'Urbana'
}

async function mensagemDeErro(res: Response) {
  try {
    const data = await res.json()
    if (data?.error) return String(data.error)
  } catch {
    // resposta sem corpo JSON — cai no texto genérico abaixo
  }
  if (res.status === 429) return 'Muitas requisições em sequência. Aguarde 1 minuto e tente novamente.'
  if (res.status === 401 || res.status === 403) return 'Sessão expirada. Faça login novamente para continuar.'
  return `Falha na comunicação com a IA (erro ${res.status}). Tente novamente em instantes.`
}

/** Lê o corpo em streaming preservando acentuação entre chunks e devolve o texto final. */
async function lerStream(res: Response, onTexto: (texto: string) => void) {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let acc = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    acc += decoder.decode(value, { stream: true })
    onTexto(acc)
  }
  acc += decoder.decode()
  onTexto(acc)
  return acc
}

function BannerErro({ mensagem, onFechar }: { mensagem: string; onFechar?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start gap-2 p-3 rounded-xl overflow-hidden"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
    >
      <AlertCircle size={15} color="#EF4444" className="flex-shrink-0 mt-0.5" />
      <span className="flex-1" style={{ color: '#EF4444', fontSize: 12.5, lineHeight: 1.45 }}>{mensagem}</span>
      {onFechar && (
        <button type="button" onClick={onFechar} aria-label="Fechar aviso" className="flex-shrink-0 transition-colors hover:text-red-300" style={{ color: 'rgba(239,68,68,0.7)' }}>
          <X size={14} />
        </button>
      )}
    </motion.div>
  )
}

export default function AnalisePrevidenciariaPage() {
  const [clients, setClients] = useState<any[]>([])
  const [isLight, setIsLight] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [resultado, setResultado] = useState('')
  const [historicoPeticoes, setHistoricoPeticoes] = useState<any[]>([])
  const [historicoJuridico, setHistoricoJuridico] = useState('')
  const [antecedentes, setAntecedentes] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [searchCliente, setSearchCliente] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'analise' | 'historico' | 'antecedentes'>('analise')
  const [erroAnalise, setErroAnalise] = useState('')
  const [erroCliente, setErroCliente] = useState('')
  const [autoPreenchido, setAutoPreenchido] = useState(false)
  const [numeroProcessoSugerido, setNumeroProcessoSugerido] = useState('')
  const [form, setForm] = useState(FORM_VAZIO)

  // O atributo `disabled` só bloqueia cliques depois do próximo render; o ref
  // barra o segundo clique imediato antes de qualquer requisição sair.
  const analiseEmCursoRef = useRef(false)
  const analiseAbortRef = useRef<AbortController | null>(null)
  const clienteAbortRef = useRef<AbortController | null>(null)
  const clienteReqRef = useRef(0)

  useEffect(() => () => {
    analiseAbortRef.current?.abort()
    clienteAbortRef.current?.abort()
  }, [])

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
      const { data, error } = await supabase.from('clients').select('*').eq('lawyer_id', user.id).order('name')
      if (error) { setErroCliente('Não foi possível carregar a lista de clientes. Recarregue a página.'); return }
      setClients(data || [])
    }
    load()
  }, [])

  const clientesFiltrados = clients.filter(c =>
    c.name?.toLowerCase().includes(searchCliente.toLowerCase()) ||
    c.cpf?.includes(searchCliente)
  )

  async function selecionarCliente(client: any) {
    // Cancela a pesquisa do cliente anterior para que os streams antigos não
    // sobrescrevam o conteúdo do cliente recém-selecionado.
    clienteAbortRef.current?.abort()
    const controller = new AbortController()
    clienteAbortRef.current = controller
    const reqId = ++clienteReqRef.current
    const atual = () => reqId === clienteReqRef.current

    setClienteSelecionado(client)
    setSearchCliente(client.name)
    setShowDropdown(false)
    setForm(f => ({ ...f, ...camposDoCliente(client) }))
    setAutoPreenchido(true)
    setHistoricoPeticoes([])
    setHistoricoJuridico('')
    setAntecedentes('')
    setErroCliente('')
    setNumeroProcessoSugerido('')
    setLoadingHistorico(true)

    // Gerar histórico jurídico via IA
    const promptHistorico = `Você é um especialista em Direito Previdenciário. Com base nos dados do cliente abaixo, faça uma pesquisa jurídica completa e detalhada:

DADOS DO CLIENTE:
- Nome: ${client.name}
- CPF: ${client.cpf || 'Não informado'}
- Data de Nascimento: ${client.birth_date || 'Não informada'}
- Profissão: ${client.profession || 'Não informada'}
- Zona: ${descricaoZona(client)}
- Endereço: ${client.address || ''}, ${client.city || ''} - ${client.state || ''}

Pesquise e apresente:
1. PERFIL PREVIDENCIÁRIO — Qual o enquadramento mais provável (segurado especial, empregado, autônomo, etc)
2. BENEFÍCIOS APLICÁVEIS — Quais benefícios o perfil pode ter direito
3. CARÊNCIAS RELEVANTES — Carências para cada benefício possível
4. JURISPRUDÊNCIAS FAVORÁVEIS — Decisões do STJ, STF, TNU que favorecem esse perfil
5. DOCUMENTAÇÃO TÍPICA — Documentos que esse perfil geralmente precisa apresentar
6. RISCOS E PONTOS DE ATENÇÃO — O que pode comprometer o pedido
7. ESTRATÉGIA RECOMENDADA — Melhor abordagem processual`

    // Gerar análise de antecedentes (apenas informações públicas legais)
    const promptAntecedentes = `Você é um especialista jurídico. Com base no perfil do cliente abaixo, analise os possíveis impactos de antecedentes criminais nos benefícios previdenciários, de forma técnica e legal:

CLIENTE: ${client.name} | CPF: ${client.cpf || 'Não informado'}

Explique:
1. IMPACTO DE ANTECEDENTES CRIMINAIS EM BENEFÍCIOS PREVIDENCIÁRIOS
   - Quais crimes podem suspender ou cancelar benefícios (ex: crimes contra a Previdência Social - Art. 171 CP)
   - Benefícios que continuam mesmo com condenação criminal
   - Jurisprudência sobre manutenção de benefícios durante cumprimento de pena

2. CRIMES CONTRA A PREVIDÊNCIA SOCIAL (Art. 171 §3º e Lei 8.213/91 Art. 15)
   - Suspensão de benefício durante reclusão (Art. 15, §3º Lei 8.213/91)
   - Exceções: dependentes podem receber pensão por morte

3. RECOMENDAÇÕES LEGAIS
   - O que verificar antes de protocolar o benefício
   - Como a existência de processo criminal pode afetar a análise do INSS

Nota: Esta análise é baseada em legislação pública. Para verificação de antecedentes reais, consulte os sistemas oficiais do Tribunal de Justiça do estado.`

    async function pesquisar(prompt: string, onTexto: (texto: string) => void) {
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(await mensagemDeErro(res))
      await lerStream(res, texto => { if (atual()) onTexto(texto) })
    }

    try {
      // Buscar petições anteriores no banco
      const { data: { user } } = await supabase.auth.getUser()
      const { data: docs } = await supabase.from('documents').select('*').eq('lawyer_id', user?.id || '').order('created_at', { ascending: false })
      if (!atual()) return
      setHistoricoPeticoes((docs || []).filter((d: any) => d.client_name === client.name || d.client_id === client.id))

      // Pré-preenche a consulta processual com um processo já cadastrado do cliente.
      const { data: processos } = await supabase
        .from('processos')
        .select('numero')
        .eq('cliente_id', client.id)
        .limit(1)
      if (atual() && processos?.[0]?.numero) setNumeroProcessoSugerido(processos[0].numero)

      await pesquisar(promptHistorico, setHistoricoJuridico)
      await pesquisar(promptAntecedentes, setAntecedentes)
    } catch (e: any) {
      if (e?.name === 'AbortError' || !atual()) return
      setErroCliente(e?.message || 'Não foi possível carregar a pesquisa jurídica deste cliente. Verifique sua conexão e selecione o cliente novamente.')
    } finally {
      if (atual()) setLoadingHistorico(false)
    }
  }

  function limparCliente() {
    clienteAbortRef.current?.abort()
    clienteReqRef.current++
    setClienteSelecionado(null)
    setSearchCliente('')
    setShowDropdown(false)
    setHistoricoPeticoes([])
    setHistoricoJuridico('')
    setAntecedentes('')
    setErroCliente('')
    setNumeroProcessoSugerido('')
    setAutoPreenchido(false)
    setLoadingHistorico(false)
    setForm(f => ({ ...FORM_VAZIO, tipoBeneficio: f.tipoBeneficio }))
  }

  function set(k: string, v: string) {
    if (k === 'dataNascimento' || k === 'observacoes') setAutoPreenchido(false)
    if (k === 'tipoBeneficio' && v) setErroAnalise('')
    setForm(f => ({ ...f, [k]: v }))
  }

  function aplicarCasoExemplo(caso: typeof CASOS_EXEMPLO[number]) {
    setForm(f => ({
      ...f,
      tipoBeneficio: caso.tipoBeneficio,
      situacaoAtual: caso.situacaoAtual,
      tempoContribuicao: caso.tempoContribuicao ?? f.tempoContribuicao,
      rendaFamiliar: caso.rendaFamiliar ?? f.rendaFamiliar,
    }))
    setAbaAtiva('analise')
  }

  const isEmptyAnalise = !resultado && !loading

  async function analisar() {
    if (analiseEmCursoRef.current) return
    setAbaAtiva('analise')
    if (!form.tipoBeneficio) {
      setErroAnalise('Selecione o tipo de benefício antes de gerar a análise.')
      return
    }
    analiseEmCursoRef.current = true
    const controller = new AbortController()
    analiseAbortRef.current = controller
    setLoading(true)
    setErroAnalise('')
    setResultado('')

    const prompt = `Você é um especialista em Direito Previdenciário brasileiro. Faça uma análise detalhada do caso abaixo e emita um parecer técnico completo.

DADOS DO CASO:
- Cliente: ${clienteSelecionado?.name || 'Não informado'} ${clienteSelecionado?.cpf ? `(CPF: ${clienteSelecionado.cpf})` : ''}
- Zona: ${descricaoZona(clienteSelecionado)}
- Profissão: ${clienteSelecionado?.profession || 'Não informada'}
- Benefício Requerido: ${form.tipoBeneficio}
- Data de Nascimento: ${form.dataNascimento || 'Não informado'}
- Data do Requerimento/Indeferimento: ${form.dataRequerimento || 'Não informado'}
- Tempo de Contribuição: ${form.tempoContribuicao || 'Não informado'}
- Renda Familiar Mensal: ${form.rendaFamiliar ? `R$ ${form.rendaFamiliar}` : 'Não informado'}
- Situação Atual: ${form.situacaoAtual || 'Não informado'}
- Observações: ${form.observacoes || 'Nenhuma'}
- Petições anteriores: ${historicoPeticoes.length} petições geradas na plataforma

Emita um parecer técnico contendo:
1. ANÁLISE DE ELEGIBILIDADE
2. FUNDAMENTO LEGAL (Lei 8.213/91, CF/88, Decretos)
3. JURISPRUDÊNCIA RELEVANTE (STJ, STF, TNU)
4. PONTOS FAVORÁVEIS
5. PONTOS DE ATENÇÃO
6. ESTRATÉGIA RECOMENDADA
7. DOCUMENTAÇÃO NECESSÁRIA
8. CONCLUSÃO E CHANCE DE ÊXITO`

    try {
      const res = await fetch('/api/ia-consultora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error(await mensagemDeErro(res))
      const texto = await lerStream(res, setResultado)
      // O stream pode terminar vazio quando a Claude API falha após os headers
      // já terem sido enviados — sem isso a tela voltaria ao estado inicial.
      if (!texto.trim()) throw new Error('A IA não retornou nenhum conteúdo para este caso. Tente novamente.')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setResultado('')
      setErroAnalise(e?.message || 'Não foi possível gerar a análise. Verifique sua conexão e tente novamente.')
    } finally {
      analiseEmCursoRef.current = false
      setLoading(false)
    }
  }

  function cancelarAnalise() {
    analiseAbortRef.current?.abort()
  }

  const inputCls = "input-glass w-full px-4 text-sm"
  const faltaBeneficio = !!erroAnalise && !form.tipoBeneficio

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <Scale size={28} color="#D4AF37"/>
          <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Análise </span>
          <span className="text-gradient-gold">Previdenciária</span>
        </h1>
        <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Parecer técnico completo + histórico jurídico do cliente</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* FORMULÁRIO */}
        <div className="col-span-2 space-y-4">
          <GlassCard intensity={0.4} style={{ padding: 24 }}>
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
              <User size={16} color="#D4AF37"/> Dados do Caso
            </h3>
            <div className="space-y-4">
              {/* BUSCA DE CLIENTE */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Buscar Cliente</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#666' }}/>
                  <input value={searchCliente} onChange={e => { setSearchCliente(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)}
                    placeholder="Busque pelo nome ou CPF do cliente..." className={inputCls} style={{ height: 44, paddingLeft: 36, paddingRight: clienteSelecionado ? 36 : undefined }} spellCheck={true} />
                  {clienteSelecionado && (
                    <button type="button" onClick={limparCliente} aria-label="Limpar cliente selecionado"
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-white" style={{ color: '#666' }}>
                      <X size={15}/>
                    </button>
                  )}
                </div>
                {showDropdown && searchCliente && clientesFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl z-20 overflow-hidden" style={{ background: '#141410', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                    {clientesFiltrados.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => selecionarCliente(c)} className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5" style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.cpf} · {c.zone === 'rural' ? '🌾 Rural' : '🏢 Urbano'}</div>
                      </button>
                    ))}
                  </div>
                )}
                {clienteSelecionado && autoPreenchido && (
                  <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#8a8a8a' }}>
                    Dados do cadastro de <span style={{ color: '#D4AF37' }}>{clienteSelecionado.name}</span> preenchidos automaticamente — você pode editar qualquer campo.
                  </p>
                )}
                <AnimatePresence>
                  {erroCliente && (
                    <div className="mt-2">
                      <BannerErro mensagem={erroCliente} onFechar={() => setErroCliente('')} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Tipo de Benefício *</label>
                <select value={form.tipoBeneficio} onChange={e => set('tipoBeneficio', e.target.value)} className={inputCls}
                  style={{ height: 44, borderColor: faltaBeneficio ? '#EF4444' : undefined }}>
                  <option value="" style={{ background: '#111' }}>Selecionar benefício...</option>
                  {TIPOS_BENEFICIO.map(t => <option key={t} value={t} style={{ background: '#111' }}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Nascimento</label>
                  <input type="date" value={form.dataNascimento} onChange={e => set('dataNascimento', e.target.value)} className={inputCls} style={{ height: 44 }}/>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Requerimento</label>
                  <input type="date" value={form.dataRequerimento} onChange={e => set('dataRequerimento', e.target.value)} className={inputCls} style={{ height: 44 }}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Tempo de Contribuição</label>
                <input value={form.tempoContribuicao} onChange={e => set('tempoContribuicao', e.target.value)} placeholder="Ex: 25 anos e 3 meses" className={inputCls} style={{ height: 44 }} spellCheck={true} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Renda Familiar (R$)</label>
                <input type="number" value={form.rendaFamiliar} onChange={e => set('rendaFamiliar', e.target.value)} placeholder="Ex: 1500" className={inputCls} style={{ height: 44 }}/>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Situação Atual</label>
                <input value={form.situacaoAtual} onChange={e => set('situacaoAtual', e.target.value)} placeholder="Descreva o caso: tempo de trabalho, documentos, indeferimentos..." className={inputCls} style={{ height: 44 }} spellCheck={true} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#bbb' }}>Observações</label>
                <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Informações adicionais relevantes para a análise..." className={inputCls} style={{ height: 70, resize: 'none', paddingTop: 10 }} spellCheck={true} />
              </div>

              {isEmptyAnalise && (
                <div className="pt-1">
                  <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#666' }}>
                    CASOS COMUNS — CLIQUE PARA PREENCHER
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CASOS_EXEMPLO.map(caso => (
                      <button
                        key={caso.label}
                        type="button"
                        onClick={() => aplicarCasoExemplo(caso)}
                        className="text-[11px] px-3 py-2 rounded-xl transition-all duration-200 hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.4)]"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.18)', color: '#aaa' }}
                      >
                        {caso.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {erroAnalise && <BannerErro mensagem={erroAnalise} onFechar={() => setErroAnalise('')} />}
              </AnimatePresence>

              <motion.button
                onClick={analisar}
                disabled={loading}
                aria-busy={loading}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                style={isEmptyAnalise && form.tipoBeneficio ? {
                  boxShadow: '0 0 0 2px rgba(212,175,55,0.4), 0 0 28px rgba(212,175,55,0.2)',
                  animation: 'glow-pulse 2.5s ease-in-out infinite',
                } : undefined}
                animate={isEmptyAnalise && form.tipoBeneficio ? { scale: [1, 1.01, 1] } : { scale: 1 }}
                transition={{ duration: 2, repeat: isEmptyAnalise && form.tipoBeneficio ? Infinity : 0 }}
              >
                {loading ? <><Loader2 size={17} className="animate-spin"/> Analisando...</> : <><Scale size={17}/> Gerar Análise</>}
              </motion.button>

              {loading && (
                <button type="button" onClick={cancelarAnalise}
                  className="w-full py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                  Cancelar análise
                </button>
              )}
            </div>
          </GlassCard>

          {/* HISTÓRICO DE PETIÇÕES */}
          {historicoPeticoes.length > 0 && (
            <GlassCard intensity={0.3} style={{ padding: 20 }}>
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                <Clock size={15} color="#D4AF37"/> Petições Anteriores ({historicoPeticoes.length})
              </h3>
              <div className="space-y-2">
                {historicoPeticoes.slice(0, 4).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)' }}>
                    <FileText size={13} color="#D4AF37"/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{d.title || d.type || 'Petição'}</div>
                      <div className="text-[10px] text-gray-500">{new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* RESULTADO COM ABAS */}
        <div className="col-span-3">
          <GlassCard intensity={0.3} style={{ padding: 24, minHeight: 500 }}>
            {/* ABAS */}
            <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'}` }}>
              {[
                { id: 'analise', label: 'Parecer Técnico', icon: Scale, carregando: loading, erro: !!erroAnalise },
                { id: 'historico', label: 'Histórico Jurídico', icon: FileText, carregando: loadingHistorico, erro: !!erroCliente },
                { id: 'antecedentes', label: 'Antecedentes', icon: Shield, carregando: loadingHistorico, erro: !!erroCliente },
              ].map(({ id, label, icon: Icon, carregando, erro }) => (
                <button key={id} onClick={() => setAbaAtiva(id as any)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: abaAtiva === id ? 'rgba(212,175,55,0.15)' : 'transparent', color: abaAtiva === id ? '#D4AF37' : '#888', border: abaAtiva === id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
                  {carregando
                    ? <Loader2 size={13} className="animate-spin" color="#D4AF37"/>
                    : erro
                      ? <AlertCircle size={13} color="#EF4444"/>
                      : <Icon size={13}/>}
                  {label}
                </button>
              ))}
              {resultado && abaAtiva === 'analise' && (
                <button onClick={() => navigator.clipboard.writeText(resultado)} className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                  📋 Copiar
                </button>
              )}
            </div>

            {/* ABA PARECER */}
            {abaAtiva === 'analise' && (
              <ScrollFade className="pr-1" style={{ maxHeight: 'clamp(320px, calc(100vh - 340px), 760px)' }}>
                {erroAnalise && !loading && (
                  <div className="mb-4 flex flex-col items-center gap-3 p-5 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle size={26} color="#EF4444"/>
                    <div>
                      <p className="text-sm font-bold mb-1" style={{ color: '#EF4444' }}>Não foi possível gerar o parecer</p>
                      <p className="text-xs" style={{ color: isLight ? '#5E5E5E' : '#bbb' }}>{erroAnalise}</p>
                    </div>
                    <button type="button" onClick={analisar}
                      className="px-4 py-2 rounded-lg text-xs font-bold transition-colors hover:bg-[rgba(212,175,55,0.18)]"
                      style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                      Tentar novamente
                    </button>
                  </div>
                )}
                {!resultado && !loading && !erroAnalise && (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                      <Scale size={32} color="#D4AF37"/>
                    </div>
                    <h3 className="text-base font-bold mb-2" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                      Nenhuma análise gerada ainda
                    </h3>
                    <p className="text-sm text-gray-500 mb-1 max-w-sm">
                      Preencha os dados do caso à esquerda e clique em <strong style={{ color: '#D4AF37' }}>Gerar Análise</strong>
                    </p>
                    <p className="text-xs mb-6" style={{ color: '#D4AF37' }}>
                      ← ou selecione um caso comum abaixo
                    </p>
                    {clienteSelecionado && (
                      <p className="text-xs text-gray-600 mb-4">Cliente selecionado: <span style={{ color: '#D4AF37' }}>{clienteSelecionado.name}</span></p>
                    )}
                    <div className="w-full max-w-lg">
                      <p className="text-[10px] font-bold tracking-widest mb-3" style={{ color: '#666' }}>
                        EXEMPLOS DE CASOS — CLIQUE PARA PREENCHER O FORMULÁRIO
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {CASOS_EXEMPLO.map(caso => (
                          <button
                            key={caso.label}
                            type="button"
                            onClick={() => aplicarCasoExemplo(caso)}
                            className="flex items-start gap-2 text-xs p-3 rounded-xl text-left transition-all duration-200 hover:bg-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.4)] hover:text-[#ddd]"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.18)', color: '#aaa' }}
                          >
                            <Scale size={12} color="#D4AF37" className="flex-shrink-0 mt-0.5"/>
                            <span>{caso.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {loading && !resultado && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 size={32} className="animate-spin mx-auto mb-3" color="#D4AF37"/>
                      <p className="text-sm text-gray-400">Gerando parecer técnico completo...</p>
                    </div>
                  </div>
                )}
                {resultado && (
                  <ParecerAccordion text={resultado} isLight={isLight} streaming={loading} />
                )}
              </ScrollFade>
            )}

            {/* ABA HISTÓRICO JURÍDICO */}
            {abaAtiva === 'historico' && (
              <ScrollFade className="pr-1" style={{ maxHeight: 'clamp(320px, calc(100vh - 340px), 760px)' }}>
                {loadingHistorico && !historicoJuridico && (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 size={32} className="animate-spin mx-auto mb-3" color="#D4AF37"/>
                      <p className="text-sm text-gray-400">Pesquisando histórico jurídico...</p>
                    </div>
                  </div>
                )}
                {erroCliente && !loadingHistorico && (
                  <div className="mb-4">
                    <BannerErro mensagem={erroCliente} onFechar={() => setErroCliente('')} />
                  </div>
                )}
                {!historicoJuridico && !loadingHistorico && !erroCliente && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText size={40} color="#333" className="mx-auto mb-3"/>
                    <p className="text-sm text-gray-500">Selecione um cliente para ver o histórico jurídico</p>
                  </div>
                )}
                {historicoJuridico && (
                  <ParecerAccordion text={historicoJuridico} isLight={isLight} streaming={loadingHistorico} />
                )}
              </ScrollFade>
            )}

            {/* ABA ANTECEDENTES */}
            {abaAtiva === 'antecedentes' && (
              <ScrollFade className="pr-1" style={{ maxHeight: 'clamp(320px, calc(100vh - 340px), 760px)' }}>
                <ConsultaProcessoDatajud isLight={isLight} numeroInicial={numeroProcessoSugerido} />

                {/*
                  Os links abaixo continuam externos porque não há como internalizá-los:
                  · Certidão de antecedentes criminais (TJMA, CNJ) é emitida sob captcha e
                    exige o CPF — a API Pública do Datajud não expõe busca por CPF/nome
                    (bloqueio deliberado do CNJ por LGPD) e não emite certidão.
                  · O e-SAJ/PJe do TJMA e a Receita Federal também exigem captcha e/ou
                    certificado digital, e seus termos de uso vedam raspagem automatizada.
                  O que dá para internalizar é a consulta processual por número único CNJ,
                  feita acima via /api/consulta-processo. Ver lib/datajud.ts.
                */}
                <div className="p-4 rounded-xl mb-4 space-y-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} color="#F59E0B"/>
                    <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>Certidão de antecedentes só sai nos sistemas oficiais (captcha + CPF):</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '🏛 TJMA (Maranhão)', url: 'https://www.tjma.jus.br' },
                      { label: '⚖️ CNJ - Certidão', url: 'https://www.cnj.jus.br/certidao' },
                      { label: '🔍 STJ - Consulta', url: 'https://www.stj.jus.br' },
                      { label: '📋 Receita Federal', url: 'https://www.receita.fazenda.gov.br' },
                    ].map(({ label, url }) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg text-xs transition-all hover:bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#D4AF37' }}>
                        {label} ↗
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px]" style={{ color: '#888' }}>A análise abaixo é baseada em legislação pública e indica o impacto legal de antecedentes nos benefícios previdenciários.</p>
                </div>
                {loadingHistorico && !antecedentes && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={28} className="animate-spin" color="#D4AF37"/>
                  </div>
                )}
                {erroCliente && !loadingHistorico && (
                  <div className="mb-4">
                    <BannerErro mensagem={erroCliente} onFechar={() => setErroCliente('')} />
                  </div>
                )}
                {!antecedentes && !loadingHistorico && !erroCliente && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Shield size={40} color="#333" className="mx-auto mb-3"/>
                    <p className="text-sm text-gray-500">Selecione um cliente para ver a análise de antecedentes</p>
                  </div>
                )}
                {antecedentes && (
                  <ParecerAccordion text={antecedentes} isLight={isLight} streaming={loadingHistorico} />
                )}
              </ScrollFade>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
