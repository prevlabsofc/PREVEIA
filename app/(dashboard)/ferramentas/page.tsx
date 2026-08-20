'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, CheckSquare, Clock, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { CARENCIAS_INSS as CARENCIAS, CHECKLIST_INSS as CHECKLIST } from '@/lib/checklist-inss'

const SALARIO_MINIMO = 1518
const TETO_INSS = 7786.02

export default function FerramentasPage() {
  const [isLight, setIsLight] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'simulador' | 'checklist'>('simulador')
  const [beneficioSelecionado, setBeneficioSelecionado] = useState('')
  const [checklistAberto, setChecklistAberto] = useState(true)

  // Simulador
  const [idadeAtual, setIdadeAtual] = useState('')
  const [sexo, setSexo] = useState('F')
  const [tempoContrib, setTempoContrib] = useState('')
  const [tempoContribAuto, setTempoContribAuto] = useState(false)
  const [salarioMedio, setSalarioMedio] = useState('')
  const [zona, setZona] = useState('rural')
  const [resultadoSim, setResultadoSim] = useState<any>(null)

  // Calculadora
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [erroDataInicio, setErroDataInicio] = useState<string | null>(null)
  const [erroDataFim, setErroDataFim] = useState<string | null>(null)
  const [resultadoCalc, setResultadoCalc] = useState<any>(null)

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  function simular() {
    const idade = parseInt(idadeAtual)
    const contrib = parseInt(tempoContrib)
    const salario = parseFloat(salarioMedio) || SALARIO_MINIMO

    const resultados: any[] = []

    if (zona === 'rural') {
      const idadeMin = sexo === 'F' ? 55 : 60
      const faltaIdade = Math.max(0, idadeMin - idade)
      resultados.push({
        beneficio: 'Aposentadoria por Idade Rural',
        elegivel: idade >= idadeMin,
        falta: faltaIdade > 0 ? `${faltaIdade} anos de idade` : null,
        valor: `R$ ${SALARIO_MINIMO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        obs: 'Valor = 1 salário mínimo para segurado especial',
        cor: idade >= idadeMin ? '#22C55E' : '#F59E0B',
      })
      resultados.push({
        beneficio: 'Salário-Maternidade (Segurada Especial)',
        elegivel: true,
        falta: null,
        valor: `R$ ${SALARIO_MINIMO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês × 4 meses`,
        obs: 'Carência dispensada pelo STF (ADIs 2110 e 2111)',
        cor: '#22C55E',
      })
    }

    if (zona === 'urbano') {
      const idadeMinUrb = sexo === 'F' ? 62 : 65
      const faltaIdadeUrb = Math.max(0, idadeMinUrb - idade)
      const faltaContrib = Math.max(0, 180 - contrib)
      const coeficiente = Math.min(salario, TETO_INSS) * 0.60 + (Math.max(contrib - 20, 0) * 0.02 * Math.min(salario, TETO_INSS))
      const valorBenef = Math.min(Math.max(coeficiente, SALARIO_MINIMO), TETO_INSS)
      resultados.push({
        beneficio: 'Aposentadoria por Idade Urbana',
        elegivel: idade >= idadeMinUrb && contrib >= 180,
        falta: faltaIdadeUrb > 0 ? `${faltaIdadeUrb} anos de idade` : faltaContrib > 0 ? `${faltaContrib} contribuições` : null,
        valor: `R$ ${valorBenef.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        obs: 'Estimativa baseada no salário médio informado',
        cor: (idade >= idadeMinUrb && contrib >= 180) ? '#22C55E' : '#F59E0B',
      })
    }

    const valorBPC = SALARIO_MINIMO
    const idadeMinBPC = 65
    resultados.push({
      beneficio: 'BPC/LOAS (Idoso)',
      elegivel: idade >= idadeMinBPC,
      falta: idade < idadeMinBPC ? `${idadeMinBPC - idade} anos de idade` : null,
      valor: `R$ ${valorBPC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      obs: 'Renda familiar per capita ≤ 1/4 do salário mínimo',
      cor: idade >= idadeMinBPC ? '#22C55E' : '#F59E0B',
    })

    setResultadoSim(resultados)
  }

  // Aplica máscara DD/MM/AAAA limitando o ano a 4 dígitos
  function formatarDataBR(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 8)
    if (digitos.length > 4) return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4, 8)}`
    if (digitos.length > 2) return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}`
    return digitos
  }

  // Converte DD/MM/AAAA em Date, retornando null se a data não existir de fato (ex: 31/02)
  function parseDataBR(valor: string): Date | null {
    const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return null
    const dia = parseInt(m[1], 10)
    const mes = parseInt(m[2], 10)
    const ano = parseInt(m[3], 10)
    const data = new Date(ano, mes - 1, dia)
    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null
    return data
  }

  // Só valida quando a data estiver completa (8 dígitos digitados)
  function validarDataBR(valor: string): string | null {
    const digitos = valor.replace(/\D/g, '')
    if (digitos.length === 0) return null
    if (digitos.length < 8) return null
    const anoAtual = new Date().getFullYear()
    const data = parseDataBR(valor)
    if (!data) return 'Data inválida. Use o formato DD/MM/AAAA.'
    const ano = data.getFullYear()
    if (ano < 1900) return 'Ano inválido: deve ser posterior a 1900.'
    if (ano > anoAtual + 1) return `Ano inválido: não pode ser posterior a ${anoAtual + 1}.`
    return null
  }

  function handleDataInicioChange(valor: string) {
    const formatado = formatarDataBR(valor)
    setDataInicio(formatado)
    setErroDataInicio(validarDataBR(formatado))
  }

  function handleDataFimChange(valor: string) {
    const formatado = formatarDataBR(valor)
    setDataFim(formatado)
    setErroDataFim(validarDataBR(formatado))
  }

  function calcularTempo() {
    const erroInicio = validarDataBR(dataInicio) || (dataInicio ? null : 'Informe a data de início.')
    const erroFim = validarDataBR(dataFim) || (dataFim ? null : 'Informe a data de encerramento.')
    setErroDataInicio(erroInicio)
    setErroDataFim(erroFim)
    if (erroInicio || erroFim) return

    const inicio = parseDataBR(dataInicio)
    const fim = parseDataBR(dataFim)
    if (!inicio || !fim) return

    const diffMs = fim.getTime() - inicio.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const anos = Math.floor(diffDias / 365)
    const meses = Math.floor((diffDias % 365) / 30)
    const dias = diffDias % 30
    const totalMeses = Math.floor(diffDias / 30)
    setResultadoCalc({ anos, meses, dias, totalMeses, diffDias })
    setTempoContrib(String(totalMeses))
    setTempoContribAuto(true)
  }

  const inputCls = "input-glass w-full px-4 text-sm"

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ background: isLight ? '#F8F8F8' : 'transparent' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
          <Calculator size={28} color="#D4AF37"/>
          <span style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Ferramentas </span>
          <span className="text-gradient-gold">Previdenciárias</span>
        </h1>
        <p style={{ color: isLight ? '#5E5E5E' : '#9ca3af' }}>Simulador de benefícios, checklist INSS e calculadora de tempo</p>
      </motion.div>

      {/* ABAS */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'simulador', label: 'Tempo de Contribuição & Simulador', icon: Calculator },
          { id: 'checklist', label: 'Checklist INSS', icon: CheckSquare },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setAbaAtiva(id as any)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: abaAtiva === id ? 'rgba(212,175,55,0.15)' : 'transparent', color: abaAtiva === id ? '#D4AF37' : '#888', border: abaAtiva === id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent' }}>
            <Icon size={15}/> {label}
          </button>
        ))}
      </div>

      {/* CALCULADORA + SIMULADOR (fluxo em 2 passos conectados) */}
      {abaAtiva === 'simulador' && (
        <div className="space-y-6">
          {/* PASSO 1 - CALCULADORA DE TEMPO DE CONTRIBUIÇÃO */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>1</span>
              <h2 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Calcule seu tempo de contribuição</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard intensity={0.4} style={{ padding: 24 }}>
                <h3 className="font-bold mb-4" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Calcular Período</h3>
                <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data de início da atividade</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataInicio}
                  aria-invalid={!!erroDataInicio}
                  aria-describedby={erroDataInicio ? 'erro-data-inicio' : undefined}
                  onChange={e => handleDataInicioChange(e.target.value)}
                  onBlur={() => setErroDataInicio(validarDataBR(dataInicio) || (dataInicio && dataInicio.replace(/\D/g, '').length < 8 ? 'Data incompleta. Use o formato DD/MM/AAAA.' : null))}
                  className={`${inputCls}${erroDataInicio ? ' input-erro' : ''}`}
                  style={{ height: 44 }} spellCheck={true} />
                <AnimatePresence>
                  {erroDataInicio && (
                    <motion.div id="erro-data-inicio" role="alert"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl overflow-hidden"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <AlertCircle size={14} color="#EF4444" className="flex-shrink-0"/>
                      <span style={{ color: '#EF4444', fontSize: 12 }}>{erroDataInicio}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button onClick={() => {
                  const hoje = new Date()
                  const formatado = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
                  setDataInicio(formatado)
                  setErroDataInicio(null)
                }} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-white/5 mt-2" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                  Hoje
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Data de encerramento (ou hoje)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={dataFim}
                  aria-invalid={!!erroDataFim}
                  aria-describedby={erroDataFim ? 'erro-data-fim' : undefined}
                  onChange={e => handleDataFimChange(e.target.value)}
                  onBlur={() => setErroDataFim(validarDataBR(dataFim) || (dataFim && dataFim.replace(/\D/g, '').length < 8 ? 'Data incompleta. Use o formato DD/MM/AAAA.' : null))}
                  className={`${inputCls}${erroDataFim ? ' input-erro' : ''}`}
                  style={{ height: 44 }} spellCheck={true} />
                <AnimatePresence>
                  {erroDataFim && (
                    <motion.div id="erro-data-fim" role="alert"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl overflow-hidden"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <AlertCircle size={14} color="#EF4444" className="flex-shrink-0"/>
                      <span style={{ color: '#EF4444', fontSize: 12 }}>{erroDataFim}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={() => {
                const hoje = new Date()
                const formatado = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
                setDataFim(formatado)
                setErroDataFim(null)
              }} className="text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                Usar data de hoje
              </button>
                  <button onClick={calcularTempo} className="btn-gold w-full py-3 rounded-xl text-sm font-bold">
                    Calcular →
                  </button>
                </div>
              </GlassCard>

              <div>
                {!resultadoCalc && (
                  <GlassCard intensity={0.2} style={{ padding: 32 }}>
                    <div className="text-center">
                      <Clock size={36} color="#333" className="mx-auto mb-3"/>
                      <p className="text-sm text-gray-500">Informe o período para calcular</p>
                    </div>
                  </GlassCard>
                )}
                {resultadoCalc && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                    <GlassCard gold intensity={1} style={{ padding: 24 }}>
                      <div className="text-center">
                        <div className="text-4xl font-black mb-2 text-gradient-gold">
                          {resultadoCalc.anos}a {resultadoCalc.meses}m {resultadoCalc.dias}d
                        </div>
                        <p className="text-sm text-gray-400">Tempo total de atividade</p>
                      </div>
                    </GlassCard>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Total em meses', value: `${resultadoCalc.totalMeses} meses`, color: '#3B82F6' },
                        { label: 'Total em dias', value: `${resultadoCalc.diffDias} dias`, color: '#A855F7' },
                        { label: 'Carência rural (180m)', value: resultadoCalc.totalMeses >= 180 ? '✅ Cumprida' : `Faltam ${180 - resultadoCalc.totalMeses}m`, color: resultadoCalc.totalMeses >= 180 ? '#22C55E' : '#F59E0B' },
                        { label: 'Carência urbana (180m)', value: resultadoCalc.totalMeses >= 180 ? '✅ Cumprida' : `Faltam ${180 - resultadoCalc.totalMeses}m`, color: resultadoCalc.totalMeses >= 180 ? '#22C55E' : '#F59E0B' },
                      ].map(({ label, value, color }) => (
                        <GlassCard key={label} intensity={0.5} style={{ padding: 16 }}>
                          <div className="text-sm font-bold mb-1" style={{ color }}>{value}</div>
                          <div className="text-[10px] text-gray-500">{label}</div>
                        </GlassCard>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* CONECTOR VISUAL ENTRE OS PASSOS */}
          <div className="flex items-center justify-center py-1">
            <div className="flex flex-col items-center gap-1">
              <div className="w-px h-6" style={{ background: 'linear-gradient(to bottom, rgba(212,175,55,0.4), rgba(212,175,55,0.1))' }}/>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
                <ChevronDown size={16} color="#D4AF37"/>
              </div>
            </div>
          </div>

          {/* PASSO 2 - SIMULADOR DE BENEFÍCIOS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>2</span>
              <h2 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Simule seu benefício</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard intensity={0.4} style={{ padding: 24 }}>
                <h3 className="font-bold mb-4" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>Dados do Segurado</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Idade atual</label>
                      <input type="number" value={idadeAtual} onChange={e => setIdadeAtual(e.target.value)} placeholder="Ex: 55" className={inputCls} style={{ height: 44 }}/>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Sexo</label>
                      <select value={sexo} onChange={e => setSexo(e.target.value)} className={inputCls} style={{ height: 44 }}>
                        <option value="F" style={{ background: '#111' }}>Feminino</option>
                        <option value="M" style={{ background: '#111' }}>Masculino</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Zona de trabalho</label>
                    <select value={zona} onChange={e => setZona(e.target.value)} className={inputCls} style={{ height: 44 }}>
                      <option value="rural" style={{ background: '#111' }}>🌾 Rural (Segurado Especial)</option>
                      <option value="urbano" style={{ background: '#111' }}>🏢 Urbano</option>
                    </select>
                  </div>
                  {zona === 'urbano' && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Contribuições (meses)</label>
                        <input type="number" value={tempoContrib} onChange={e => { setTempoContrib(e.target.value); setTempoContribAuto(false) }} placeholder="Ex: 180" className={inputCls} style={{ height: 44 }}/>
                        {tempoContribAuto && (
                          <p className="text-[10px] mt-1" style={{ color: '#D4AF37' }}>✓ Preenchido automaticamente após calcular seu tempo de contribuição acima</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Salário médio (R$)</label>
                        <input type="number" value={salarioMedio} onChange={e => setSalarioMedio(e.target.value)} placeholder="Ex: 3000" className={inputCls} style={{ height: 44 }}/>
                      </div>
                    </>
                  )}
                  <button onClick={simular} className="btn-gold w-full py-3 rounded-xl text-sm font-bold">
                    Simular Benefícios →
                  </button>
                </div>
              </GlassCard>

              <div className="space-y-3">
                {!resultadoSim && (
                  <GlassCard intensity={0.2} style={{ padding: 32 }}>
                    <div className="text-center">
                      <Calculator size={36} color="#333" className="mx-auto mb-3"/>
                      <p className="text-sm text-gray-500">Preencha os dados e clique em Simular</p>
                    </div>
                  </GlassCard>
                )}
                {resultadoSim?.map((r: any, i: number) => (
                  <GlassCard key={i} intensity={0.5} style={{ padding: 20 }}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>{r.beneficio}</h4>
                      <span className="text-[10px] px-2 py-1 rounded-full font-bold flex-shrink-0 ml-2" style={{ background: `${r.cor}18`, color: r.cor }}>
                        {r.elegivel ? '✅ Elegível' : '⏳ Pendente'}
                      </span>
                    </div>
                    {r.falta && <p className="text-xs mb-1" style={{ color: '#F59E0B' }}>Falta: {r.falta}</p>}
                    <p className="text-sm font-bold mb-1" style={{ color: '#D4AF37' }}>{r.valor}</p>
                    <p className="text-[10px] text-gray-500">{r.obs}</p>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKLIST */}
      {abaAtiva === 'checklist' && (
        <div className="space-y-4">
          <GlassCard intensity={0.4} style={{ padding: 20 }}>
            <label className="block text-xs text-gray-400 mb-2">Tipo de benefício</label>
            <select value={beneficioSelecionado} onChange={e => setBeneficioSelecionado(e.target.value)} className={inputCls} style={{ height: 48 }}>
              <option value="" style={{ background: '#111' }}>Selecionar benefício...</option>
              {Object.keys(CHECKLIST).map(b => <option key={b} value={b} style={{ background: '#111' }}>{b}</option>)}
            </select>
          </GlassCard>

          {beneficioSelecionado && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard intensity={0.3} style={{ padding: 24 }}>
                <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setChecklistAberto(o => !o)}>
                  <h3 className="font-bold" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
                    📋 {beneficioSelecionado}
                  </h3>
                  {checklistAberto ? <ChevronUp size={18} color="#888"/> : <ChevronDown size={18} color="#888"/>}
                </div>
                {checklistAberto && (
                  <>
                    <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#D4AF37' }}>⏱ Carência:</p>
                      <p className="text-xs text-gray-300">{CARENCIAS[beneficioSelecionado]}</p>
                    </div>
                    <div className="space-y-2">
                      {CHECKLIST[beneficioSelecionado].map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.02)' }}>
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                            <span className="text-[10px]" style={{ color: '#22C55E' }}>✓</span>
                          </div>
                          <span className="text-sm" style={{ color: isLight ? '#1E1E1E' : '#ddd' }}>{doc}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(CHECKLIST[beneficioSelecionado].join('\n'))}
                      className="mt-4 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-white/5"
                      style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
                      📋 Copiar lista
                    </button>
                  </>
                )}
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}