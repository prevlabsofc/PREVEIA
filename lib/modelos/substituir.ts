/**
 * Substituição de {{variaveis}} pelos dados do cliente, advogado e campos extras.
 */

import { juntarEnderecoLegado } from '@/lib/formatar-endereco'
import { REGEX_VARIAVEL, tokenVariavel } from './variaveis'

export type DadosClienteModelo = {
  name?: string | null
  cpf?: string | null
  rg?: string | null
  birth_date?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  profession?: string | null
  sexo?: string | null
  cep?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

export type DadosAdvogadoModelo = {
  name?: string | null
  office_name?: string | null
  oab_number?: string | null
  oab_uf?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  cidade?: string | null
  estado?: string | null
}

/** Campos extras preenchidos pelo advogado antes de gerar. */
export type CamposExtrasModelo = Record<string, string | undefined | null>

function fmtDataCurta(d = new Date()): string {
  return d.toLocaleDateString('pt-BR')
}

function fmtDataExtenso(d = new Date()): string {
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDataNascimento(iso: string | null | undefined): string {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return String(iso)
  }
}

function sexoRotulo(sexo: string | null | undefined): string {
  if (sexo === 'masculino') return 'masculino'
  if (sexo === 'feminino') return 'feminino'
  return sexo || ''
}

function enderecoBase(cliente?: DadosClienteModelo | null): string {
  if (!cliente) return ''
  const estruturado = juntarEnderecoLegado({
    rua: cliente.rua,
    numero: cliente.numero,
    bairro: cliente.bairro,
  })
  return (estruturado || cliente.address || '').trim()
}

function enderecoCompleto(cliente?: DadosClienteModelo | null): string {
  if (!cliente) return ''
  const base = enderecoBase(cliente)
  const parts = [
    base,
    cliente.cep ? `CEP ${cliente.cep}` : '',
    [cliente.city, cliente.state].filter(Boolean).join('/'),
  ].filter(Boolean)
  return parts.join(' — ')
}

function clausulaHonorariosPadrao(extras: CamposExtrasModelo): string {
  if (extras.clausula_honorarios?.trim()) return extras.clausula_honorarios.trim()
  const tipo = (extras.tipo_honorario || '').toLowerCase()
  const pct = extras.percentual_exito?.trim()
  const fixo = extras.valor_fixo?.trim() || extras.valor_honorarios?.trim()
  const forma = extras.forma_pagamento?.trim()
  const formaTxt = forma ? ` Forma de pagamento: ${forma}.` : ''
  if (tipo.includes('misto') || (pct && fixo)) {
    return `Os honorários serão compostos por valor fixo de ${fixo || '[valor fixo]'} acrescido de ${pct || '[percentual]'}% sobre o êxito econômico obtido na demanda.${formaTxt}`
  }
  if (tipo.includes('fixo') || (fixo && !pct)) {
    return `Os honorários advocatícios ficam estipulados no valor fixo de ${fixo || '[valor fixo]'}, a serem pagos nas condições acordadas entre as partes.${formaTxt}`
  }
  return `Os honorários advocatícios ficam estipulados em ${pct || '[percentual]'}% (percentual de êxito) sobre o valor econômico obtido em favor do(a) Cliente, incluindo parcelas vencidas e vincendas, quando aplicável.${formaTxt}`
}

/** Monta o mapa chave → valor a partir dos dados disponíveis. */
export function montarMapaVariaveis(opts: {
  cliente?: DadosClienteModelo | null
  advogado?: DadosAdvogadoModelo | null
  extras?: CamposExtrasModelo | null
}): Record<string, string> {
  const c = opts.cliente || {}
  const a = opts.advogado || {}
  const e = { ...(opts.extras || {}) }

  const oabNum = a.oab_number || ''
  const oabUf = a.oab_uf || ''
  const oab = oabNum && oabUf ? `${oabNum}/${oabUf}` : oabNum || oabUf || ''

  const enderecoCli = enderecoCompleto(c) || enderecoBase(c)
  const comarca =
    e.comarca?.trim() ||
    e.cidade_foro?.trim() ||
    a.cidade ||
    c.city ||
    ''

  const dataContrato =
    e.data_contrato?.trim() ||
    `${comarca || '[cidade]'}, ${fmtDataExtenso()}`

  const mapa: Record<string, string> = {
    nome_cliente: c.name || '',
    cpf_cliente: c.cpf || '',
    rg_cliente: c.rg || '',
    endereco_cliente: enderecoCli,
    cpf: c.cpf || '',
    rg: c.rg || '',
    data_nascimento: fmtDataNascimento(c.birth_date),
    data_parto: e.data_parto || '',
    estado_civil: e.estado_civil || '',
    profissao: c.profession || e.profissao || '',
    sexo: sexoRotulo(c.sexo),
    nacionalidade: e.nacionalidade || 'brasileiro(a)',
    telefone: c.phone || c.whatsapp || '',
    whatsapp: c.whatsapp || c.phone || '',
    email_cliente: c.email || '',
    endereco: enderecoBase(c),
    cep: c.cep || '',
    cidade: c.city || '',
    estado: c.state || a.estado || a.oab_uf || '',
    endereco_completo: enderecoCli,

    nome_advogado: a.name || '',
    oab,
    oab_numero: oabNum,
    oab_uf: oabUf,
    nome_escritorio: a.office_name || a.name || '',
    email_advogado: a.email || '',
    telefone_advogado: a.whatsapp || a.phone || '',

    beneficio: e.beneficio || e.tipo_acao || '',
    motivo_indeferimento: e.motivo_indeferimento || '',
    tipo_acao: e.tipo_acao || e.beneficio || '',
    objeto_contrato:
      e.objeto_contrato ||
      e.descricao_servico ||
      'a prestação de serviços advocatícios na demanda previdenciária indicada',
    descricao_servico:
      e.descricao_servico ||
      e.objeto_contrato ||
      'patrocínio da causa previdenciária indicada, incluindo elaboração de peças, acompanhamento processual e atos necessários',
    valor_honorarios: e.valor_honorarios || e.valor_fixo || '',
    percentual_exito: e.percentual_exito || '',
    forma_pagamento: e.forma_pagamento || '',
    valor_fixo: e.valor_fixo || '',
    tipo_honorario: e.tipo_honorario || '',
    prazo: e.prazo || '',
    valor_causa: e.valor_causa || '',
    observacoes: e.observacoes || 'Nenhuma',
    clausula_honorarios: '',
    data_contrato: dataContrato,

    numero_processo: e.numero_processo || '',
    tribunal: e.tribunal || '',
    vara: e.vara || '',
    comarca,
    cidade_foro: comarca || '[cidade]',

    data_hoje: fmtDataExtenso(),
    data_curta: fmtDataCurta(),
  }

  mapa.clausula_honorarios = clausulaHonorariosPadrao({ ...e, ...mapa })

  for (const [k, v] of Object.entries(e)) {
    if (v != null && String(v).trim() !== '') mapa[k] = String(v)
  }

  return mapa
}

/**
 * Substitui {{chave}} pelos valores do mapa.
 * Sem valor: mantém o token {{chave}} (destaque amarelo no editor).
 */
export function substituirVariaveis(
  template: string,
  mapa: Record<string, string>,
  opts?: { manterTokenSeVazio?: boolean; placeholder?: string }
): string {
  const manter = opts?.manterTokenSeVazio !== false
  return template.replace(REGEX_VARIAVEL, (full, chave: string) => {
    const key = String(chave || '').toLowerCase()
    const val = mapa[key]
    if (val == null || String(val).trim() === '') {
      return manter ? tokenVariavel(key) : opts?.placeholder ?? '[a preencher]'
    }
    return String(val)
  })
}

export function gerarDocumentoDeModelo(
  conteudoModelo: string,
  opts: {
    cliente?: DadosClienteModelo | null
    advogado?: DadosAdvogadoModelo | null
    extras?: CamposExtrasModelo | null
  }
): string {
  const mapa = montarMapaVariaveis(opts)
  return substituirVariaveis(conteudoModelo, mapa)
}

/** Lista chaves que ficaram sem valor após a geração. */
export function variaveisPendentes(
  textoGerado: string,
  mapa?: Record<string, string>
): string[] {
  const usadas = new Set<string>()
  const re = new RegExp(REGEX_VARIAVEL.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(textoGerado)) !== null) {
    const k = m[1].toLowerCase()
    if (!mapa || !mapa[k]?.trim()) usadas.add(k)
  }
  return Array.from(usadas)
}

/** Destaca tokens {{var}} — chip dourado (modelo) ou amarelo (pendente no doc gerado). */
export function destacarVariaveisHtml(
  texto: string,
  opts?: { pendentesAmarelo?: boolean }
): string {
  const esc = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const amarelo = opts?.pendentesAmarelo !== false
  return esc
    .replace(REGEX_VARIAVEL, (full) => {
      if (amarelo) {
        return `<mark style="background:#FEF08A;color:#854D0E;padding:1px 6px;border-radius:999px;font-weight:600;border:1px solid #FACC15">${full}</mark>`
      }
      return `<mark style="background:rgba(212,175,55,0.25);color:#D4AF37;padding:1px 6px;border-radius:999px;font-weight:600">${full}</mark>`
    })
    .replace(/\n/g, '<br/>')
}

export { tokenVariavel }
