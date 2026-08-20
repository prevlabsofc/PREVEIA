/**
 * Tipos de `documents.agent_type` usados para contratos de honorários.
 *
 * Reaproveita os mesmos rótulos já cadastrados no catálogo de /agentes
 * (grupo "Documentos do Escritório") para que um contrato apareça como
 * "Contrato" tanto se vier daquele fluxo genérico quanto do fluxo dedicado
 * de /honorarios — ambos gravam na mesma tabela `documents`.
 */
export const CONTRATO_HONORARIOS_EXITO_AGENT_TYPE = 'contrato-honorarios-exito'
export const CONTRATO_HONORARIOS_FIXO_AGENT_TYPE = 'contrato-honorarios-fixo'
export const CONTRATO_HONORARIOS_MISTO_AGENT_TYPE = 'contrato-honorarios-misto'

export type TipoHonorarioContrato = 'percentual' | 'fixo' | 'misto'

export function agentTypeContratoHonorarios(tipoHonorario: string): string {
  if (tipoHonorario === 'fixo') return CONTRATO_HONORARIOS_FIXO_AGENT_TYPE
  if (tipoHonorario === 'misto') return CONTRATO_HONORARIOS_MISTO_AGENT_TYPE
  return CONTRATO_HONORARIOS_EXITO_AGENT_TYPE
}

/** Identifica qualquer documento de contrato de honorários, de qualquer origem. */
export function ehContratoHonorarios(agentType?: string | null): boolean {
  return typeof agentType === 'string' && agentType.startsWith('contrato-honorarios')
}

export function rotuloTipoContratoHonorarios(agentType?: string | null): string {
  if (agentType === CONTRATO_HONORARIOS_FIXO_AGENT_TYPE) return 'Valor Fixo'
  if (agentType === CONTRATO_HONORARIOS_MISTO_AGENT_TYPE) return 'Misto'
  if (agentType === CONTRATO_HONORARIOS_EXITO_AGENT_TYPE) return 'Percentual (Êxito)'
  return 'Contrato'
}
