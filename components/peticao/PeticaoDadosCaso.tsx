'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Save } from 'lucide-react'
import { ESTADOS_BRASIL } from '@/lib/estados-brasil'
import { buscarSubsecao, listarSubsecoesUf } from '@/lib/jurisdicao/subsecoes'
import { mascaraCEP } from '@/lib/formatar-endereco'
import {
  ESTADOS_CIVIS_SM,
  LABELS_ESTADO_CIVIL,
  mascaraCPF,
  validarFormularioSm,
  type ErrosFormSm,
} from '@/lib/validar-form-peticao'
import {
  aplicarCampoNoTexto,
  extrairDadosCasoDoTexto,
  dadosCasoParaCliente,
  formatarSalarioRef,
  type AvisoSubstituicao,
  type CampoDadosCaso,
  type DadosCasoPeticao,
} from '@/lib/peticao-substituir-dados'
import { tentarValorCausaSalarioMaternidade } from '@/lib/salario-minimo'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Props = {
  text: string
  onTextChange: (text: string) => void
  formData?: Record<string, string> | null
  formSnapshot?: Record<string, unknown> | null
  onFormDataChange?: (data: Record<string, string>) => void
  clientId?: string | null
  isLight?: boolean
  /** Indica alteração pendente no formulário (ponto dourado na aba). */
  onDirtyChange?: (dirty: boolean) => void
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[11px] mb-1" style={{ color: '#888' }}>
      {children}
      {required ? <span style={{ color: '#D4AF37' }}> *</span> : null}
    </label>
  )
}

