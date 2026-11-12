'use client'

/**
 * Formulário SM rural em 3 blocos (mesmo formulário / mesmas chaves de payload).
 * Redesign visual: hierarquia tipográfica + camadas (modal/card/campo).
 * Provas: edição inline, adição custom e restauração dos padrões (imutáveis no parent).
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Pencil, Trash2, Upload } from 'lucide-react'
import { ESTADOS_BRASIL } from '@/lib/estados-brasil'
import {
  buscarSubsecao,
  formatarSubsecaoUf,
  listarSubsecoesUf,
} from '@/lib/jurisdicao/subsecoes'
import { formatarEnderecoAutorPeticao, mascaraCEP } from '@/lib/formatar-endereco'
import { flexionarAtividadeTimeline } from '@/lib/peticao-sm-rural'
import { avisoNomeSexoIncompativel } from '@/lib/aviso-nome-sexo'
import {
  avisoPrescricaoQuinquenal,
  validarFormularioSm,
  validarNb,
  validarNomeCrianca,
  validarPeriodoSegurado,
  mascaraCPF,
  LABELS_ESTADO_CIVIL,
  ESTADOS_CIVIS_SM,
  type ErrosFormSm,
} from '@/lib/validar-form-peticao'
import type { EstiloPeticao } from '@/lib/peticao-export'

type ProvaItem = {
  id: string
  texto: string
  /** Texto original dos 11 padrão; undefined se custom. */
  padrao?: string
  custom: boolean
}

function criarItensPadrao(opcoes: string[]): ProvaItem[] {
  return opcoes.map((texto, i) => ({
    id: `padrao-${i}`,
    texto,
    padrao: texto,
    custom: false,
  }))
}

