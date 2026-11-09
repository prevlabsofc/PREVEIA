'use client'

/**
 * Formulário SM rural em 3 blocos (mesmo formulário / mesmas chaves de payload).
 * Estilo visual: caixas dourado/escuro do padrão atual.
 */

import type { Dispatch, SetStateAction } from 'react'
import { Upload } from 'lucide-react'
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

const LABEL = { color: 'rgba(212,175,55,0.7)' as const }
const LABEL_TITLE = { color: 'rgba(212,175,55,0.85)' as const }

function caixaBloco(isLight: boolean) {
  return {
    border: isLight ? '1px solid #E5E7EB' : '1px solid rgba(212,175,55,0.2)',
    background: isLight ? '#FAFAFA' : 'rgba(212,175,55,0.04)',
  } as const
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
}: FormularioSmRuralProps) {
  const avisoSexo = avisoNomeSexoIncompativel(
    formData.nome || '',
    formData.sexo_parte_autora || '',
  )
  const profKey = chaveProfissao(
    formData.profession || formData.profissao || formData.atividade || '',
  )

  function setCampo(patch: Record<string, string>) {
    setFormData(p => ({ ...p, ...patch }))
  }

  return (
    <div className="space-y-4">
      {/* ——— BLOCO 1: MÃE / PARTE AUTORA ——— */}
      <div className="rounded-xl p-3 space-y-3" style={caixaBloco(isLight)}>
        <div className="text-[10px] font-bold tracking-widest" style={LABEL_TITLE}>
          1. INFORMAÇÕES DA MÃE / PARTE AUTORA
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              NOME COMPLETO*
            </label>
            <input
              type="text"
              placeholder="Maria da Silva"
              className="input-glass w-full text-sm"
              value={formData.nome || ''}
              onChange={e => {
                setCampo({ nome: e.target.value })
                setFormErrors(p => ({
                  ...p,
                  nome: e.target.value.trim() ? undefined : 'Informe o nome completo',
                }))
              }}
              style={formErrors.nome ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              spellCheck={true}
            />
            {formErrors.nome ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.nome}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              CPF*
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              className="input-glass w-full text-sm"
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
              style={formErrors.cpf ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              inputMode="numeric"
              spellCheck={false}
            />
            {formErrors.cpf ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.cpf}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              RG
            </label>
            <input
              type="text"
              placeholder="Opcional — omitido da peça se vazio"
              className="input-glass w-full text-sm"
              value={formData.rg || ''}
              onChange={e => setCampo({ rg: e.target.value })}
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              DATA DE NASCIMENTO*
            </label>
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              className="input-glass w-full text-sm"
              value={formData.data_nascimento || ''}
              onChange={e => setCampo({ data_nascimento: e.target.value })}
              onBlur={e => {
                const erros = validarFormularioSm(
                  { ...formData, data_nascimento: e.target.value },
                  { rural: true },
                )
                setFormErrors(p => ({ ...p, data_nascimento: erros.data_nascimento }))
              }}
              style={formErrors.data_nascimento ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            />
            {formErrors.data_nascimento ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_nascimento}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              ESTADO CIVIL*
            </label>
            <select
              className="input-glass w-full text-sm"
              value={formData.estado_civil || ''}
              onChange={e => {
                const v = e.target.value
                setCampo({ estado_civil: v })
                setFormErrors(p => ({
                  ...p,
                  estado_civil: v ? undefined : 'Informe o estado civil',
                }))
              }}
              style={formErrors.estado_civil ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            >
              <option value="">Selecione</option>
              {ESTADOS_CIVIS_SM.map(k => (
                <option key={k} value={k}>{LABELS_ESTADO_CIVIL[k]}</option>
              ))}
            </select>
            {formErrors.estado_civil ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.estado_civil}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              SEXO DA PARTE AUTORA*
            </label>
            <select
              className="input-glass w-full text-sm"
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
              style={formErrors.sexo_parte_autora ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
            {formErrors.sexo_parte_autora ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.sexo_parte_autora}</p>
            ) : (
              <p className="text-[10px] mt-1" style={{ color: '#666' }}>
                Define a concordância (agricultor/agricultora). Homem também pode requerer SM.
              </p>
            )}
            {avisoSexo ? (
              <p className="text-[10px] mt-1" style={{ color: '#CA8A04' }}>{avisoSexo}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
            PROFISSÃO / TIPO DE ATIVIDADE*
          </label>
          <select
            className="input-glass w-full text-sm"
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
            style={formErrors.profissao ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
          >
            <option value="">Selecione</option>
            <option value="agricultor">
              {formData.sexo_parte_autora === 'masculino' ? 'Agricultor' : 'Agricultora'}
            </option>
            <option value="pescador">
              {formData.sexo_parte_autora === 'masculino'
                ? 'Pescador artesanal'
                : 'Pescadora artesanal'}
            </option>
            <option value="extrativista">Extrativista</option>
          </select>
          {formErrors.profissao ? (
            <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.profissao}</p>
          ) : null}
        </div>

        {/* Endereço */}
        <div className="space-y-3 pt-1">
          <label className="block text-[10px] font-bold tracking-widest" style={LABEL}>
            ENDEREÇO DA PARTE AUTORA
          </label>
          <p className="text-[10px]" style={{ color: '#888' }}>
            Competência territorial do JEF pelo domicílio da autora — não use a cidade do escritório.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                CEP
              </label>
              <input
                type="text"
                placeholder="00000-000"
                className="input-glass w-full text-sm"
                value={formData.autor_cep || ''}
                onChange={e => {
                  const v = mascaraCEP(e.target.value)
                  setCampo({ autor_cep: v })
                  if (v.replace(/\D/g, '').length === 8) void buscarCepAutor(v)
                }}
              />
              {cepLoading && (
                <p className="text-[10px] mt-1" style={{ color: '#D4AF37' }}>Buscando CEP…</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                NÚMERO
              </label>
              <input
                type="text"
                placeholder="123 ou s/n"
                className="input-glass w-full text-sm"
                value={formData.autor_numero || ''}
                onChange={e => atualizarEnderecoAutor({ autor_numero: e.target.value })}
                spellCheck={true}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              LOGRADOURO*
            </label>
            <input
              type="text"
              placeholder="Rua, estrada, povoado…"
              className="input-glass w-full text-sm"
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
              style={formErrors.autor_logradouro ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              spellCheck={true}
            />
            {formErrors.autor_logradouro ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.autor_logradouro}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                BAIRRO / COMUNIDADE / POVOADO
              </label>
              <input
                type="text"
                placeholder="Comunidade, povoado ou bairro"
                className="input-glass w-full text-sm"
                value={formData.autor_bairro || ''}
                onChange={e => atualizarEnderecoAutor({ autor_bairro: e.target.value })}
                spellCheck={true}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                ZONA
              </label>
              <select
                className="input-glass w-full text-sm"
                value={formData.autor_zona || 'rural'}
                onChange={e => atualizarEnderecoAutor({ autor_zona: e.target.value })}
              >
                <option value="rural">Rural</option>
                <option value="urbana">Urbana</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                MUNICÍPIO*
              </label>
              <input
                type="text"
                placeholder="Lago da Pedra"
                className="input-glass w-full text-sm"
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
                style={formErrors.autor_municipio ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                spellCheck={true}
              />
              {formErrors.autor_municipio ? (
                <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.autor_municipio}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                UF*
              </label>
              <select
                className="input-glass w-full text-sm"
                value={formData.autor_uf || ''}
                onChange={e => {
                  atualizarEnderecoAutor({ autor_uf: e.target.value })
                  setFormErrors(p => ({
                    ...p,
                    autor_uf: e.target.value ? undefined : 'Informe a UF',
                  }))
                }}
                style={formErrors.autor_uf ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              >
                <option value="">Selecione</option>
                {ESTADOS_BRASIL.map(e => (
                  <option key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</option>
                ))}
              </select>
              {formErrors.autor_uf ? (
                <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.autor_uf}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              SUBSEÇÃO JUDICIÁRIA COMPETENTE*
            </label>
            <select
              className="input-glass w-full text-sm mb-2"
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
              style={formErrors.subsecao_judiciaria ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            >
              <option value="">Selecione</option>
              {listarSubsecoesUf(formData.autor_uf || 'MA').map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__manual__">Outra (digitar)</option>
            </select>
            {(subsecaoManual ||
              !buscarSubsecao(
                formData.autor_municipio || '',
                formData.autor_uf || '',
              )) && (
              <input
                type="text"
                placeholder="Ex.: Bacabal/MA"
                className="input-glass w-full text-sm"
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
                style={formErrors.subsecao_judiciaria ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
                spellCheck={true}
              />
            )}
            {formErrors.subsecao_judiciaria ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.subsecao_judiciaria}</p>
            ) : (
              <p className="text-[10px] mt-1" style={{ color: '#666' }}>
                Definida pelo domicílio da parte autora. Confira antes de gerar.
              </p>
            )}
          </div>
        </div>

        {/* Atividade rural */}
        <div className="space-y-3 pt-1">
          <div className="text-[10px] font-bold tracking-widest" style={LABEL_TITLE}>
            ATIVIDADE RURAL
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              PERÍODO DE ATIVIDADE RURAL*
            </label>
            <input
              type="text"
              placeholder="Ex.: 01/2018 até atualmente"
              className="input-glass w-full text-sm"
              value={formData.periodo_segurado || ''}
              onChange={e => setCampo({ periodo_segurado: e.target.value })}
              onBlur={e => {
                const msg = validarPeriodoSegurado(e.target.value)
                setFormErrors(p => ({ ...p, periodo_segurado: msg || undefined }))
              }}
              style={formErrors.periodo_segurado ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              spellCheck={true}
            />
            {formErrors.periodo_segurado ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.periodo_segurado}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                TEMPO DE TRABALHO ANTES DO PARTO
              </label>
              <input
                type="text"
                placeholder="Ex.: 3 anos antes do parto"
                className="input-glass w-full text-sm"
                value={formData.tempo_trabalho_parto || ''}
                onChange={e => setCampo({ tempo_trabalho_parto: e.target.value })}
                spellCheck={true}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
                FORMA DE EXERCÍCIO DA ATIVIDADE
              </label>
              <input
                type="text"
                placeholder="Ex.: regime de economia familiar"
                className="input-glass w-full text-sm"
                value={formData.forma_exercicio || ''}
                onChange={e => setCampo({ forma_exercicio: e.target.value })}
                spellCheck={true}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              LOCAL ONDE EXERCIA A ATIVIDADE
            </label>
            <input
              type="text"
              placeholder="Ex.: sítio da família no povoado X"
              className="input-glass w-full text-sm"
              value={formData.local_atividade || ''}
              onChange={e => setCampo({ local_atividade: e.target.value })}
              spellCheck={true}
            />
          </div>
        </div>
      </div>

      {/* ——— BLOCO 2: FILHO / CRIANÇA ——— */}
      <div className="rounded-xl p-3 space-y-3" style={caixaBloco(isLight)}>
        <div className="text-[10px] font-bold tracking-widest" style={LABEL_TITLE}>
          2. INFORMAÇÕES DO FILHO / DA CRIANÇA
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              NOME COMPLETO*
            </label>
            <input
              type="text"
              placeholder="João da Silva"
              className="input-glass w-full text-sm"
              value={formData.nome_crianca || ''}
              onChange={e => setCampo({ nome_crianca: e.target.value })}
              onBlur={e => {
                const msg = validarNomeCrianca(e.target.value)
                setFormErrors(p => ({ ...p, nome_crianca: msg || undefined }))
              }}
              style={formErrors.nome_crianca ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              spellCheck={true}
            />
            {formErrors.nome_crianca ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.nome_crianca}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              CPF DA CRIANÇA
            </label>
            <input
              type="text"
              placeholder="000.000.000-00 (opcional)"
              className="input-glass w-full text-sm"
              value={formData.cpf_crianca || ''}
              onChange={e => setCampo({ cpf_crianca: mascaraCPF(e.target.value) })}
              onBlur={e => {
                const erros = validarFormularioSm(
                  { ...formData, cpf_crianca: e.target.value },
                  { rural: true },
                )
                setFormErrors(p => ({ ...p, cpf_crianca: erros.cpf_crianca }))
              }}
              style={formErrors.cpf_crianca ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              inputMode="numeric"
              spellCheck={false}
            />
            {formErrors.cpf_crianca ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.cpf_crianca}</p>
            ) : null}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              DATA DE NASCIMENTO*
            </label>
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              className="input-glass w-full text-sm"
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
              style={formErrors.data_nascimento_crianca ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            />
            {formErrors.data_nascimento_crianca ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_nascimento_crianca}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              SEXO
            </label>
            <select
              className="input-glass w-full text-sm"
              value={formData.sexo_crianca || ''}
              onChange={e => setCampo({ sexo_crianca: e.target.value })}
            >
              <option value="">Não informado</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </div>
        </div>
      </div>

      {/* ——— BLOCO 3: CASO ——— */}
      <div className="rounded-xl p-3 space-y-3" style={caixaBloco(isLight)}>
        <div className="text-[10px] font-bold tracking-widest" style={LABEL_TITLE}>
          3. INFORMAÇÕES DO CASO
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              NB (NÚMERO DO BENEFÍCIO)
            </label>
            <input
              type="text"
              placeholder="232.919.244-9"
              className="input-glass w-full text-sm"
              value={formData.nb || ''}
              onChange={e => {
                const v = e.target.value.replace(/[^\d.\-]/g, '')
                setCampo({ nb: v })
              }}
              onBlur={e => {
                const msg = validarNb(e.target.value)
                setFormErrors(p => ({ ...p, nb: msg || undefined }))
              }}
              style={formErrors.nb ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
              inputMode="numeric"
              spellCheck={false}
            />
            {formErrors.nb ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.nb}</p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              DATA DO REQUERIMENTO*
            </label>
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              className="input-glass w-full text-sm"
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
              style={formErrors.data_requerimento ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            />
            {formErrors.data_requerimento ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_requerimento}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
              DATA DO INDEFERIMENTO*
            </label>
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              className="input-glass w-full text-sm"
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
              style={formErrors.data_indeferimento ? { borderColor: '#ef4444', borderWidth: 1 } : undefined}
            />
            {formErrors.data_indeferimento ? (
              <p className="text-[10px] mt-1" style={{ color: '#ef4444' }}>{formErrors.data_indeferimento}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
            MOTIVO DO INDEFERIMENTO INSS*
          </label>
          <input
            type="text"
            placeholder="Ex: Falta de período de carência"
            className="input-glass w-full text-sm"
            value={formData.motivo_inss || ''}
            onChange={e => setCampo({ motivo_inss: e.target.value })}
            spellCheck={true}
          />
        </div>
        {avisoPrescricaoQuinquenal(formData.data_indeferimento || '') ? (
          <div
            className="rounded-lg px-3 py-2 text-[11px] leading-snug"
            style={{
              background: 'rgba(234,179,8,0.15)',
              border: '1px solid rgba(234,179,8,0.55)',
              color: '#CA8A04',
            }}
            role="alert"
          >
            {avisoPrescricaoQuinquenal(formData.data_indeferimento || '')}
          </div>
        ) : null}

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-2" style={LABEL}>
            PROVAS DISPONÍVEIS
          </label>
          <div className="space-y-2">
            {provasOpcoes.map(prova => (
              <label key={prova} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() =>
                    setProvas(p =>
                      p.includes(prova) ? p.filter(x => x !== prova) : [...p, prova],
                    )
                  }
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: provas.includes(prova) ? '#D4AF37' : 'transparent',
                    border: `1px solid ${
                      provas.includes(prova)
                        ? '#D4AF37'
                        : isLight
                          ? '#D1D5DB'
                          : 'rgba(255,255,255,0.15)'
                    }`,
                  }}
                >
                  {provas.includes(prova) && (
                    <span className="text-black text-[9px] font-black">✓</span>
                  )}
                </div>
                <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  {prova}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
            OUTRAS PROVAS / DOCUMENTOS
          </label>
          <textarea
            placeholder="Documentos adicionais não listados acima…"
            className="input-glass w-full text-sm"
            style={{ height: 72, resize: 'none' }}
            value={formData.outras_provas || ''}
            onChange={e => setCampo({ outras_provas: e.target.value })}
            spellCheck={true}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
            CONTEXTO ADICIONAL / OBSERVAÇÕES
          </label>
          <textarea
            placeholder="Descreva detalhes do caso, contexto da cliente, informações relevantes..."
            className="input-glass w-full text-sm"
            style={{ height: 100, resize: 'none' }}
            value={contexto}
            onChange={e => setContexto(e.target.value)}
            spellCheck={true}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-1.5" style={LABEL}>
            ✨ O QUE MAIS VOCÊ QUER NA PETIÇÃO?
          </label>
          <textarea
            placeholder="Ex: Incluir pedido de tutela de urgência, citar ADI 2110…"
            className="input-glass w-full text-sm"
            style={{ height: 80, resize: 'none' }}
            value={formData.extras || ''}
            onChange={e => setCampo({ extras: e.target.value })}
            spellCheck={true}
          />
          <p className={`text-[10px] mt-1 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>
            A IA vai incluir essas instruções específicas na petição
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-widest mb-2" style={LABEL}>
            📎 ANEXAR DOCUMENTOS / IMAGENS DE PROVA
          </label>
          <label
            className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl transition-all hover:bg-white/5"
            style={{ border: '1px dashed rgba(212,175,55,0.3)', display: 'inline-flex' }}
          >
            <Upload size={14} color="#D4AF37" />
            <span className="text-xs" style={{ color: '#D4AF37' }}>Selecionar imagens</span>
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
                    style={{ border: '1px solid rgba(212,175,55,0.3)' }}
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

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold tracking-widest mb-2" style={LABEL}>
              ESTILO DE FORMATAÇÃO
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                    className="text-left px-3 py-2.5 rounded-xl transition-all"
                    style={{
                      background: ativo
                        ? 'rgba(212,175,55,0.12)'
                        : isLight
                          ? '#F8F8F8'
                          : 'rgba(255,255,255,0.02)',
                      border: ativo
                        ? '1px solid rgba(212,175,55,0.4)'
                        : isLight
                          ? '1px solid #EDEDED'
                          : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className={`text-xs font-bold ${
                        ativo ? 'text-[#D4AF37]' : isLight ? 'text-gray-900' : 'text-gray-300'
                      }`}
                    >
                      {op.label}
                    </div>
                    <div
                      className={`text-[10px] mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}
                    >
                      {op.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {estiloPeticao === 'moderno' && (
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold tracking-widest" style={LABEL}>
                COR DA BARRA
              </label>
              <input
                type="color"
                value={corPeticao}
                onChange={e => setCorPeticao(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'transparent' }}
              />
              <div className="flex items-center gap-1">
                {['#1d4ed8', '#D4AF37', '#16a34a', '#dc2626', '#7c3aed', '#000000'].map(cor => (
                  <button
                    key={cor}
                    onClick={() => setCorPeticao(cor)}
                    className="w-5 h-5 rounded-full transition-all hover:scale-110"
                    style={{
                      background: cor,
                      border:
                        corPeticao === cor
                          ? `2px solid ${isLight ? '#1E1E1E' : '#fff'}`
                          : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
              <div
                className="flex-1 h-6 rounded"
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
  )
}
