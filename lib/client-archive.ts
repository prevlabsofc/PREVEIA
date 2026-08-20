/**
 * Auto-arquivamento ao atingir etapa final do funil (`clients.stage`).
 *
 * Reusa `clients.status` ('active' | 'archived') — já usado pelo filtro
 * Arquivados em /clientes. Complementa com `status_final` (rótulo Concluído /
 * Protocolado). A lógica canônica no banco é o trigger
 * `clients_auto_arquivar_etapa_final`; estes helpers espelham o efeito para
 * atualização otimista na UI.
 */

import {
  isFinalStage,
  normalizeStage,
  type ClientStage,
  type FinalStage,
} from '@/lib/client-stages'

export type StatusFinal = FinalStage

export type PatchArquivamento = {
  stage: ClientStage
  status: 'active' | 'archived'
  status_final: StatusFinal | null
}

export function isClienteArquivado(cliente: {
  status?: string | null
}): boolean {
  return cliente.status === 'archived'
}

/** Patch otimista ao mudar a etapa do funil. */
export function patchPorTransicaoEtapa(destino: unknown): PatchArquivamento {
  const stage = normalizeStage(destino)
  if (isFinalStage(stage)) {
    return {
      stage,
      status: 'archived',
      status_final: stage as StatusFinal,
    }
  }
  return {
    stage,
    status: 'active',
    status_final: null,
  }
}

/** Payload mínimo enviado ao Supabase (o trigger completa status/status_final). */
export function updateEtapaPayload(destino: unknown): { stage: ClientStage } {
  return { stage: normalizeStage(destino) }
}

export function rotuloStatusFinal(valor: unknown): string | null {
  if (valor === 'protocolado') return 'Protocolado'
  if (valor === 'concluido') return 'Concluído'
  return null
}
