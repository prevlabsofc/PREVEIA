/**
 * Auto-arquivamento / status do cliente.
 * Banco: `clients.status` com valores `ativo` | `arquivado`.
 * Sem colunas `etapa_funil` / `arquivado` / `stage`.
 */

import {
  isFinalStage,
  normalizeStage,
  type ClientStage,
  type FinalStage,
} from '@/lib/client-stages'
import {
  isStatusArquivado,
  updateArquivadoPayload,
} from '@/lib/clients-schema'

export type StatusFinal = FinalStage

export type PatchArquivamento = {
  stage: ClientStage
  etapa_funil: ClientStage
  status: 'active' | 'archived'
  arquivado: boolean
  status_final: StatusFinal | null
}

export function isClienteArquivado(cliente: {
  status?: string | null
  arquivado?: boolean | null
}): boolean {
  return cliente.arquivado === true || isStatusArquivado(cliente.status)
}

/** Patch otimista ao mudar a etapa do funil (UI only para etapa). */
export function patchPorTransicaoEtapa(destino: unknown): PatchArquivamento {
  const stage = normalizeStage(destino)
  if (isFinalStage(stage)) {
    return {
      stage,
      etapa_funil: stage,
      status: 'archived',
      arquivado: true,
      status_final: stage as StatusFinal,
    }
  }
  return {
    stage,
    etapa_funil: stage,
    status: 'active',
    arquivado: false,
    status_final: null,
  }
}

/**
 * Payload enviado ao Supabase.
 * Sem coluna de etapa: só sincroniza arquivamento via `status`.
 */
export function updateEtapaPayload(destino: unknown): { status: string } {
  return updateArquivadoPayload(isFinalStage(normalizeStage(destino)))
}

export function rotuloStatusFinal(valor: unknown): string | null {
  if (valor === 'protocolado') return 'Protocolado'
  if (valor === 'concluido') return 'Concluído'
  return null
}
