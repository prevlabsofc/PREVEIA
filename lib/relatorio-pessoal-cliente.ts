/**
 * Monta um parágrafo corrido com dados cadastrais + contexto do caso.
 * Omite campos vazios — não inventa fatos.
 * Este texto é só para o advogado: NÃO entra na petição gerada pela IA.
 */

import { calcularIdade, formatarDataBR } from '@/lib/formatar-data'
import { flexionarEstadoCivil } from '@/lib/validar-form-peticao'
import { juntarEnderecoLegado } from '@/lib/formatar-endereco'
import { CHECKLIST_ANEXO_AGENT_TYPE } from '@/lib/checklist-inss'
import { EXTRACAO_PDF_AGENT_TYPE } from '@/lib/extracao-documento-pdf'
import { ehContratoDocumento } from '@/lib/contrato-honorarios'

export type DadosRelatorioPessoal = {
  name?: string | null
  sexo?: string | null
  birth_date?: string | null
  data_nascimento?: string | null
  estado_civil?: string | null
  profession?: string | null
  zone?: string | null
  city?: string | null
  state?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  address?: string | null
  cpf_crianca?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  notes?: string | null
  tipo_beneficio?: string | null
}

export type DocParaRelatorio = {
  id?: string | null
  title?: string | null
  agent_type?: string | null
  created_at?: string | null
  form_data?: Record<string, unknown> | null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
}

function zonaLabel(zone: string): string {
  const z = zone.toLowerCase()
  if (z === 'rural') return 'zona rural'
  if (z === 'urban' || z === 'urbano') return 'zona urbana'
  return ''
}

function artigoNome(sexo: string): { artigo: string; pronome: string } {
  if (sexo === 'feminino' || sexo === 'f') return { artigo: 'A', pronome: 'ela' }
  if (sexo === 'masculino' || sexo === 'm') return { artigo: 'O', pronome: 'ele' }
  return { artigo: '', pronome: 'a pessoa' }
}

function lerForm(docs: DocParaRelatorio[]): Record<string, unknown> {
  for (const d of docs) {
    const agent = String(d.agent_type || '')
    if (
      !agent ||
      agent === CHECKLIST_ANEXO_AGENT_TYPE ||
      agent === EXTRACAO_PDF_AGENT_TYPE ||
      ehContratoDocumento(agent) ||
      agent === 'manual'
    ) {
      continue
    }
    if (d.form_data && typeof d.form_data === 'object') return d.form_data
  }
  return {}
}

function beneficioLabel(
  cliente: DadosRelatorioPessoal,
  form: Record<string, unknown>
): string {
  const direto =
    str(cliente.tipo_beneficio) ||
    str(form.tipo_beneficio) ||
    str(form.beneficio) ||
    str(form.beneficio_pleiteado)
  if (direto) return direto
  const zone = str(cliente.zone).toLowerCase()
  if (zone === 'rural') return 'benefício rural'
  if (zone === 'urban' || zone === 'urbano') return 'benefício urbano'
  return ''
}

function tempoAtividade(form: Record<string, unknown>): string {
  return (
    str(form.tempo_trabalho_parto) ||
    str(form.tempo_atividade) ||
    str(form.periodo_rural) ||
    str(form.periodo_atividade) ||
    ''
  )
}

function motivoIndeferimento(form: Record<string, unknown>): string {
  return (
    str(form.motivo_inss) ||
    str(form.motivo_indeferimento) ||
    str(form.motivo) ||
    ''
  )
}

function dataPedido(form: Record<string, unknown>): string {
  const raw =
    str(form.data_pedido) ||
    str(form.data_requerimento) ||
    str(form.data_entrada) ||
    ''
  return raw ? formatarDataBR(raw) || raw : ''
}

function inferirFilhos(cliente: DadosRelatorioPessoal, form: Record<string, unknown>): string {
  const n =
    str(form.numero_filhos) ||
    str(form.n_filhos) ||
    str(form.qtd_filhos) ||
    str(form.quantidade_filhos)
  if (n) return n
  if (str(cliente.cpf_crianca) || str(form.cpf_crianca) || str(form.nome_crianca)) {
    return '1'
  }
  return ''
}

