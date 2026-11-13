/**
 * Substituição direta de dados do caso no texto da petição (sem regerar com IA).
 * Preserva edições manuais: só troca ocorrências do valor antigo → novo.
 */

import {
  flexionarEstadoCivil,
  LABELS_ESTADO_CIVIL,
  type EstadoCivilSm,
} from '@/lib/validar-form-peticao'
import {
  formatarSalarioMinimo,
  tentarValorCausaSalarioMaternidade,
} from '@/lib/salario-minimo'
import { mascaraCPF } from '@/lib/validar-form-peticao'
import { formatarEnderecoAutorPeticao } from '@/lib/formatar-endereco'
import { flexionarAtividadeTimeline } from '@/lib/peticao-sm-rural'

export type DadosCasoPeticao = Record<string, string>

export type CampoDadosCaso =
  | 'nome'
  | 'cpf'
  | 'rg'
  | 'data_nascimento'
  | 'estado_civil'
  | 'sexo_parte_autora'
  | 'profissao'
  | 'autor_cep'
  | 'autor_logradouro'
  | 'autor_numero'
  | 'autor_bairro'
  | 'autor_zona'
  | 'autor_municipio'
  | 'autor_uf'
  | 'subsecao_judiciaria'
  | 'nome_crianca'
  | 'cpf_crianca'
  | 'data_nascimento_crianca'
  | 'sexo_crianca'
  | 'nb'
  | 'data_requerimento'
  | 'data_indeferimento'
  | 'motivo_inss'
  | 'salario_minimo_ref'
  | 'numero_parcelas'

export type AvisoSubstituicao = {
  tipo: 'concordancia' | 'calculo'
  mensagem: string
  trechos: number
  /** Texto após aplicar o aviso (concordância / planilha). */
  textoProposto: string
}

export type ResultadoSubstituicao = {
  texto: string
  ocorrencias: number
  aviso: AvisoSubstituicao | null
  dados: DadosCasoPeticao
}

const CAMPOS_CONCORDANCIA: CampoDadosCaso[] = [
  'sexo_parte_autora',
  'sexo_crianca',
  'estado_civil',
]

const CAMPOS_CALCULO: CampoDadosCaso[] = [
  'data_nascimento_crianca',
  'salario_minimo_ref',
  'numero_parcelas',
]

/** Converte ISO ou BR → dd/mm/aaaa (forma usada no texto da peça). */
export function dataParaBr(valor: string): string {
  const v = (valor || '').trim()
  if (!v) return ''
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (br) {
    return `${br[1].padStart(2, '0')}/${br[2].padStart(2, '0')}/${br[3]}`
  }
  return v
}

function escaparRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Conta e substitui ocorrências literais (case-sensitive por padrão). */
function substituirLiteral(
  texto: string,
  de: string,
  para: string,
  opts?: { ignoreCase?: boolean },
): { texto: string; n: number } {
  const d = (de || '').trim()
  if (!d || d === para) return { texto, n: 0 }
  if (d.length < 2 && !/^\d+$/.test(d)) return { texto, n: 0 }
  const flags = opts?.ignoreCase ? 'gi' : 'g'
  const re = new RegExp(escaparRe(d), flags)
  let n = 0
  const next = texto.replace(re, () => {
    n += 1
    return para
  })
  return { texto: next, n }
}

function variantesData(valor: string): string[] {
  const br = dataParaBr(valor)
  const iso = (() => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br)
    return m ? `${m[3]}-${m[2]}-${m[1]}` : ''
  })()
  const out = new Set<string>()
  if (valor.trim()) out.add(valor.trim())
  if (br) out.add(br)
  if (iso) out.add(iso)
  // sem zero à esquerda
  const br2 = br.replace(/^0(\d)/, '$1').replace(/\/0(\d)/, '/$1')
  if (br2 && br2 !== br) out.add(br2)
  return [...out].filter(Boolean)
}

function formatarCpfSePossivel(v: string): string {
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return mascaraCPF(d)
  return v.trim()
}

function labelEstadoCivil(v: string, sexo?: string): string {
  const raw = v.trim().toLowerCase()
  if (!raw) return ''
  const key = (Object.keys(LABELS_ESTADO_CIVIL) as EstadoCivilSm[]).find(
    (k) =>
      k === raw ||
      LABELS_ESTADO_CIVIL[k].toLowerCase() === raw ||
      flexionarEstadoCivil(k, sexo).toLowerCase() === raw,
  )
  if (key) return flexionarEstadoCivil(key, sexo)
  return flexionarEstadoCivil(v, sexo) || v
}