function Err({ children }: { children?: string }) {
  if (!children) return null
  return (
    <p className="text-[10px] mt-0.5" style={{ color: '#ef4444' }}>
      {children}
    </p>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div
        className="text-[10px] font-bold tracking-widest mb-2 pb-1"
        style={{ color: 'rgba(212,175,55,0.7)', borderBottom: '1px solid rgba(212,175,55,0.15)' }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

/**
 * Formulário editável dos dados que geraram a petição.
 * No blur, substitui o valor no texto (sem IA). Concordância/cálculo pedem Aplicar.
 */
export function PeticaoDadosCaso({
  text,
  onTextChange,
  formData,
  formSnapshot,
  onFormDataChange,
  clientId,
  isLight = false,
  onDirtyChange,
}: Props) {
  const iniciais = useMemo(
    () => ({
      ...extrairDadosCasoDoTexto(text, formSnapshot),
      ...(formData || {}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hidrata 1x / quando snapshot muda
    [formSnapshot, Boolean(formData)],
  )

  const [dados, setDados] = useState<DadosCasoPeticao>(iniciais)
  const [baseline, setBaseline] = useState<DadosCasoPeticao>(iniciais)
  const [errors, setErrors] = useState<ErrosFormSm>({})
  const [aviso, setAviso] = useState<AvisoSubstituicao | null>(null)
  const [savingFicha, setSavingFicha] = useState(false)
  const [fichaMsg, setFichaMsg] = useState<string | null>(null)
  const [subsecaoManual, setSubsecaoManual] = useState(false)

  useEffect(() => {
    setDados((prev) => ({ ...prev, ...iniciais }))
    setBaseline((prev) => ({ ...prev, ...iniciais }))
  }, [iniciais])

  useEffect(() => {
    const dirty = Object.keys(dados).some((k) => dados[k] !== baseline[k])
    onDirtyChange?.(dirty)
  }, [dados, baseline, onDirtyChange])

  const inputStyle = {
    height: 36,
    background: isLight ? '#fff' : 'rgba(255,255,255,0.03)',
    border: isLight ? '1px solid #E5E5E5' : '1px solid rgba(255,255,255,0.1)',
    color: isLight ? '#1E1E1E' : '#ddd',
  }

  const errBorder = (err?: string) =>
    err ? { ...inputStyle, borderColor: '#ef4444' } : inputStyle

  function setCampo(patch: Partial<DadosCasoPeticao>) {
    setDados((p) => {
      const next: DadosCasoPeticao = { ...p }
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) next[k] = v
      }
      onFormDataChange?.(next)
      return next
    })
    setFichaMsg(null)
  }

  function onBlurCampo(campo: CampoDadosCaso, valorOverride?: string) {
    const valor = valorOverride !== undefined ? valorOverride : dados[campo] || ''
    const dadosAtual = { ...dados, [campo]: valor }
    const erros = validarFormularioSm(dadosAtual, { rural: true })
    setErrors((p) => ({ ...p, ...pickErros(erros, campo) }))

    // campos opcionais de validação parcial
    if (campo === 'cpf' && erros.cpf) return
    if (campo === 'cpf_crianca' && erros.cpf_crianca) return
    if (campo === 'data_nascimento' && erros.data_nascimento) return
    if (campo === 'data_nascimento_crianca' && erros.data_nascimento_crianca) return
    if (campo === 'data_requerimento' && erros.data_requerimento) return
    if (campo === 'data_indeferimento' && erros.data_indeferimento) return
    if (campo === 'nb' && erros.nb) return
    if (campo === 'subsecao_judiciaria' && erros.subsecao_judiciaria) return
    if (campo === 'sexo_parte_autora' && erros.sexo_parte_autora) return

    if ((baseline[campo] || '') === valor) return

    const result = aplicarCampoNoTexto(text, baseline, campo, valor)
    setDados(result.dados)
    onFormDataChange?.(result.dados)

    if (result.aviso) {
      setAviso(result.aviso)
      // aplica só as substituições literais já feitas; aviso fica pendente
      if (result.texto !== text) onTextChange(result.texto)
      setBaseline(result.dados)
      return
    }

    if (result.texto !== text) onTextChange(result.texto)
    setBaseline(result.dados)
    setAviso(null)
  }

  function aplicarAviso() {
    if (!aviso) return
    onTextChange(aviso.textoProposto)
    setBaseline(dados)
    setAviso(null)
  }

  function descartarAviso() {
    setAviso(null)
  }

  async function salvarNaFicha() {
    if (!clientId) {
      setFichaMsg('Nenhum cliente vinculado a esta petição.')
      return
    }
    const erros = validarFormularioSm(dados, { rural: true })
    const bloqueantes = [
      erros.cpf,
      erros.data_nascimento,
      erros.sexo_parte_autora,
      erros.autor_logradouro,
      erros.autor_municipio,
      erros.autor_uf,
      erros.subsecao_judiciaria,
    ].filter(Boolean)
    if (bloqueantes.length) {
      setErrors(erros)
      setFichaMsg('Corrija os erros do formulário antes de salvar na ficha.')
      return
    }
    setSavingFicha(true)
    setFichaMsg(null)
    try {
      const patch = dadosCasoParaCliente(dados)
      const { error } = await supabase.from('clients').update(patch).eq('id', clientId)
      if (error) {
        setFichaMsg(`Erro ao salvar: ${error.message}`)
        return
      }
      setFichaMsg('Dados gravados na ficha do cliente.')
      setBaseline(dados)
    } finally {
      setSavingFicha(false)
    }
  }

  // Recalcula SM de referência exibido
  const smRef = useMemo(() => {
    const vc = tentarValorCausaSalarioMaternidade(dados.data_nascimento_crianca || '')
    return vc?.mensalFmt || dados.salario_minimo_ref || formatarSalarioRef(dados.data_nascimento_crianca || '')
  }, [dados.data_nascimento_crianca, dados.salario_minimo_ref])

  const uf = dados.autor_uf || 'MA'
  const subsecoes = listarSubsecoesUf(uf)

  return (
    <div className="p-3 overflow-y-auto max-h-[70vh]" style={{ minHeight: 420 }}>
      {aviso && (
        <div
          className="mb-3 rounded-lg px-3 py-2 flex items-start gap-2 flex-wrap"
          style={{
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.35)',
          }}
          role="status"
        >
          <p className="text-[11px] flex-1" style={{ color: '#D4AF37' }}>
            {aviso.mensagem}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={aplicarAviso}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold"
              style={{ background: '#D4AF37', color: '#000' }}
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={descartarAviso}
              className="px-2.5 py-1 rounded-md text-[11px]"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#888' }}
            >
              Ignorar
            </button>
          </div>
        </div>
      )}

      <Section title="PARTE AUTORA">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <Label required>Nome</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.nome)}
              value={dados.nome || ''}
              onChange={(e) => setCampo({ nome: e.target.value })}
              onBlur={() => onBlurCampo('nome')}
            />
          </div>
          <div>
            <Label required>CPF</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.cpf)}
              value={dados.cpf || ''}
              onChange={(e) => setCampo({ cpf: mascaraCPF(e.target.value) })}
              onBlur={() => onBlurCampo('cpf')}
            />
            <Err>{errors.cpf}</Err>
          </div>
          <div>
            <Label>RG</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.rg || ''}
              onChange={(e) => setCampo({ rg: e.target.value })}
              onBlur={() => onBlurCampo('rg')}
            />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <input
              type="date"
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.data_nascimento)}
              value={toDateInput(dados.data_nascimento)}
              onChange={(e) => setCampo({ data_nascimento: e.target.value })}
              onBlur={() => onBlurCampo('data_nascimento')}
            />
            <Err>{errors.data_nascimento}</Err>
          </div>
          <div>
            <Label>Estado civil</Label>
            <select
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.estado_civil)}
              value={dados.estado_civil || ''}
              onChange={(e) => {
                const v = e.target.value
                setCampo({ estado_civil: v })
                queueMicrotask(() => onBlurCampo('estado_civil', v))
              }}
            >
              <option value="">Selecione</option>
              {ESTADOS_CIVIS_SM.map((k) => (
                <option key={k} value={k}>
                  {LABELS_ESTADO_CIVIL[k]}
                </option>
              ))}
            </select>
            <Err>{errors.estado_civil}</Err>
          </div>
          <div>
            <Label required>Sexo</Label>
            <select
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.sexo_parte_autora)}
              value={dados.sexo_parte_autora || ''}
              onChange={(e) => {
                const v = e.target.value
                setCampo({ sexo_parte_autora: v })
                queueMicrotask(() => onBlurCampo('sexo_parte_autora', v))
              }}
            >
              <option value="">Selecione</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </select>
            <Err>{errors.sexo_parte_autora}</Err>
          </div>
          <div>
            <Label>Profissão</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.profissao || ''}
              onChange={(e) => setCampo({ profissao: e.target.value })}
              onBlur={() => onBlurCampo('profissao')}
            />
          </div>
        </div>
      </Section>

      <Section title="ENDEREÇO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label>CEP</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.autor_cep || ''}
              onChange={(e) => setCampo({ autor_cep: mascaraCEP(e.target.value) })}
              onBlur={() => onBlurCampo('autor_cep')}
            />
          </div>
          <div>
            <Label>Número</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.autor_numero || ''}
              onChange={(e) => setCampo({ autor_numero: e.target.value })}
              onBlur={() => onBlurCampo('autor_numero')}
            />
          </div>
          <div className="sm:col-span-2">
            <Label required>Logradouro</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.autor_logradouro)}
              value={dados.autor_logradouro || ''}
              onChange={(e) => setCampo({ autor_logradouro: e.target.value })}
              onBlur={() => onBlurCampo('autor_logradouro')}
            />
            <Err>{errors.autor_logradouro}</Err>
          </div>
          <div>
            <Label>Bairro / comunidade</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.autor_bairro || ''}
              onChange={(e) => setCampo({ autor_bairro: e.target.value })}
              onBlur={() => onBlurCampo('autor_bairro')}
            />
          </div>
          <div>
            <Label>Zona</Label>
            <select
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.autor_zona || 'rural'}
              onChange={(e) => {
                const v = e.target.value
                setCampo({ autor_zona: v })
                queueMicrotask(() => onBlurCampo('autor_zona', v))
              }}
            >
              <option value="rural">Rural</option>
              <option value="urbana">Urbana</option>
            </select>
          </div>
          <div>
            <Label required>Município</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.autor_municipio)}
              value={dados.autor_municipio || ''}
              onChange={(e) => setCampo({ autor_municipio: e.target.value })}
              onBlur={() => {
                const sub = buscarSubsecao(dados.autor_municipio || '', uf)
                if (sub && !subsecaoManual) {
                  setCampo({ subsecao_judiciaria: sub })
                }
                onBlurCampo('autor_municipio')
              }}
            />
            <Err>{errors.autor_municipio}</Err>
          </div>
          <div>
            <Label required>UF</Label>
            <select
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.autor_uf)}
              value={dados.autor_uf || ''}
              onChange={(e) => {
                const v = e.target.value
                setCampo({ autor_uf: v })
                queueMicrotask(() => onBlurCampo('autor_uf', v))
              }}
            >
              <option value="">UF</option>
              {ESTADOS_BRASIL.map((e) => (
                <option key={e.sigla} value={e.sigla}>
                  {e.sigla}
                </option>
              ))}
            </select>
            <Err>{errors.autor_uf}</Err>
          </div>
          <div className="sm:col-span-2">
            <Label required>Subseção judiciária</Label>
            <select
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.subsecao_judiciaria)}
              value={
                subsecaoManual
                  ? '__manual__'
                  : subsecoes.includes(dados.subsecao_judiciaria || '')
                    ? dados.subsecao_judiciaria
                    : dados.subsecao_judiciaria
                      ? '__manual__'
                      : ''
              }
              onChange={(e) => {
                const v = e.target.value
                if (v === '__manual__') {
                  setSubsecaoManual(true)
                  return
                }
                setSubsecaoManual(false)
                setCampo({ subsecao_judiciaria: v })
                queueMicrotask(() => onBlurCampo('subsecao_judiciaria', v))
              }}
            >
              <option value="">Selecione</option>
              {subsecoes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__manual__">Outra (digitar)</option>
            </select>
            {(subsecaoManual ||
              (dados.subsecao_judiciaria &&
                !subsecoes.includes(dados.subsecao_judiciaria))) && (
              <input
                className="input-glass w-full px-2 text-sm mt-1.5"
                style={errBorder(errors.subsecao_judiciaria)}
                value={dados.subsecao_judiciaria || ''}
                onChange={(e) => setCampo({ subsecao_judiciaria: e.target.value })}
                onBlur={() => onBlurCampo('subsecao_judiciaria')}
                placeholder="Subseção judiciária"
              />
            )}
            <Err>{errors.subsecao_judiciaria}</Err>
          </div>
        </div>
      </Section>

      <Section title="CRIANÇA">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <Label required>Nome</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.nome_crianca)}
              value={dados.nome_crianca || ''}
              onChange={(e) => setCampo({ nome_crianca: e.target.value })}
              onBlur={() => onBlurCampo('nome_crianca')}
            />
            <Err>{errors.nome_crianca}</Err>
          </div>
          <div>
            <Label>CPF</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.cpf_crianca)}
              value={dados.cpf_crianca || ''}
              onChange={(e) => setCampo({ cpf_crianca: mascaraCPF(e.target.value) })}
              onBlur={() => onBlurCampo('cpf_crianca')}
            />
            <Err>{errors.cpf_crianca}</Err>
          </div>
          <div>
            <Label required>Data de nascimento</Label>
            <input
              type="date"
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.data_nascimento_crianca)}
              value={toDateInput(dados.data_nascimento_crianca)}
              onChange={(e) => setCampo({ data_nascimento_crianca: e.target.value })}
              onBlur={() => onBlurCampo('data_nascimento_crianca')}
            />
            <Err>{errors.data_nascimento_crianca}</Err>
          </div>
          <div>
            <Label>Sexo</Label>
            <select
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.sexo_crianca || ''}
              onChange={(e) => {
                const v = e.target.value
                setCampo({ sexo_crianca: v })
                queueMicrotask(() => onBlurCampo('sexo_crianca', v))
              }}
            >
              <option value="">Não informado</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="PROCESSO">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label>NB</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.nb)}
              value={dados.nb || ''}
              onChange={(e) => setCampo({ nb: e.target.value.replace(/[^\d.\-]/g, '') })}
              onBlur={() => onBlurCampo('nb')}
            />
            <Err>{errors.nb}</Err>
          </div>
          <div>
            <Label>Motivo do indeferimento</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={dados.motivo_inss || ''}
              onChange={(e) => setCampo({ motivo_inss: e.target.value })}
              onBlur={() => onBlurCampo('motivo_inss')}
            />
          </div>
          <div>
            <Label required>Data do requerimento</Label>
            <input
              type="date"
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.data_requerimento)}
              value={toDateInput(dados.data_requerimento)}
              onChange={(e) => setCampo({ data_requerimento: e.target.value })}
              onBlur={() => onBlurCampo('data_requerimento')}
            />
            <Err>{errors.data_requerimento}</Err>
          </div>
          <div>
            <Label required>Data do indeferimento</Label>
            <input
              type="date"
              className="input-glass w-full px-2 text-sm"
              style={errBorder(errors.data_indeferimento)}
              value={toDateInput(dados.data_indeferimento)}
              onChange={(e) => setCampo({ data_indeferimento: e.target.value })}
              onBlur={() => onBlurCampo('data_indeferimento')}
            />
            <Err>{errors.data_indeferimento}</Err>
          </div>
        </div>
      </Section>

      <Section title="VALOR">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label>Salário mínimo de referência</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              value={smRef}
              readOnly
              title="Calculado pela data de nascimento da criança"
            />
          </div>
          <div>
            <Label>Número de parcelas</Label>
            <input
              className="input-glass w-full px-2 text-sm"
              style={inputStyle}
              type="number"
              min={1}
              max={12}
              value={dados.numero_parcelas || '4'}
              onChange={(e) => setCampo({ numero_parcelas: e.target.value })}
              onBlur={() => onBlurCampo('numero_parcelas')}
            />
          </div>
        </div>
      </Section>

      <div className="pt-1 pb-2">
        <button
          type="button"
          onClick={() => void salvarNaFicha()}
          disabled={savingFicha || !clientId}
          className="w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.35)',
            color: '#D4AF37',
          }}
        >
          {savingFicha ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Salvar na ficha do cliente
        </button>
        {fichaMsg && (
          <p className="text-[11px] mt-1.5 text-center" style={{ color: '#888' }}>
            {fichaMsg}
          </p>
        )}
      </div>
    </div>
  )
}

function toDateInput(v?: string): string {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim())
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  return ''
}

function pickErros(erros: ErrosFormSm, campo: CampoDadosCaso): Partial<ErrosFormSm> {
  const map: Partial<Record<CampoDadosCaso, keyof ErrosFormSm>> = {
    nome: 'nome',
    cpf: 'cpf',
    data_nascimento: 'data_nascimento',
    estado_civil: 'estado_civil',
    sexo_parte_autora: 'sexo_parte_autora',
    profissao: 'profissao',
    autor_logradouro: 'autor_logradouro',
    autor_municipio: 'autor_municipio',
    autor_uf: 'autor_uf',
    subsecao_judiciaria: 'subsecao_judiciaria',
    nome_crianca: 'nome_crianca',
    cpf_crianca: 'cpf_crianca',
    data_nascimento_crianca: 'data_nascimento_crianca',
    nb: 'nb',
    data_requerimento: 'data_requerimento',
    data_indeferimento: 'data_indeferimento',
  }
  const key = map[campo]
  if (!key) return {}
  return { [key]: erros[key] }
}