function idCustom(): string {
  return `custom-${typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`}`
}

function chaveProfissao(v: string): string {
  const s = v.toLowerCase()
  if (/pescador/.test(s)) return 'pescador'
  if (/extrativista/.test(s)) return 'extrativista'
  if (/agricultor/.test(s)) return 'agricultor'
  return ''
}

function labelProfissao(chave: string, sexo: string): string {
  const fem = sexo === 'feminino'
  if (chave === 'pescador') return fem ? 'Pescadora artesanal' : 'Pescador artesanal'
  if (chave === 'extrativista') return 'Extrativista'
  if (chave === 'agricultor') return fem ? 'Agricultora' : 'Agricultor'
  return ''
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="smr-label">
      {children}
      {required ? <span className="smr-req">*</span> : null}
    </label>
  )
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <div className="smr-card-header">
      <div className="smr-title">
        <span className="smr-title-bar" aria-hidden />
        {children}
      </div>
    </div>
  )
}

function SubTitle({ children }: { children: ReactNode }) {
  return <div className="smr-subtitle">{children}</div>
}

function Help({ children }: { children: ReactNode }) {
  return <p className="smr-help">{children}</p>
}

function Err({ children }: { children?: string }) {
  if (!children) return null
  return <p className="smr-error">{children}</p>
}

export type FormularioSmRuralProps = {
  isLight: boolean
  formData: Record<string, string>
  setFormData: Dispatch<SetStateAction<Record<string, string>>>
  formErrors: ErrosFormSm
  setFormErrors: Dispatch<SetStateAction<ErrosFormSm>>
  provas: string[]
  setProvas: Dispatch<SetStateAction<string[]>>
  provasOpcoes: string[]
  contexto: string
  setContexto: Dispatch<SetStateAction<string>>
  /** Observações sobre o cliente — vão para client_notes, não entram na petição. */
  observacoesCliente: string
  setObservacoesCliente: Dispatch<SetStateAction<string>>
  imagensPreview: string[]
  handleImagemUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  removerImagem: (i: number) => void
  estiloPeticao: EstiloPeticao
  setEstiloPeticao: Dispatch<SetStateAction<EstiloPeticao>>
  corPeticao: string
  setCorPeticao: Dispatch<SetStateAction<string>>
  cepLoading: boolean
  buscarCepAutor: (cep: string) => void
  atualizarEnderecoAutor: (patch: Record<string, string>) => void
  subsecaoManual: boolean
  setSubsecaoManual: Dispatch<SetStateAction<boolean>>
  selectedClientId: string
  clientes: { id: string; name: string; cpf?: string | null }[]
  onSelecionarCliente: (clienteId: string) => void
  optionStyle?: CSSProperties
  /** Fora dos cards — ex.: "Usar modelo pronto", logo abaixo da seleção de cliente */
  abaixoCliente?: ReactNode
}

export function FormularioSmRural({
  isLight,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  provas,
  setProvas,
  provasOpcoes,
  contexto,
  setContexto,
  observacoesCliente,
  setObservacoesCliente,
  imagensPreview,
  handleImagemUpload,
  removerImagem,
  estiloPeticao,
  setEstiloPeticao,
  corPeticao,
  setCorPeticao,
  cepLoading,
  buscarCepAutor,
  atualizarEnderecoAutor,
  subsecaoManual,
  setSubsecaoManual,
  selectedClientId,
  clientes,
  onSelecionarCliente,
  optionStyle,
  abaixoCliente,
}: FormularioSmRuralProps) {
  const avisoSexo = avisoNomeSexoIncompativel(
    formData.nome || '',
    formData.sexo_parte_autora || '',
  )
  const profKey = chaveProfissao(
    formData.profession || formData.profissao || formData.atividade || '',
  )

  const [itensProva, setItensProva] = useState<ProvaItem[]>(() =>
    criarItensPadrao(provasOpcoes),
  )
  const [marcadosProva, setMarcadosProva] = useState<string[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editOriginal, setEditOriginal] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const ignorarBlurRef = useRef(false)

  function setCampo(patch: Record<string, string>) {
    setFormData(p => ({ ...p, ...patch }))
  }

  // Sincroniza textos marcados → parent (`provas` = textos atuais marcados).
  useEffect(() => {
    const textos = itensProva
      .filter(i => marcadosProva.includes(i.id))
      .map(i => i.texto)
    setProvas(prev => {
      if (
        prev.length === textos.length &&
        prev.every((t, i) => t === textos[i])
      ) {
        return prev
      }
      return textos
    })
  }, [itensProva, marcadosProva, setProvas])

  // Migra `outras_provas` (rascunhos/modelos) → itens custom marcados.
  const ultimaMigracaoOutrasRef = useRef('')
  useEffect(() => {
    const raw = (formData.outras_provas || '').trim()
    if (!raw) return
    // Strict Mode / re-render: não duplicar a mesma carga.
    if (ultimaMigracaoOutrasRef.current === raw) {
      setFormData(p =>
        (p.outras_provas || '').trim() ? { ...p, outras_provas: '' } : p,
      )
      return
    }
    ultimaMigracaoOutrasRef.current = raw
    const linhas = raw
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
    setFormData(p => {
      if (!(p.outras_provas || '').trim()) return p
      return { ...p, outras_provas: '' }
    })
    if (!linhas.length) return
    const novos: ProvaItem[] = linhas.map(texto => ({
      id: idCustom(),
      texto,
      custom: true,
    }))
    setItensProva(prev => [...prev, ...novos])
    setMarcadosProva(prev => [...prev, ...novos.map(n => n.id)])
  }, [formData.outras_provas, setFormData])

  useEffect(() => {
    if (!editandoId) return
    const el = editInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editandoId])

  function toggleProva(id: string) {
    setMarcadosProva(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }

  function iniciarEdicao(item: ProvaItem) {
    setEditandoId(item.id)
    setEditDraft(item.texto)
    setEditOriginal(item.texto)
  }

  function cancelarEdicao() {
    const id = editandoId
    if (!id) return
    const item = itensProva.find(i => i.id === id)
    const original = editOriginal
    setEditandoId(null)
    setEditDraft('')
    setEditOriginal('')
    // Nova linha ainda sem texto salvo: não persiste.
    if (item?.custom && !original.trim()) {
      setItensProva(prev => prev.filter(i => i.id !== id))
      setMarcadosProva(prev => prev.filter(x => x !== id))
      return
    }
    // Esc: restaura o texto de quando a edição começou.
    setItensProva(prev =>
      prev.map(i => (i.id === id ? { ...i, texto: original } : i)),
    )
  }

  function salvarEdicao(abrirNova: boolean) {
    const id = editandoId
    if (!id) return
    const texto = editDraft.trim()
    const item = itensProva.find(i => i.id === id)
    if (!texto) {
      // Vazio: cancela (remove se era custom nova).
      if (item?.custom && !editOriginal.trim()) {
        setItensProva(prev => prev.filter(i => i.id !== id))
        setMarcadosProva(prev => prev.filter(x => x !== id))
      }
      setEditandoId(null)
      setEditDraft('')
      setEditOriginal('')
      return
    }
    setItensProva(prev =>
      prev.map(i => (i.id === id ? { ...i, texto } : i)),
    )
    setEditandoId(null)
    setEditDraft('')
    setEditOriginal('')
    if (abrirNova) {
      // Abre outra linha nova após o commit (fluxo em sequência).
      queueMicrotask(() => adicionarProva())
    }
  }

  function adicionarProva() {
    const id = idCustom()
    setItensProva(prev => [...prev, { id, texto: '', custom: true }])
    setMarcadosProva(prev => (prev.includes(id) ? prev : [...prev, id]))
    setEditandoId(id)
    setEditDraft('')
    setEditOriginal('')
  }

  function removerProvaCustom(id: string) {
    setItensProva(prev => prev.filter(i => i.id !== id))
    setMarcadosProva(prev => prev.filter(x => x !== id))
    if (editandoId === id) {
      setEditandoId(null)
      setEditDraft('')
      setEditOriginal('')
    }
  }

  function restaurarProvasPadrao() {
    if (
      !window.confirm(
        `Restaurar as ${provasOpcoes.length} provas padrão?\n\nTextos editados voltarão ao original e provas adicionadas serão removidas.`,
      )
    ) {
      return
    }
    setItensProva(criarItensPadrao(provasOpcoes))
    setMarcadosProva(prev => prev.filter(id => id.startsWith('padrao-')))
    setEditandoId(null)
    setEditDraft('')
    setEditOriginal('')
  }

  const optStyle: CSSProperties = optionStyle ?? (isLight
    ? { background: '#FFFFFF', color: '#1E1E1E' }
    : { background: '#222117', color: '#F5F3EA' })

  const errBorder = (has?: string): CSSProperties | undefined =>
    has ? { borderColor: '#ef4444', borderWidth: 1 } : undefined

  // `provas` prop espelha a seleção; mantido na assinatura para o parent.
  void provas

  return (
    <div className="form-sm-rural space-y-5">
      {/* ——— BLOCO 1: MÃE ——— */}
      <div className="smr-card">
        <CardTitle>Informações da mãe</CardTitle>

        <div className="smr-fields">
          <div>
            <Label required>Cliente </Label>
            <p className="smr-help" style={{ marginTop: 0, marginBottom: 6 }}>
              Cadastrado ou nome manual abaixo
            </p>
            <select
              value={selectedClientId}
              onChange={e => onSelecionarCliente(e.target.value)}
              className="input-glass w-full"
            >
              <option value="" style={optStyle}>
                Sem cliente cadastrado — usar nome manual
              </option>
              {clientes.map(c => (
                <option key={c.id} value={c.id} style={optStyle}>
                  {c.name} {c.cpf ? `— ${c.cpf}` : ''}
                </option>
              ))}
            </select>
            {selectedClientId ? (
              <p className="smr-help" style={{ color: '#22C55E' }}>
                Cliente vinculado — dados preenchidos automaticamente
              </p>
            ) : (
              <p className="smr-help" style={{ color: '#D6AD32' }}>
                Informe o nome do cliente no campo abaixo se ainda não estiver cadastrado
              </p>
            )}
          </div>

          {abaixoCliente ? <div>{abaixoCliente}</div> : null}

          <div className="smr-grid-2">
            <div>
              <Label required>Nome completo</Label>
              <input
                type="text"
                placeholder="Maria da Silva"
                className="input-glass w-full"
                value={formData.nome || ''}
                onChange={e => {
                  setCampo({ nome: e.target.value })
                  setFormErrors(p => ({
                    ...p,
                    nome: e.target.value.trim() ? undefined : 'Informe o nome completo',
                  }))
                }}
                style={errBorder(formErrors.nome)}
                spellCheck={true}
              />
              <Err>{formErrors.nome}</Err>
            </div>
            <div>
              <Label required>CPF</Label>
              <input
                type="text"
                placeholder="000.000.000-00"
                className="input-glass w-full"
                value={formData.cpf || ''}
                onChange={e => {
                  const v = mascaraCPF(e.target.value)
                  setCampo({ cpf: v })
                }}
                onBlur={e => {
                  const erros = validarFormularioSm(
                    { ...formData, cpf: e.target.value },
                    { rural: true },
                  )
                  setFormErrors(p => ({ ...p, cpf: erros.cpf }))
                }}
                style={errBorder(formErrors.cpf)}
                inputMode="numeric"
                spellCheck={false}
              />
              <Err>{formErrors.cpf}</Err>
            </div>
          </div>

          <div className="smr-grid-2">
            <div>
              <Label>RG</Label>
              <input
                type="text"
                placeholder="Opcional — omitido da peça se vazio"
                className="input-glass w-full"
                value={formData.rg || ''}
                onChange={e => setCampo({ rg: e.target.value })}
                spellCheck={false}
              />
            </div>
            <div>
              <Label required>Data de nascimento</Label>
              <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                className="input-glass w-full"
                value={formData.data_nascimento || ''}
                onChange={e => setCampo({ data_nascimento: e.target.value })}
                onBlur={e => {
                  const erros = validarFormularioSm(
                    { ...formData, data_nascimento: e.target.value },
                    { rural: true },
                  )
                  setFormErrors(p => ({ ...p, data_nascimento: erros.data_nascimento }))
                }}
                style={errBorder(formErrors.data_nascimento)}
              />
              <Err>{formErrors.data_nascimento}</Err>
            </div>
          </div>

          <div className="smr-grid-2">
            <div>
              <Label required>Estado civil</Label>
              <select
                className="input-glass w-full"
                value={formData.estado_civil || ''}
                onChange={e => {
                  const v = e.target.value
                  setCampo({ estado_civil: v })
                  setFormErrors(p => ({
                    ...p,
                    estado_civil: v ? undefined : 'Informe o estado civil',
                  }))
                }}
                style={errBorder(formErrors.estado_civil)}
              >
                <option value="" style={optStyle}>Selecione</option>
                {ESTADOS_CIVIS_SM.map(k => (
                  <option key={k} value={k} style={optStyle}>{LABELS_ESTADO_CIVIL[k]}</option>
                ))}
              </select>
              <Err>{formErrors.estado_civil}</Err>
            </div>
            <div>
              <Label required>Sexo da parte autora</Label>
              <select
                className="input-glass w-full"
                value={formData.sexo_parte_autora || ''}
                onChange={e => {
                  const v = e.target.value
                  const chave = chaveProfissao(
                    formData.profession || formData.profissao || formData.atividade || '',
                  )
                  const label = chave ? labelProfissao(chave, v) : ''
                  setFormData(p => ({
                    ...p,
                    sexo_parte_autora: v,
                    ...(label
                      ? {
                          atividade: label,
                          profession: label,
                          profissao: label,
                        }
                      : {
                          atividade: flexionarAtividadeTimeline(
                            p.atividade || p.profession || p.ocupacao || '',
                            v,
                          ),
                          profession: flexionarAtividadeTimeline(
                            p.profession || p.atividade || '',
                            v,
                          ),
                          profissao: flexionarAtividadeTimeline(
                            p.profissao || p.profession || p.atividade || '',
                            v,
                          ),
                        }),
                  }))
                  setFormErrors(p => ({
                    ...p,
                    sexo_parte_autora: v ? undefined : 'Informe o sexo da parte autora',
                  }))
                }}
                style={errBorder(formErrors.sexo_parte_autora)}
              >
                <option value="" style={optStyle}>Selecione</option>
                <option value="masculino" style={optStyle}>Masculino</option>
                <option value="feminino" style={optStyle}>Feminino</option>
              </select>
              {formErrors.sexo_parte_autora ? (
                <Err>{formErrors.sexo_parte_autora}</Err>
              ) : (
                <Help>
                  Define a concordância (agricultor/agricultora). Homem também pode requerer SM.
                </Help>
              )}
              {avisoSexo ? (
                <p className="smr-help" style={{ color: '#D6AD32' }}>{avisoSexo}</p>
              ) : null}
            </div>
          </div>

          <div>
            <Label required>Profissão / tipo de atividade</Label>
            <select
              className="input-glass w-full"
              value={profKey}
              onChange={e => {
                const chave = e.target.value
                const label = labelProfissao(chave, formData.sexo_parte_autora || 'feminino')
                setCampo({
                  profession: label,
                  profissao: label,
                  atividade: label,
                })
                setFormErrors(p => ({
                  ...p,
                  profissao: label ? undefined : 'Informe a profissão / tipo de atividade',
                }))
              }}
              style={errBorder(formErrors.profissao)}
            >
              <option value="" style={optStyle}>Selecione</option>
              <option value="agricultor" style={optStyle}>
                {formData.sexo_parte_autora === 'masculino' ? 'Agricultor' : 'Agricultora'}
              </option>
              <option value="pescador" style={optStyle}>
                {formData.sexo_parte_autora === 'masculino'
                  ? 'Pescador artesanal'
                  : 'Pescadora artesanal'}
              </option>
              <option value="extrativista" style={optStyle}>Extrativista</option>
            </select>
            <Err>{formErrors.profissao}</Err>
          </div>

          {/* Endereço */}
          <div className="smr-fields">
            <SubTitle>Endereço</SubTitle>
            <Help>
              Competência territorial do JEF pelo domicílio da autora — não use a cidade do escritório.
            </Help>

            <div className="smr-grid-2">
              <div>
                <Label>CEP</Label>
                <input
                  type="text"
                  placeholder="00000-000"
                  className="input-glass w-full"
                  value={formData.autor_cep || ''}
                  onChange={e => {
                    const v = mascaraCEP(e.target.value)
                    setCampo({ autor_cep: v })
                    if (v.replace(/\D/g, '').length === 8) void buscarCepAutor(v)
                  }}
                />
                {cepLoading && (
                  <p className="smr-help" style={{ color: '#D6AD32' }}>Buscando CEP…</p>
                )}
              </div>
              <div>
                <Label>Número</Label>
                <input
                  type="text"
                  placeholder="123 ou s/n"
                  className="input-glass w-full"
                  value={formData.autor_numero || ''}
                  onChange={e => atualizarEnderecoAutor({ autor_numero: e.target.value })}
                  spellCheck={true}
                />
              </div>
            </div>

            <div>
              <Label required>Logradouro</Label>
              <input
                type="text"
                placeholder="Rua, estrada, povoado…"
                className="input-glass w-full"
                value={formData.autor_logradouro || ''}
                onChange={e => {
                  atualizarEnderecoAutor({ autor_logradouro: e.target.value })
                  setFormErrors(p => ({
                    ...p,
                    autor_logradouro: e.target.value.trim()
                      ? undefined
                      : 'Informe o logradouro / endereço',
                  }))
                }}
                style={errBorder(formErrors.autor_logradouro)}
                spellCheck={true}
              />
              <Err>{formErrors.autor_logradouro}</Err>
            </div>

            <div className="smr-grid-2">
              <div>
                <Label>Bairro / comunidade / povoado</Label>
                <input
                  type="text"
                  placeholder="Comunidade, povoado ou bairro"
                  className="input-glass w-full"
                  value={formData.autor_bairro || ''}
                  onChange={e => atualizarEnderecoAutor({ autor_bairro: e.target.value })}
                  spellCheck={true}
                />
              </div>
              <div>
                <Label>Zona</Label>
                <select
                  className="input-glass w-full"
                  value={formData.autor_zona || 'rural'}
                  onChange={e => atualizarEnderecoAutor({ autor_zona: e.target.value })}
                >
                  <option value="rural" style={optStyle}>Rural</option>
                  <option value="urbana" style={optStyle}>Urbana</option>
                </select>
              </div>
            </div>

            <div className="smr-grid-2">
              <div>
                <Label required>Município</Label>
                <input
                  type="text"
                  placeholder="Lago da Pedra"
                  className="input-glass w-full"
                  value={formData.autor_municipio || ''}
                  onChange={e => {
                    atualizarEnderecoAutor({ autor_municipio: e.target.value })
                    setFormErrors(p => ({
                      ...p,
                      autor_municipio: e.target.value.trim()
                        ? undefined
                        : 'Informe o município',
                    }))
                  }}
                  style={errBorder(formErrors.autor_municipio)}
                  spellCheck={true}
                />
                <Err>{formErrors.autor_municipio}</Err>
              </div>
              <div>
                <Label required>UF</Label>
                <select
                  className="input-glass w-full"
                  value={formData.autor_uf || ''}
                  onChange={e => {
                    atualizarEnderecoAutor({ autor_uf: e.target.value })
                    setFormErrors(p => ({
                      ...p,
                      autor_uf: e.target.value ? undefined : 'Informe a UF',
                    }))
                  }}
                  style={errBorder(formErrors.autor_uf)}
                >
                  <option value="" style={optStyle}>Selecione</option>
                  {ESTADOS_BRASIL.map(e => (
                    <option key={e.sigla} value={e.sigla} style={optStyle}>
                      {e.sigla} — {e.nome}
                    </option>
                  ))}
                </select>
                <Err>{formErrors.autor_uf}</Err>
              </div>
            </div>

            <div>
              <Label required>Subseção judiciária competente</Label>
              <select
                className="input-glass w-full mb-2"
                value={
                  subsecaoManual
                    ? '__manual__'
                    : formData.subsecao_judiciaria &&
                        listarSubsecoesUf(formData.autor_uf || 'MA').includes(
                          formatarSubsecaoUf(
                            formData.subsecao_judiciaria,
                            formData.autor_uf || 'MA',
                          ),
                        )
                      ? formatarSubsecaoUf(
                          formData.subsecao_judiciaria,
                          formData.autor_uf || 'MA',
                        )
                      : formData.subsecao_judiciaria
                        ? '__manual__'
                        : ''
                }
                onChange={e => {
                  const v = e.target.value
                  if (v === '__manual__') {
                    setSubsecaoManual(true)
                    return
                  }
                  setSubsecaoManual(false)
                  setFormData(p => {
                    const next: Record<string, string> = {
                      ...p,
                      subsecao_judiciaria: v,
                    }
                    next.endereco = formatarEnderecoAutorPeticao(next)
                    return next
                  })
                  setFormErrors(p => ({
                    ...p,
                    subsecao_judiciaria: v
                      ? undefined
                      : 'Informe a subseção judiciária competente para este município.',
                  }))
                }}
                style={errBorder(formErrors.subsecao_judiciaria)}
              >
                <option value="" style={optStyle}>Selecione</option>
                {listarSubsecoesUf(formData.autor_uf || 'MA').map(s => (
                  <option key={s} value={s} style={optStyle}>{s}</option>
                ))}
                <option value="__manual__" style={optStyle}>Outra (digitar)</option>
              </select>
              {(subsecaoManual ||
                !buscarSubsecao(
                  formData.autor_municipio || '',
                  formData.autor_uf || '',
                )) && (
                <input
                  type="text"
                  placeholder="Ex.: Bacabal/MA"
                  className="input-glass w-full"
                  value={formData.subsecao_judiciaria || ''}
                  onChange={e => {
                    const v = e.target.value
                    setSubsecaoManual(true)
                    setCampo({ subsecao_judiciaria: v })
                    setFormErrors(p => ({
                      ...p,
                      subsecao_judiciaria: v.trim()
                        ? undefined
                        : 'Informe a subseção judiciária competente para este município.',
                    }))
                  }}
                  style={errBorder(formErrors.subsecao_judiciaria)}
                  spellCheck={true}
                />
              )}
              {formErrors.subsecao_judiciaria ? (
                <Err>{formErrors.subsecao_judiciaria}</Err>
              ) : (
                <Help>Definida pelo domicílio da parte autora. Confira antes de gerar.</Help>
              )}
            </div>
          </div>

          {/* Atividade rural */}
          <div className="smr-fields">
            <SubTitle>Atividade rural</SubTitle>
            <div>
              <Label required>Período de atividade rural</Label>
              <input
                type="text"
                placeholder="Ex.: 01/2018 até atualmente"
                className="input-glass w-full"
                value={formData.periodo_segurado || ''}
                onChange={e => setCampo({ periodo_segurado: e.target.value })}
                onBlur={e => {
                  const msg = validarPeriodoSegurado(e.target.value)
                  setFormErrors(p => ({ ...p, periodo_segurado: msg || undefined }))
                }}
                style={errBorder(formErrors.periodo_segurado)}
                spellCheck={true}
              />
              <Err>{formErrors.periodo_segurado}</Err>
            </div>
            <div className="smr-grid-2">
              <div>
                <Label>Tempo de trabalho antes do parto</Label>
                <input
                  type="text"
                  placeholder="Ex.: 3 anos antes do parto"
                  className="input-glass w-full"
                  value={formData.tempo_trabalho_parto || ''}
                  onChange={e => setCampo({ tempo_trabalho_parto: e.target.value })}
                  spellCheck={true}
                />
              </div>
              <div>
                <Label>Período de segurado especial</Label>
                <input
                  type="text"
                  placeholder="Ex.: 01/2018 a 12/2025"
                  className="input-glass w-full"
                  value={formData.periodo_segurado_especial || ''}
                  onChange={e => setCampo({ periodo_segurado_especial: e.target.value })}
                  spellCheck={true}
                />
              </div>
            </div>
            <div className="smr-grid-2">
              <div>
                <Label>Forma de exercício</Label>
                <input
                  type="text"
                  placeholder="Ex.: regime de economia familiar"
                  className="input-glass w-full"
                  value={formData.forma_exercicio || ''}
                  onChange={e => setCampo({ forma_exercicio: e.target.value })}
                  spellCheck={true}
                />
              </div>
              <div>
                <Label>Local onde exercia a atividade</Label>
                <input
                  type="text"
                  placeholder="Ex.: sítio da família no povoado X"
                  className="input-glass w-full"
                  value={formData.local_atividade || ''}
                  onChange={e => setCampo({ local_atividade: e.target.value })}
                  spellCheck={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ——— BLOCO 2: FILHO ——— */}
      <div className="smr-card">
        <CardTitle>Informações do filho</CardTitle>
        <div className="smr-fields">
          <div className="smr-grid-2">
            <div>
              <Label required>Nome completo</Label>
              <input
                type="text"
                placeholder="João da Silva"
                className="input-glass w-full"
                value={formData.nome_crianca || ''}
                onChange={e => setCampo({ nome_crianca: e.target.value })}
                onBlur={e => {
                  const msg = validarNomeCrianca(e.target.value)
                  setFormErrors(p => ({ ...p, nome_crianca: msg || undefined }))
                }}
                style={errBorder(formErrors.nome_crianca)}
                spellCheck={true}
              />
              <Err>{formErrors.nome_crianca}</Err>
            </div>
            <div>
              <Label required>Data de nascimento</Label>
              <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                className="input-glass w-full"
                value={formData.data_nascimento_crianca || ''}
                onChange={e => setCampo({ data_nascimento_crianca: e.target.value })}
                onBlur={e => {
                  const erros = validarFormularioSm(
                    { ...formData, data_nascimento_crianca: e.target.value },
                    { rural: true },
                  )
                  setFormErrors(p => ({
                    ...p,
                    data_nascimento_crianca: erros.data_nascimento_crianca,
                    data_requerimento: erros.data_requerimento,
                    sexo_parte_autora: erros.sexo_parte_autora,
                  }))
                }}
                style={errBorder(formErrors.data_nascimento_crianca)}
              />
              <Err>{formErrors.data_nascimento_crianca}</Err>
            </div>
          </div>
          <div className="smr-grid-2">
            <div>
              <Label>CPF da criança</Label>
              <input
                type="text"
                placeholder="000.000.000-00 (opcional)"
                className="input-glass w-full"
                value={formData.cpf_crianca || ''}
                onChange={e => setCampo({ cpf_crianca: mascaraCPF(e.target.value) })}
                onBlur={e => {
                  const erros = validarFormularioSm(
                    { ...formData, cpf_crianca: e.target.value },
                    { rural: true },
                  )
                  setFormErrors(p => ({ ...p, cpf_crianca: erros.cpf_crianca }))
                }}
                style={errBorder(formErrors.cpf_crianca)}
                inputMode="numeric"
                spellCheck={false}
              />
              <Err>{formErrors.cpf_crianca}</Err>
            </div>
            <div>
              <Label>Sexo da criança</Label>
              <select
                className="input-glass w-full"
                value={formData.sexo_crianca || ''}
                onChange={e => setCampo({ sexo_crianca: e.target.value })}
              >
                <option value="" style={optStyle}>Não informado</option>
                <option value="masculino" style={optStyle}>Masculino</option>
                <option value="feminino" style={optStyle}>Feminino</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ——— BLOCO 3: PROCESSO ——— */}
      <div className="smr-card">
        <CardTitle>Informações do processo</CardTitle>
        <div className="smr-fields">
          <div className="smr-grid-2">
            <div>
              <Label>NB (número do benefício)</Label>
              <input
                type="text"
                placeholder="232.919.244-9"
                className="input-glass w-full"
                value={formData.nb || ''}
                onChange={e => {
                  const v = e.target.value.replace(/[^\d.\-]/g, '')
                  setCampo({ nb: v })
                }}
                onBlur={e => {
                  const msg = validarNb(e.target.value)
                  setFormErrors(p => ({ ...p, nb: msg || undefined }))
                }}
                style={errBorder(formErrors.nb)}
                inputMode="numeric"
                spellCheck={false}
              />
              <Err>{formErrors.nb}</Err>
            </div>
            <div>
              <Label required>Motivo do indeferimento INSS</Label>
              <input
                type="text"
                placeholder="Ex: Falta de período de carência"
                className="input-glass w-full"
                value={formData.motivo_inss || ''}
                onChange={e => setCampo({ motivo_inss: e.target.value })}
                spellCheck={true}
              />
            </div>
          </div>

          <div className="smr-grid-2">
            <div>
              <Label required>Data do requerimento</Label>
              <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                className="input-glass w-full"
                value={formData.data_requerimento || ''}
                onChange={e => setCampo({ data_requerimento: e.target.value })}
                onBlur={e => {
                  const erros = validarFormularioSm(
                    { ...formData, data_requerimento: e.target.value },
                    { rural: true },
                  )
                  setFormErrors(p => ({
                    ...p,
                    data_requerimento: erros.data_requerimento,
                    data_indeferimento: erros.data_indeferimento,
                  }))
                }}
                style={errBorder(formErrors.data_requerimento)}
              />
              <Err>{formErrors.data_requerimento}</Err>
            </div>
            <div>
              <Label required>Data do indeferimento</Label>
              <input
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                className="input-glass w-full"
                value={formData.data_indeferimento || ''}
                onChange={e => setCampo({ data_indeferimento: e.target.value })}
                onBlur={e => {
                  const erros = validarFormularioSm(
                    { ...formData, data_indeferimento: e.target.value },
                    { rural: true },
                  )
                  setFormErrors(p => ({
                    ...p,
                    data_requerimento: erros.data_requerimento,
                    data_indeferimento: erros.data_indeferimento,
                  }))
                }}
                style={errBorder(formErrors.data_indeferimento)}
              />
              <Err>{formErrors.data_indeferimento}</Err>
            </div>
          </div>

          {avisoPrescricaoQuinquenal(formData.data_indeferimento || '') ? (
            <div
              className="rounded-lg px-3 py-2 text-[12px] leading-snug"
              style={{
                background: 'rgba(214,173,50,0.12)',
                border: '1px solid rgba(214,173,50,0.45)',
                color: '#D6AD32',
              }}
              role="alert"
            >
              {avisoPrescricaoQuinquenal(formData.data_indeferimento || '')}
            </div>
          ) : null}

          <div className="smr-fields">
            <SubTitle>Provas</SubTitle>
            <div>
              <div className="smr-provas-cabecalho">
                <Label>Provas disponíveis</Label>
                <button
                  type="button"
                  className="smr-provas-restaurar"
                  onClick={restaurarProvasPadrao}
                >
                  Restaurar padrão
                </button>
              </div>
              <div className="smr-provas-box">
                {itensProva.map(item => {
                  const checked = marcadosProva.includes(item.id)
                  const editing = editandoId === item.id
                  const edited =
                    !item.custom &&
                    item.padrao !== undefined &&
                    item.texto !== item.padrao
                  return (
                    <div
                      key={item.id}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={editing ? -1 : 0}
                      className="smr-prova-item"
                      data-checked={checked ? 'true' : 'false'}
                      data-editing={editing ? 'true' : 'false'}
                      data-edited={edited ? 'true' : 'false'}
                      onClick={() => toggleProva(item.id)}
                      onKeyDown={e => {
                        if (editing) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleProva(item.id)
                        }
                      }}
                    >
                      <div className="smr-check" aria-hidden>
                        {checked ? <span className="smr-check-mark">✓</span> : null}
                      </div>
                      {editing ? (
                        <input
                          ref={editInputRef}
                          className="smr-prova-input"
                          value={editDraft}
                          placeholder="Nome do documento — o que ele comprova"
                          onClick={e => e.stopPropagation()}
                          onChange={e => setEditDraft(e.target.value)}
                          onBlur={() => {
                            if (ignorarBlurRef.current) {
                              ignorarBlurRef.current = false
                              return
                            }
                            salvarEdicao(false)
                          }}
                          onKeyDown={e => {
                            e.stopPropagation()
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              ignorarBlurRef.current = true
                              // Fluxo "+ Adicionar": Enter salva e abre outra linha.
                              const sequencia = item.custom && !editOriginal.trim()
                              salvarEdicao(sequencia)
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              ignorarBlurRef.current = true
                              cancelarEdicao()
                            }
                          }}
                          spellCheck={true}
                          aria-label="Editar prova"
                        />
                      ) : (
                        <span className="smr-prova-texto">{item.texto}</span>
                      )}
                      {edited ? (
                        <span className="smr-prova-editado" title="Texto editado" aria-hidden />
                      ) : null}
                      {item.custom ? (
                        <button
                          type="button"
                          className="smr-prova-acao smr-prova-lixeira"
                          aria-label="Remover prova"
                          title="Remover"
                          onClick={e => {
                            e.stopPropagation()
                            removerProvaCustom(item.id)
                          }}
                        >
                          <Trash2 size={15} strokeWidth={1.75} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="smr-prova-acao smr-prova-lapis"
                        aria-label="Editar prova"
                        title="Editar"
                        onClick={e => {
                          e.stopPropagation()
                          if (editing) return
                          iniciarEdicao(item)
                        }}
                      >
                        <Pencil size={15} strokeWidth={1.75} />
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  className="smr-prova-adicionar"
                  onClick={adicionarProva}
                >
                  + Adicionar prova
                </button>
              </div>
            </div>
          </div>

          <div className="smr-fields">
            <SubTitle>Complementos</SubTitle>
            <div>
              <Label>Observações sobre o cliente</Label>
              <Help>Fica salvo na ficha do cliente e não entra na petição. Útil para quem for atender depois.</Help>
              <textarea
                placeholder="Ex.: telefone do filho para recado, ponto de referência da casa, prefere ser contatado à tarde."
                className="input-glass w-full"
                style={{ height: 88, resize: 'none', marginTop: 6 }}
                value={observacoesCliente}
                onChange={e => setObservacoesCliente(e.target.value)}
                spellCheck={true}
              />
            </div>

            <div>
              <Label>Histórico e contexto do caso</Label>
              <Help>A IA usa estas informações para escrever a petição. Quanto mais detalhe, mais a peça reflete a realidade do cliente.</Help>
              <textarea
                placeholder="Ex.: trabalha na roça com os pais desde criança, nunca teve carteira assinada, o INSS negou dizendo que faltava comprovação."
                className="input-glass w-full"
                style={{ height: 100, resize: 'none', marginTop: 6 }}
                value={contexto}
                onChange={e => setContexto(e.target.value)}
                spellCheck={true}
              />
            </div>

            <div>
              <Label>Instruções para a petição</Label>
              <Help>Orientações específicas que você quer que a IA siga ao redigir.</Help>
              <textarea
                placeholder="Ex.: destacar que os documentos rurais estão no nome do pai e explicar que ela faz parte do mesmo núcleo familiar."
                className="input-glass w-full"
                style={{ height: 80, resize: 'none', marginTop: 6 }}
                value={formData.extras || ''}
                onChange={e => setCampo({ extras: e.target.value })}
                spellCheck={true}
              />
            </div>

            <div>
              <Label>Anexar documentos / imagens de prova</Label>
              <label
                className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-[10px] transition-all"
                style={{
                  border: '1px dashed #393521',
                  display: 'inline-flex',
                  background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <Upload size={14} color="#D6AD32" />
                <span className="text-[14px]" style={{ color: '#D6AD32' }}>Selecionar imagens</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImagemUpload}
                />
              </label>
              {imagensPreview.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {imagensPreview.map((src, i) => (
                    <div key={i} className="relative">
                      <img
                        src={src}
                        alt={`prova-${i}`}
                        className="w-16 h-16 object-cover rounded-lg"
                        style={{ border: '1px solid #393521' }}
                      />
                      <button
                        onClick={() => removerImagem(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                        style={{ background: '#EF4444', color: '#fff' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="smr-fields">
              <div>
                <Label>Estilo de formatação</Label>
                <div className="smr-grid-2">
                  {([
                    { id: 'moderno' as const, label: 'Moderno', desc: 'Barras coloridas' },
                    { id: 'classico' as const, label: 'Clássico/Sóbrio', desc: 'Preto · negrito · sublinhado' },
                  ]).map(op => {
                    const ativo = estiloPeticao === op.id
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setEstiloPeticao(op.id)}
                        className="text-left px-3 py-2.5 rounded-[10px] transition-all"
                        style={{
                          background: ativo
                            ? 'rgba(214,173,50,0.12)'
                            : isLight
                              ? '#F8F8F8'
                              : '#222117',
                          border: ativo
                            ? '1px solid #D6AD32'
                            : `1px solid ${isLight ? '#E5E1D4' : '#393521'}`,
                        }}
                      >
                        <div
                          className="text-[14px] font-semibold"
                          style={{ color: ativo ? '#D6AD32' : (isLight ? '#1E1E1E' : '#F5F3EA') }}
                        >
                          {op.label}
                        </div>
                        <div className="text-[12px] mt-0.5" style={{ color: '#A6A18F' }}>
                          {op.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              {estiloPeticao === 'moderno' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Label>Cor da barra</Label>
                  <input
                    type="color"
                    value={corPeticao}
                    onChange={e => setCorPeticao(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer"
                    style={{ border: '1px solid #393521', background: 'transparent' }}
                  />
                  <div className="flex items-center gap-1">
                    {['#1d4ed8', '#D6AD32', '#16a34a', '#dc2626', '#7c3aed', '#000000'].map(cor => (
                      <button
                        key={cor}
                        onClick={() => setCorPeticao(cor)}
                        className="w-5 h-5 rounded-full transition-all hover:scale-110"
                        style={{
                          background: cor,
                          border:
                            corPeticao === cor
                              ? `2px solid ${isLight ? '#1E1E1E' : '#F5F3EA'}`
                              : '2px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    className="flex-1 h-6 rounded min-w-[80px]"
                    style={{ background: `linear-gradient(135deg, ${corPeticao}, ${corPeticao}dd)` }}
                  >
                    <span className="text-white text-[9px] font-bold px-2 leading-6 inline-block">
                      PRÉVIA
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