function paresConcordanciaAutor(de: string, para: string): Array<[string, string]> {
  const d = de.toLowerCase()
  const p = para.toLowerCase()
  if (d === p) return []
  if (p === 'masculino') {
    return [
      ['a autora', 'o autor'],
      ['da autora', 'do autor'],
      ['pela autora', 'pelo autor'],
      ['à autora', 'ao autor'],
      ['agricultora', 'agricultor'],
      ['segurada especial', 'segurado especial'],
      ['portadora', 'portador'],
      ['domiciliada', 'domiciliado'],
      ['residente e domiciliada', 'residente e domiciliado'],
      ['nascida em', 'nascido em'],
      ['brasileira', 'brasileiro'],
      ['(SEGURADA ESPECIAL – AGRICULTORA)', '(SEGURADO ESPECIAL – AGRICULTOR)'],
      ['SEGURADA ESPECIAL – AGRICULTORA', 'SEGURADO ESPECIAL – AGRICULTOR'],
    ]
  }
  if (p === 'feminino') {
    return [
      ['o autor', 'a autora'],
      ['do autor', 'da autora'],
      ['pelo autor', 'pela autora'],
      ['ao autor', 'à autora'],
      ['agricultor', 'agricultora'],
      ['segurado especial', 'segurada especial'],
      ['portador', 'portadora'],
      ['domiciliado', 'domiciliada'],
      ['residente e domiciliado', 'residente e domiciliada'],
      ['nascido em', 'nascida em'],
      ['brasileiro', 'brasileira'],
      ['(SEGURADO ESPECIAL – AGRICULTOR)', '(SEGURADA ESPECIAL – AGRICULTORA)'],
      ['SEGURADO ESPECIAL – AGRICULTOR', 'SEGURADA ESPECIAL – AGRICULTORA'],
    ]
  }
  return []
}

function paresConcordanciaCrianca(de: string, para: string): Array<[string, string]> {
  const d = de.toLowerCase()
  const p = para.toLowerCase()
  if (d === p) return []
  if (p === 'masculino') {
    return [
      ['a filha', 'o filho'],
      ['sua filha', 'seu filho'],
      ['da filha', 'do filho'],
      ['nascida', 'nascido'],
      ['a menor', 'o menor'],
    ]
  }
  if (p === 'feminino') {
    return [
      ['o filho', 'a filha'],
      ['seu filho', 'sua filha'],
      ['do filho', 'da filha'],
      ['nascido', 'nascida'],
      ['o menor', 'a menor'],
    ]
  }
  return []
}

function atualizarLinhaQuadro(
  texto: string,
  campoRe: RegExp,
  novoValor: string,
): { texto: string; n: number } {
  if (!novoValor.trim()) return { texto, n: 0 }
  const re = new RegExp(
    `^(\\|\\s*${campoRe.source}\\s*\\|\\s*)([^|]+)(\\s*\\|\\s*)$`,
    'gim',
  )
  let n = 0
  const next = texto.replace(re, (_m, pre: string, _old: string, pos: string) => {
    n += 1
    return `${pre}${novoValor}${pos}`
  })
  return { texto: next, n }
}

function atualizarPlanilha(
  texto: string,
  dataParto: string,
  parcelas = 4,
): { texto: string; n: number } {
  const vc = tentarValorCausaSalarioMaternidade(dataParto)
  if (!vc) return { texto, n: 0 }
  const blocoRe = /<<<PLANILHA>>>([\s\S]*?)<<<END_PLANILHA>>>/i
  const m = blocoRe.exec(texto)
  if (!m) {
    // tenta substituir valores formatados soltos
    let t = texto
    let n = 0
    const moneyRe = /R\$\s*[\d.]+,\d{2}/g
    // só atualiza se houver pelo menos um valor antigo típico — conta ocorrências
    const hits = t.match(moneyRe)
    if (!hits || hits.length < 2) return { texto, n: 0 }
    // não substitui cegamente todos os R$ — só dentro de planilha ausente: skip
    return { texto, n: 0 }
  }
  const linhas: string[] = []
  for (let i = 1; i <= parcelas; i++) {
    linhas.push(`| ${i}º Mês de benefício | ${vc.mensalFmt} |`)
  }
  linhas.push(`| TOTAL | ${vc.totalFmt} |`)
  linhas.push(`nota: ${vc.nota}`)
  const novo = `<<<PLANILHA>>>\n${linhas.join('\n')}\n<<<END_PLANILHA>>>`
  return { texto: texto.replace(blocoRe, novo), n: parcelas + 1 }
}

