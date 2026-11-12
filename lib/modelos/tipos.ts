/** Tipos de modelo de documento editável no Marple. */

export type TipoModeloDocumento =
  | 'peticao'
  | 'contrato_servicos'
  | 'contrato_honorarios'

export const TIPOS_MODELO: {
  id: TipoModeloDocumento
  rotulo: string
  descricao: string
  agentType: string
}[] = [
  {
    id: 'peticao',
    rotulo: 'Petição',
    descricao: 'Modelo base de petição previdenciária',
    agentType: 'modelo-peticao',
  },
  {
    id: 'contrato_servicos',
    rotulo: 'Contrato de prestação de serviços',
    descricao: 'Contrato de prestação de serviços advocatícios',
    agentType: 'modelo-contrato-servicos',
  },
  {
    id: 'contrato_honorarios',
    rotulo: 'Contrato de honorários',
    descricao: 'Contrato de honorários advocatícios',
    agentType: 'modelo-contrato-honorarios',
  },
]

export function rotuloTipoModelo(tipo: string | null | undefined): string {
  return TIPOS_MODELO.find((t) => t.id === tipo)?.rotulo || 'Modelo'
}

export function agentTypeDoModelo(tipo: TipoModeloDocumento): string {
  return TIPOS_MODELO.find((t) => t.id === tipo)?.agentType || 'modelo-documento'
}

export function isTipoModelo(v: string): v is TipoModeloDocumento {
  return TIPOS_MODELO.some((t) => t.id === v)
}

/** Modelo padrão do sistema (versionado em código — protegido). */
export interface ModeloPadrao {
  id: string
  tipo: TipoModeloDocumento
  nome: string
  descricao: string
  /** Versão do conteúdo padrão. Incrementar ao alterar o texto. */
  versao: number
  conteudo: string
}

/** Cópia do escritório / advogado (persistida em `lawyer_templates`). */
export interface ModeloEscritorio {
  id: string
  lawyer_id: string
  nome: string
  tipo: TipoModeloDocumento
  conteudo: string
  origem_padrao_id: string | null
  versao_padrao: number | null
  created_at: string
  updated_at: string
}

/** Item unificado para listagem (padrão + cópias). */
export interface ModeloListagem {
  /** id do padrão (`padrao:...`) ou uuid da cópia */
  id: string
  nome: string
  tipo: TipoModeloDocumento
  descricao?: string
  conteudo: string
  origem: 'padrao' | 'escritorio'
  origem_padrao_id: string | null
  versao: number | null
  atualizadoEm: string | null
  protegido: boolean
}

export function idPadrao(padraoId: string): string {
  return `padrao:${padraoId}`
}

export function isIdPadrao(id: string): boolean {
  return id.startsWith('padrao:')
}

export function extrairIdPadrao(id: string): string | null {
  return isIdPadrao(id) ? id.slice('padrao:'.length) : null
}
