/**
 * Extrai pontos enxutos do histórico do cliente para a ficha:
 * indeferimentos, petições/tentativas, documentos apresentados e anotações.
 */

import { CHECKLIST_ANEXO_AGENT_TYPE } from '@/lib/checklist-inss'
import { EXTRACAO_PDF_AGENT_TYPE } from '@/lib/extracao-documento-pdf'
import { ehContratoHonorarios } from '@/lib/contrato-honorarios'
import type { ClientNote } from '@/lib/client-notes'

export type ItemHistoricoRelevante = {
  id: string
  texto: string
  data?: string | null
  tipo: 'anotacao' | 'documento' | 'peticao' | 'indeferimento' | 'beneficio' | 'extracao'
}

type DocHistorico = {
  id?: string
  title?: string | null
  agent_type?: string | null
  created_at?: string | null
  form_data?: Record<string, unknown> | null
  status?: string | null
}

const PALAVRAS_INDEFER = /indefer|negad|indeferimento|negativa|cessad/i
const PALAVRAS_BENEFICIO = /benefício|beneficio|recebia|recebeu|aposentad|auxílio|auxilio|BPC|LOAS/i

function textoAnotacao(texto: string): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (limpo.length <= 140) return limpo
  return `${limpo.slice(0, 137).trim()}…`
}

function classificarAnotacao(n: ClientNote): ItemHistoricoRelevante {
  let tipo: ItemHistoricoRelevante['tipo'] = 'anotacao'
  if (PALAVRAS_INDEFER.test(n.texto)) tipo = 'indeferimento'
  else if (PALAVRAS_BENEFICIO.test(n.texto)) tipo = 'beneficio'
  return {
    id: `note-${n.id}`,
    texto: textoAnotacao(n.texto),
    data: n.created_at,
    tipo,
  }
}

function rotuloDocumento(doc: DocHistorico): string {
  const fd = doc.form_data || {}
  const checklist =
    typeof fd.checklist_item === 'string' ? fd.checklist_item.trim() : ''
  const fileName =
    typeof fd.file_name === 'string' ? fd.file_name.trim() : ''
  return (doc.title || checklist || fileName || 'Documento').trim()
}

/**
 * Monta lista compacta (mais recente primeiro), no máximo `limite` itens.
 */
export function montarHistoricoRelevante(opts: {
  notes?: ClientNote[]
  documentos?: DocHistorico[]
  limite?: number
}): ItemHistoricoRelevante[] {
  const limite = opts.limite ?? 8
  const itens: ItemHistoricoRelevante[] = []

  for (const n of opts.notes || []) {
    if (!n.texto?.trim()) continue
    itens.push(classificarAnotacao(n))
  }

  for (const doc of opts.documentos || []) {
    const agent = String(doc.agent_type || '')
    const titulo = rotuloDocumento(doc)
    const data = doc.created_at
    const id = `doc-${doc.id || titulo}-${data || ''}`

    if (agent === CHECKLIST_ANEXO_AGENT_TYPE) {
      itens.push({
        id,
        texto: `Documento já apresentado: ${titulo}`,
        data,
        tipo: 'documento',
      })
      continue
    }

    if (agent === EXTRACAO_PDF_AGENT_TYPE) {
      itens.push({
        id,
        texto: `Documento judicial analisado: ${titulo}`,
        data,
        tipo: 'extracao',
      })
      continue
    }

    if (ehContratoHonorarios(agent)) continue

    if (agent && agent !== 'manual') {
      const ehIndefer = PALAVRAS_INDEFER.test(titulo)
      itens.push({
        id,
        texto: ehIndefer
          ? `Indeferimento / negativa registrada: ${titulo}`
          : `Tentativa anterior (petição): ${titulo}`,
        data,
        tipo: ehIndefer ? 'indeferimento' : 'peticao',
      })
      continue
    }

    if (agent === 'manual' || titulo) {
      itens.push({
        id,
        texto: `Histórico registrado: ${titulo}`,
        data,
        tipo: 'peticao',
      })
    }
  }

  itens.sort((a, b) => {
    const ta = a.data ? new Date(a.data).getTime() : 0
    const tb = b.data ? new Date(b.data).getTime() : 0
    return tb - ta
  })

  const vistos = new Set<string>()
  const unicos: ItemHistoricoRelevante[] = []
  for (const item of itens) {
    const chave = `${item.tipo}|${item.texto.toLowerCase()}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    unicos.push(item)
    if (unicos.length >= limite) break
  }
  return unicos
}