function montarEndereco(dados: DadosCasoPeticao): string {
  return formatarEnderecoAutorPeticao({
    autor_logradouro: dados.autor_logradouro,
    autor_numero: dados.autor_numero,
    autor_bairro: dados.autor_bairro,
    autor_zona: dados.autor_zona,
    autor_municipio: dados.autor_municipio,
    autor_uf: dados.autor_uf,
    autor_cep: dados.autor_cep,
  })
}

/**
 * Extrai dados do caso a partir do snapshot (form_data) ou do texto (quadro).
 */
export function extrairDadosCasoDoTexto(
  texto: string,
  snapshot?: Record<string, unknown> | null,
): DadosCasoPeticao {
  const base: DadosCasoPeticao = {}
  if (snapshot) {
    for (const [k, v] of Object.entries(snapshot)) {
      if (v == null) continue
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        base[k] = String(v)
      }
    }
  }

  const quadro = (() => {
    const m = /<<<II_QUADRO>>>([\s\S]*?)<<<END_II>>>/i.exec(texto)
    return m?.[1] || ''
  })()

  const lerQuadro = (campo: RegExp): string => {
    const re = new RegExp(`\\|\\s*${campo.source}\\s*\\|\\s*([^|]+)\\s*\\|`, 'i')
    return re.exec(quadro)?.[1]?.trim() || ''
  }

  if (!base.nome) base.nome = lerQuadro(/Nome/)
  if (!base.data_nascimento) {
    base.data_nascimento = lerQuadro(/Data de nascimento da autora/)
  }
  if (!base.estado_civil) base.estado_civil = lerQuadro(/Estado civil/)
  if (!base.cpf) base.cpf = lerQuadro(/CPF da autora/)
  if (!base.nb) base.nb = lerQuadro(/NB/)
  if (!base.data_requerimento) base.data_requerimento = lerQuadro(/Data do Req\.?\s*Adm\.?/)
  if (!base.data_indeferimento) base.data_indeferimento = lerQuadro(/Data do Indef\.?\s*Adm\.?/)
  if (!base.motivo_inss) base.motivo_inss = lerQuadro(/Motivo INSS/)
  if (!base.data_nascimento_crianca) {
    base.data_nascimento_crianca = lerQuadro(/Data de Nascimento/)
  }
  if (!base.nome_crianca) {
    const crianca = lerQuadro(/Criança/)
    if (crianca) {
      const [nomePart, cpfPart] = crianca.split(/\s*[—–-]\s*CPF\s*/i)
      base.nome_crianca = (nomePart || '').trim()
      if (cpfPart && !base.cpf_crianca) base.cpf_crianca = cpfPart.trim()
    }
  }

  const munUf = lerQuadro(/Município\/UF/)
  if (munUf && !base.autor_municipio) {
    const [mun, uf] = munUf.split('/').map((s) => s.trim())
    if (mun) base.autor_municipio = mun
    if (uf) base.autor_uf = uf
  }

  const vc = tentarValorCausaSalarioMaternidade(
    base.data_nascimento_crianca || base.data_parto || '',
  )
  if (vc) {
    base.salario_minimo_ref = vc.mensalFmt
    base.numero_parcelas = '4'
  } else if (!base.numero_parcelas) {
    base.numero_parcelas = '4'
  }

  return base
}

