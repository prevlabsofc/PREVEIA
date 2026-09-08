/**
 * Auto-arquivamento ao atingir etapa final do funil.
 *
 * Produção remota hoje: só `clients.status` ('active' | 'archived').
 * Colunas `etapa_funil` / `stage` / `arquivado` ainda não existem no projeto.
 */

import {
  isFinalStage,
  normalizeStage,
  type ClientStage,
  type FinalStage,
} from '@/lib/client-stages'
import { updateArquivadoPayload } from '@/lib/clients-schema'

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
  return cliente.arquivado === true || cliente.status === 'archived'
}

/** Patch otimista ao mudar a etapa do funil. */
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
 * Sem coluna de etapa no remoto: só sincroniza arquivamento via `status`.
 */
export function updateEtapaPayload(destino: unknown): { status: 'active' | 'archived' } {
  return updateArquivadoPayload(isFinalStage(normalizeStage(destino)))
}

export function rotuloStatusFinal(valor: unknown): string | null {
  if (valor === 'protocolado') return 'Protocolado'
  if (valor === 'concluido') return 'Concluído'
  return null
}
