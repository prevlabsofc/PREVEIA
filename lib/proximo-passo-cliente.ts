/**
 * Estado / próximo passo óbvio na ficha do cliente.
 * Estados canônicos (pedido do produto):
 *  a) Faltam documentos obrigatórios: [lista]
 *  b) Pronto para gerar petição
 *  c) Petição gerada, aguardando revisão
 *  d) Aguardando documentos da cliente
 *  e) Caso arquivado / concluído
 */

import {
  avaliarChecklist,
  type DocChecklist,
  type ResultadoChecklist,
} from '@/lib/checklist-inss'
import { normalizeStage, type ClientStage } from '@/lib/client-stages'
import { isClienteArquivado } from '@/lib/client-archive'

export type TomProximoPasso = 'urgente' | 'atencao' | 'ok' | 'revisao' | 'arquivado'

export type ProximoPasso = {
  titulo: string
  detalhe?: string
  tom: TomProximoPasso
  acao?: 'gerar_peticao' | 'documentos' | 'editar_cadastro' | null
}

export function recomendarProximoPasso(opts: {
  client: {
    zone?: string | null
    tipo_beneficio?: string | null
    stage?: string | null
    etapa_funil?: string | null
    status?: string | null
    arquivado?: boolean | null
    name?: string | null
    cpf?: string | null
  }
  documentos: DocChecklist[]
  temPeticao?: boolean
}): ProximoPasso {
  const { client, documentos, temPeticao = false } = opts

  const stage = normalizeStage(client.stage || client.etapa_funil) as ClientStage

  if (isClienteArquivado(client) || stage === 'concluido' || stage === 'protocolado') {
    return {
      titulo: 'Caso arquivado / concluído',
      detalhe:
        stage === 'protocolado'
          ? 'Protocolado. Reative o cliente se precisar retomar o atendimento.'
          : 'Caso encerrado ou pausado. Reative se precisar retomar o atendimento.',
      tom: 'arquivado',
      acao: null,
    }
  }

  const tipoBeneficio = client.tipo_beneficio || null

  const checklist: ResultadoChecklist = avaliarChecklist(
    { tipo_beneficio: tipoBeneficio },
    documentos
  )

  if (temPeticao) {
    return {
      titulo: 'Petição gerada, aguardando revisão',
      detalhe: 'Confira o texto no histórico antes de protocolar ou enviar à cliente.',
      tom: 'revisao',
      acao: 'gerar_peticao',
    }
  }

  if (!checklist.ok) {
    if (documentos.length === 0) {
      return {
        titulo: 'Aguardando documentos da cliente',
        detalhe:
          'Defina o tipo de benefício e anexe as provas obrigatórias para liberar a petição.',
        tom: 'atencao',
        acao: 'documentos',
      }
    }
    return {
      titulo: 'Aguardando documentos da cliente',
      detalhe: checklist.motivo,
      tom: 'atencao',
      acao: 'documentos',
    }
  }

  if (checklist.pendentes.length > 0) {
    if (documentos.length === 0) {
      return {
        titulo: 'Aguardando documentos da cliente',
        detalhe: `Checklist de ${checklist.rotulo}: ainda sem anexos.`,
        tom: 'atencao',
        acao: 'documentos',
      }
    }
    const lista = checklist.pendentes.join(', ')
    return {
      titulo: `Faltam documentos obrigatórios: ${lista}`,
      detalhe: checklist.rotulo,
      tom: 'urgente',
      acao: 'documentos',
    }
  }

  return {
    titulo: 'Pronto para gerar petição',
    detalhe: 'Documentação em dia. Próximo passo: elaborar a peça.',
    tom: 'ok',
    acao: 'gerar_peticao',
  }
}

export function coresTomProximoPasso(tom: TomProximoPasso): {
  bg: string
  border: string
  accent: string
} {
  switch (tom) {
    case 'urgente':
      return {
        bg: 'rgba(239,68,68,0.12)',
        border: 'rgba(239,68,68,0.35)',
        accent: '#EF4444',
      }
    case 'atencao':
      return {
        bg: 'rgba(245,158,11,0.14)',
        border: 'rgba(245,158,11,0.4)',
        accent: '#EAB308',
      }
    case 'ok':
      return {
        bg: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.35)',
        accent: '#22C55E',
      }
    case 'revisao':
      return {
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.35)',
        accent: '#3B82F6',
      }
    case 'arquivado':
    default:
      return {
        bg: 'rgba(148,163,184,0.12)',
        border: 'rgba(148,163,184,0.35)',
        accent: '#94A3B8',
      }
  }
}