function aplicarConcordancia(
  texto: string,
  campo: CampoDadosCaso,
  de: string,
  para: string,
  dados: DadosCasoPeticao,
): { texto: string; n: number } {
  let t = texto
  let n = 0
  const pares =
    campo === 'sexo_crianca'
      ? paresConcordanciaCrianca(de, para)
      : campo === 'sexo_parte_autora'
        ? paresConcordanciaAutor(de, para)
        : []

  for (const [a, b] of pares) {
    const r = substituirLiteral(t, a, b, { ignoreCase: true })
    // preserve original casing roughly: if replacement ran, count
    t = r.texto
    n += r.n
  }

  if (campo === 'sexo_parte_autora' || campo === 'estado_civil') {
    const ec = dados.estado_civil || ''
    if (ec) {
      const novo = labelEstadoCivil(ec, dados.sexo_parte_autora)
      // troca rótulos comuns
      for (const oldLabel of Object.values(LABELS_ESTADO_CIVIL)) {
        if (oldLabel.toLowerCase() === novo.toLowerCase()) continue
        const r = substituirLiteral(t, oldLabel, novo, { ignoreCase: true })
        t = r.texto
        n += r.n
      }
      const flexedOld = labelEstadoCivil(ec, de)
      if (flexedOld && flexedOld !== novo) {
        const r = substituirLiteral(t, flexedOld, novo, { ignoreCase: true })
        t = r.texto
        n += r.n
      }
      const q = atualizarLinhaQuadro(t, /Estado civil/, novo)
      t = q.texto
      n += q.n
    }
    const atv = flexionarAtividadeTimeline(
      dados.profissao || 'agricultor',
      dados.sexo_parte_autora,
    )
    // timeline JSON "atividade"
    t = t.replace(
      /("atividade"\s*:\s*")([^"]*)(")/gi,
      (_m, pre: string, _old: string, pos: string) => {
        n += 1
        return `${pre}${atv}${pos}`
      },
    )
  }

  return { texto: t, n }
}

/**
 * Aplica alteração de um campo no texto da petição.
 * Campos de concordância/cálculo geram `aviso` com texto proposto (Aplicar).
 */
