/**
 * Tipos de documento que um agente próprio pode gerar.
 * Arquivo de configuração — fácil de expandir sem mexer na UI.
 */

export type TipoDocumentoAgenteId =
  | 'peticao_sm_rural'
  | 'peticao_apos_rural'
  | 'peticao_bpc_loas'
  | 'peticao_auxilio_doenca'
  | 'peticao_outros'
  | 'contrato_servicos'
  | 'contrato_honorarios'
  | 'procuracao'
  | 'outros'

/** Botão na ficha do cliente ao qual o tipo se associa. */
export type BotaoClienteDocumento = 'peticao' | 'contrato' | 'honorarios' | 'outros'

export interface TipoDocumentoAgente {
  id: TipoDocumentoAgenteId
  rotulo: string
  /** Se true, o formulário pede texto livre (especificar). */
  textoLivre?: boolean
  botaoCliente: BotaoClienteDocumento
  /** Chaves de variáveis sugeridas para este tipo (do catálogo de modelos). */
  variaveisSugeridas: string[]
  cor: string
}

export const TIPOS_DOCUMENTO_AGENTE: TipoDocumentoAgente[] = [
  {
    id: 'peticao_sm_rural',
    rotulo: 'Petição — salário-maternidade rural',
    botaoCliente: 'peticao',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'rg_cliente',
      'endereco_cliente',
      'data_nascimento',
      'data_parto',
      'beneficio',
      'motivo_indeferimento',
      'valor_causa',
      'comarca',
    ],
    cor: '#D4AF37',
  },
  {
    id: 'peticao_apos_rural',
    rotulo: 'Petição — aposentadoria rural',
    botaoCliente: 'peticao',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'rg_cliente',
      'endereco_cliente',
      'data_nascimento',
      'beneficio',
      'motivo_indeferimento',
      'valor_causa',
      'comarca',
    ],
    cor: '#22C55E',
  },
  {
    id: 'peticao_bpc_loas',
    rotulo: 'Petição — BPC/LOAS',
    botaoCliente: 'peticao',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'endereco_cliente',
      'data_nascimento',
      'beneficio',
      'motivo_indeferimento',
      'valor_causa',
      'comarca',
    ],
    cor: '#EF4444',
  },
  {
    id: 'peticao_auxilio_doenca',
    rotulo: 'Petição — auxílio-doença',
    botaoCliente: 'peticao',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'endereco_cliente',
      'beneficio',
      'motivo_indeferimento',
      'valor_causa',
      'comarca',
    ],
    cor: '#F97316',
  },
  {
    id: 'peticao_outros',
    rotulo: 'Petição — outros',
    textoLivre: true,
    botaoCliente: 'peticao',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'endereco_cliente',
      'beneficio',
      'valor_causa',
      'comarca',
    ],
    cor: '#A855F7',
  },
  {
    id: 'contrato_servicos',
    rotulo: 'Contrato de prestação de serviços',
    botaoCliente: 'contrato',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'endereco_cliente',
      'nome_advogado',
      'oab',
      'objeto_contrato',
      'data_contrato',
    ],
    cor: '#3B82F6',
  },
  {
    id: 'contrato_honorarios',
    rotulo: 'Contrato de honorários',
    botaoCliente: 'honorarios',
    variaveisSugeridas: [
      'nome_cliente',
      'cpf_cliente',
      'valor_honorarios',
      'percentual_exito',
      'forma_pagamento',
      'prazo',
    ],
    cor: '#14B8A6',
  },
  {
    id: 'procuracao',
    rotulo: 'Procuração',
    botaoCliente: 'outros',
    variaveisSugeridas: ['nome_cliente', 'cpf_cliente', 'endereco_cliente', 'nome_advogado', 'oab'],
    cor: '#888888',
  },
  {
    id: 'outros',
    rotulo: 'Outros',
    textoLivre: true,
    botaoCliente: 'outros',
    variaveisSugeridas: ['nome_cliente', 'cpf_cliente', 'nome_advogado', 'oab'],
    cor: '#6B7280',
  },
]

export function tipoDocumentoAgentePorId(
  id: string | null | undefined
): TipoDocumentoAgente | undefined {
  return TIPOS_DOCUMENTO_AGENTE.find((t) => t.id === id)
}

export function rotuloTipoDocumentoAgente(
  id: string | null | undefined,
  detalheLivre?: string | null
): string {
  const t = tipoDocumentoAgentePorId(id)
  if (!t) return detalheLivre?.trim() || 'Tipo não informado'
  if (t.textoLivre && detalheLivre?.trim()) return `${t.rotulo}: ${detalheLivre.trim()}`
  return t.rotulo
}

export function isTipoDocumentoAgente(v: string): v is TipoDocumentoAgenteId {
  return TIPOS_DOCUMENTO_AGENTE.some((t) => t.id === v)
}

/** Filtra agentes customizados associados a um botão da ficha do cliente. */
export function agentesParaBotaoCliente<T extends { document_type?: string | null }>(
  agentes: T[],
  botao: BotaoClienteDocumento
): T[] {
  return agentes.filter((a) => {
    const t = tipoDocumentoAgentePorId(a.document_type || '')
    return t?.botaoCliente === botao
  })
}