function historicoInss(opts: {
  form: Record<string, unknown>
  docs: DocParaRelatorio[]
  notes: string
}): string {
  const partes: string[] = []
  const motivo = motivoIndeferimento(opts.form)
  const data = dataPedido(opts.form)
  const beneficio = str(opts.form.tipo_beneficio) || str(opts.form.beneficio)

  if (data && motivo) {
    partes.push(
      `deu entrada no pedido${beneficio ? ` de ${beneficio}` : ''} em ${data}, indeferido por ${motivo}`
    )
  } else if (motivo) {
    partes.push(`teve pedido indeferido pelo INSS por ${motivo}`)
  } else if (data) {
    partes.push(`deu entrada no pedido administrativo em ${data}`)
  }

  const peticoes = opts.docs.filter((d) => {
    const agent = String(d.agent_type || '')
    return (
      agent &&
      agent !== CHECKLIST_ANEXO_AGENT_TYPE &&
      agent !== EXTRACAO_PDF_AGENT_TYPE &&
      !ehContratoDocumento(agent)
    )
  })
  if (peticoes.length > 0 && !partes.length) {
    const ultima = peticoes[0]
    const quando = ultima.created_at ? formatarDataBR(ultima.created_at) : ''
    partes.push(
      `já possui ${peticoes.length} petição${peticoes.length > 1 ? 'ões' : ''} no histórico${quando ? ` (última em ${quando})` : ''}`
    )
  }

  if (!partes.length && /indefer|inss|negativ|carência|carencia/i.test(opts.notes)) {
    partes.push(`histórico com o INSS registrado na ficha: ${opts.notes.slice(0, 160).trim()}`)
  }

  return partes.join('; ')
}

/** Gera o relatório pessoal em texto corrido. */
export function montarRelatorioPessoal(
  cliente: DadosRelatorioPessoal,
  documentos: DocParaRelatorio[] = []
): string {
  const nome = str(cliente.name)
  if (!nome) {
    return 'Ainda não há dados cadastrais suficientes para montar o relatório pessoal deste cliente.'
  }

  const form = lerForm(documentos)
  const sexo = str(cliente.sexo).toLowerCase() || str(form.sexo).toLowerCase()
  const { artigo, pronome } = artigoNome(sexo)
  const nascimento =
    str(cliente.data_nascimento) || str(cliente.birth_date) || str(form.data_nascimento)
  const idade = calcularIdade(nascimento || null)
  const estadoCivil = flexionarEstadoCivil(
    str(cliente.estado_civil) || str(form.estado_civil),
    sexo
  )
  const profissao =
    str(cliente.profession) || str(form.profession) || str(form.profissao) || str(form.atividade)
  const zona = zonaLabel(str(cliente.zone) || str(form.zone))
  const cidade = str(cliente.city) || str(form.city) || str(form.cidade)
  const uf = str(cliente.state) || str(form.state) || str(form.uf)
  const tempo = tempoAtividade(form)
  const filhos = inferirFilhos(cliente, form)
  const beneficio = beneficioLabel(cliente, form)
  const notes = str(cliente.notes)
  const historico = historicoInss({ form, docs: documentos, notes })

  const sujeito =
    pronome === 'ela' ? 'Ela' : pronome === 'ele' ? 'Ele' : 'A pessoa'

  // Abertura no estilo: "Maria da Silva, 32 anos, agricultora, reside em zona rural…"
  const abertura: string[] = [nome]
  if (idade != null) abertura.push(`${idade} anos`)
  if (profissao) abertura.push(profissao)

  let frase = abertura.join(', ')
  if (zona && cidade) {
    frase += `, reside em ${zona} no município de ${cidade}${uf ? `/${uf}` : ''}`
  } else if (zona) {
    frase += `, reside em ${zona}`
  } else if (cidade) {
    frase += `, reside em ${cidade}${uf ? `/${uf}` : ''}`
  }
  frase += '.'

  const partes: string[] = [frase]

  const familia: string[] = []
  if (estadoCivil) {
    const ec =
      estadoCivil.charAt(0).toUpperCase() + estadoCivil.slice(1)
    familia.push(ec)
  }
  if (filhos) {
    const n = Number(filhos)
    if (Number.isFinite(n) && n > 0) {
      familia.push(
        `${sexo === 'masculino' ? 'pai' : sexo === 'feminino' ? 'mãe' : 'responsável'} de ${n} filho${n > 1 ? 's' : ''}`
      )
    } else {
      familia.push(`com ${filhos} filho(s)`)
    }
  }
  if (familia.length) {
    partes.push(`${familia.join(', ')}.`)
  }

  if (tempo) {
    partes.push(
      `${sujeito} declara tempo de atividade de ${tempo.replace(/\.$/, '')}.`
    )
  }

  if (beneficio && !historico) {
    partes.push(`Benefício pleiteado: ${beneficio}.`)
  }

  if (historico) {
    const cap = historico.charAt(0).toUpperCase() + historico.slice(1)
    // Evita "Ela Deu" se já começa com verbo conjugado na 3ª pessoa sem sujeito
    if (/^(deu|teve|já)/i.test(historico)) {
      partes.push(`${sujeito} ${historico}.`.replace(/\.\.$/, '.'))
    } else {
      partes.push(`${cap}.`.replace(/\.\.$/, '.'))
    }
  } else if (notes && notes.length <= 220) {
    partes.push(notes.endsWith('.') ? notes : `${notes}.`)
  }

  return partes.join(' ').replace(/\s+/g, ' ').trim()
}