export function aplicarCampoNoTexto(
  texto: string,
  dadosAntes: DadosCasoPeticao,
  campo: CampoDadosCaso,
  valorNovo: string,
): ResultadoSubstituicao {
  const dados = { ...dadosAntes, [campo]: valorNovo }
  const antigo = String(dadosAntes[campo] || '')
  let t = texto
  let ocorrencias = 0
  let aviso: AvisoSubstituicao | null = null

  // Endereço composto: se qualquer parte mudou, troca o bloco formatado
  const camposEndereco: CampoDadosCaso[] = [
    'autor_cep',
    'autor_logradouro',
    'autor_numero',
    'autor_bairro',
    'autor_zona',
    'autor_municipio',
    'autor_uf',
  ]

  if (camposEndereco.includes(campo)) {
    const endAntigo = montarEndereco(dadosAntes)
    const endNovo = montarEndereco(dados)
    if (endAntigo && endNovo && endAntigo !== endNovo) {
      const r = substituirLiteral(t, endAntigo, endNovo)
      t = r.texto
      ocorrencias += r.n
    }
    // partes soltas
    if (antigo.trim() && valorNovo.trim() && antigo !== valorNovo) {
      const r = substituirLiteral(t, antigo, valorNovo, { ignoreCase: true })
      t = r.texto
      ocorrencias += r.n
    }
    if (campo === 'autor_municipio' || campo === 'autor_uf') {
      const munUfAntigo = [dadosAntes.autor_municipio, dadosAntes.autor_uf]
        .filter(Boolean)
        .join('/')
      const munUfNovo = [dados.autor_municipio, dados.autor_uf].filter(Boolean).join('/')
      if (munUfAntigo && munUfNovo && munUfAntigo !== munUfNovo) {
        const r = substituirLiteral(t, munUfAntigo, munUfNovo)
        t = r.texto
        ocorrencias += r.n
        const q = atualizarLinhaQuadro(t, /Município\/UF/, munUfNovo)
        t = q.texto
        ocorrencias += q.n
      }
    }
  } else if (campo === 'subsecao_judiciaria') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo, { ignoreCase: true })
      t = r.texto
      ocorrencias += r.n
    }
    // bloco ENDERECO costuma ter a subseção
    const endRe = /<<<ENDERECO>>>([\s\S]*?)<<<END_ENDERECO>>>/i
    if (endRe.test(t) && valorNovo.trim()) {
      t = t.replace(endRe, (_m, corpo: string) => {
        let c = corpo
        if (antigo.trim()) {
          c = c.split(antigo).join(valorNovo)
        } else if (!c.includes(valorNovo)) {
          c = `${c.trim()}\nSubseção: ${valorNovo}\n`
          ocorrencias += 1
        }
        return `<<<ENDERECO>>>\n${c.trim()}\n<<<END_ENDERECO>>>`
      })
      ocorrencias = Math.max(ocorrencias, 1)
    }
  } else if (
    campo === 'data_nascimento' ||
    campo === 'data_nascimento_crianca' ||
    campo === 'data_requerimento' ||
    campo === 'data_indeferimento'
  ) {
    const vars = variantesData(antigo)
    const novoBr = dataParaBr(valorNovo)
    for (const v of vars) {
      if (!v || v === novoBr) continue
      const r = substituirLiteral(t, v, novoBr)
      t = r.texto
      ocorrencias += r.n
    }
    if (campo === 'data_nascimento') {
      const q = atualizarLinhaQuadro(t, /Data de nascimento da autora/, novoBr)
      t = q.texto
      ocorrencias += q.n
    }
    if (campo === 'data_nascimento_crianca') {
      const q = atualizarLinhaQuadro(t, /Data de Nascimento/, novoBr)
      t = q.texto
      ocorrencias += q.n
    }
    if (campo === 'data_requerimento') {
      const q = atualizarLinhaQuadro(t, /Data do Req\.?\s*Adm\.?/, novoBr)
      t = q.texto
      ocorrencias += q.n
    }
    if (campo === 'data_indeferimento') {
      const q = atualizarLinhaQuadro(t, /Data do Indef\.?\s*Adm\.?/, novoBr)
      t = q.texto
      ocorrencias += q.n
    }
  } else if (campo === 'cpf' || campo === 'cpf_crianca') {
    const ant = formatarCpfSePossivel(antigo)
    const nov = formatarCpfSePossivel(valorNovo)
    const digitsOld = antigo.replace(/\D/g, '')
    const digitsNew = valorNovo.replace(/\D/g, '')
    for (const v of [antigo, ant, digitsOld].filter(Boolean)) {
      if (v === nov || v === digitsNew) continue
      const r = substituirLiteral(t, v, nov || valorNovo)
      t = r.texto
      ocorrencias += r.n
    }
    if (campo === 'cpf') {
      const q = atualizarLinhaQuadro(t, /CPF da autora/, nov || valorNovo)
      t = q.texto
      ocorrencias += q.n
    }
    if (campo === 'cpf_crianca' && dados.nome_crianca) {
      const linha = nov
        ? `${dados.nome_crianca} — CPF ${nov}`
        : dados.nome_crianca
      const q = atualizarLinhaQuadro(t, /Criança/, linha)
      t = q.texto
      ocorrencias += q.n
    }
  } else if (campo === 'nome') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo)
      t = r.texto
      ocorrencias += r.n
      // timeline nome
      t = t.replace(
        /("nome"\s*:\s*")([^"]*)(")/gi,
        (m, pre: string, old: string, pos: string) => {
          if (old === antigo || old.toUpperCase() === antigo.toUpperCase()) {
            ocorrencias += 1
            return `${pre}${valorNovo.toUpperCase()}${pos}`
          }
          return m
        },
      )
      const q = atualizarLinhaQuadro(t, /Nome/, valorNovo)
      t = q.texto
      ocorrencias += q.n
    }
  } else if (campo === 'nome_crianca') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo)
      t = r.texto
      ocorrencias += r.n
      const linha = dados.cpf_crianca
        ? `${valorNovo} — CPF ${formatarCpfSePossivel(dados.cpf_crianca)}`
        : valorNovo
      const q = atualizarLinhaQuadro(t, /Criança/, linha)
      t = q.texto
      ocorrencias += q.n
    }
  } else if (campo === 'estado_civil') {
    const velho = labelEstadoCivil(antigo, dados.sexo_parte_autora)
    const novo = labelEstadoCivil(valorNovo, dados.sexo_parte_autora)
    if (velho && novo && velho !== novo) {
      const r = substituirLiteral(t, velho, novo, { ignoreCase: true })
      t = r.texto
      ocorrencias += r.n
    }
    if (antigo && novo) {
      const r2 = substituirLiteral(t, antigo, novo, { ignoreCase: true })
      t = r2.texto
      ocorrencias += r2.n
    }
    const q = atualizarLinhaQuadro(t, /Estado civil/, novo || valorNovo)
    t = q.texto
    ocorrencias += q.n
  } else if (campo === 'profissao') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo, { ignoreCase: true })
      t = r.texto
      ocorrencias += r.n
    }
    const atv = flexionarAtividadeTimeline(valorNovo, dados.sexo_parte_autora)
    t = t.replace(
      /("atividade"\s*:\s*")([^"]*)(")/gi,
      (_m, pre: string, _old: string, pos: string) => {
        ocorrencias += 1
        return `${pre}${atv}${pos}`
      },
    )
  } else if (campo === 'nb') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo)
      t = r.texto
      ocorrencias += r.n
    }
    const q = atualizarLinhaQuadro(t, /NB/, valorNovo)
    t = q.texto
    ocorrencias += q.n
  } else if (campo === 'motivo_inss') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo)
      t = r.texto
      ocorrencias += r.n
    }
    const q = atualizarLinhaQuadro(t, /Motivo INSS/, valorNovo)
    t = q.texto
    ocorrencias += q.n
  } else if (campo === 'rg') {
    if (antigo.trim() && valorNovo.trim()) {
      const r = substituirLiteral(t, antigo, valorNovo)
      t = r.texto
      ocorrencias += r.n
    }
  } else if (campo === 'salario_minimo_ref' || campo === 'numero_parcelas') {
    // tratado no aviso de cálculo
  }

  // Avisos que exigem confirmação
  if (CAMPOS_CONCORDANCIA.includes(campo) && antigo !== valorNovo) {
    const { texto: proposto, n } = aplicarConcordancia(
      t,
      campo,
      antigo,
      valorNovo,
      dados,
    )
    const trechos = Math.max(n, ocorrencias, 1)
    aviso = {
      tipo: 'concordancia',
      mensagem: `${trechos} trecho${trechos === 1 ? '' : 's'} do texto ser${trechos === 1 ? 'á' : 'ão'} atualizado${trechos === 1 ? '' : 's'} (concordância)`,
      trechos,
      textoProposto: proposto,
    }
    // ainda aplica substituições literais simples já feitas em `t`
    return { texto: t, ocorrencias, aviso, dados }
  }

  if (CAMPOS_CALCULO.includes(campo) && antigo !== valorNovo) {
    const dataParto =
      campo === 'data_nascimento_crianca'
        ? valorNovo
        : dados.data_nascimento_crianca || ''
    const parcelas = Number(dados.numero_parcelas || 4) || 4
    const { texto: comPlanilha, n } = atualizarPlanilha(t, dataParto, parcelas)
    const vc = tentarValorCausaSalarioMaternidade(dataParto)
    let proposto = comPlanilha
    let trechos = n + ocorrencias
    if (vc) {
      dados.salario_minimo_ref = vc.mensalFmt
      // substitui valor mensal antigo se conhecido
      const antigoVc = tentarValorCausaSalarioMaternidade(
        campo === 'data_nascimento_crianca' ? antigo : dataParto,
      )
      if (antigoVc && antigoVc.mensalFmt !== vc.mensalFmt) {
        const r1 = substituirLiteral(proposto, antigoVc.mensalFmt, vc.mensalFmt)
        proposto = r1.texto
        trechos += r1.n
        const r2 = substituirLiteral(proposto, antigoVc.totalFmt, vc.totalFmt)
        proposto = r2.texto
        trechos += r2.n
      }
    }
    trechos = Math.max(trechos, 1)
    aviso = {
      tipo: 'calculo',
      mensagem: `${trechos} trecho${trechos === 1 ? '' : 's'} do texto ser${trechos === 1 ? 'á' : 'ão'} atualizado${trechos === 1 ? '' : 's'} (cálculo / salário mínimo)`,
      trechos,
      textoProposto: proposto,
    }
    return { texto: t, ocorrencias, aviso, dados }
  }

  return { texto: t, ocorrencias, aviso, dados }
}

/** Mapeia dados do caso → colunas `clients` para “Salvar na ficha”. */
export function dadosCasoParaCliente(
  dados: DadosCasoPeticao,
): Record<string, string | null> {
  const zona = (dados.autor_zona || '').toLowerCase()
  const zone =
    zona === 'rural' || zona === 'r'
      ? 'rural'
      : zona === 'urbana' || zona === 'urban' || zona === 'urbano'
        ? 'urban'
        : dados.autor_zona || null

  return {
    name: dados.nome || null,
    cpf: dados.cpf || null,
    rg: dados.rg || null,
    birth_date: dados.data_nascimento || null,
    data_nascimento: dados.data_nascimento || null,
    estado_civil: dados.estado_civil || null,
    sexo: dados.sexo_parte_autora || null,
    profession: dados.profissao || null,
    cep: dados.autor_cep || null,
    rua: dados.autor_logradouro || null,
    numero: dados.autor_numero || null,
    bairro: dados.autor_bairro || null,
    city: dados.autor_municipio || null,
    state: dados.autor_uf || null,
    zone,
    cpf_crianca: dados.cpf_crianca || null,
  }
}

export function formatarSalarioRef(dataParto: string): string {
  const vc = tentarValorCausaSalarioMaternidade(dataParto)
  return vc ? vc.mensalFmt : formatarSalarioMinimo(0)
}
