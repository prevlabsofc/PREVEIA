'use client'

import { ArrowRight, Archive, Bot, ClipboardList, FileCheck2 } from 'lucide-react'
import {
  coresTomProximoPasso,
  recomendarProximoPasso,
  type ProximoPasso,
} from '@/lib/proximo-passo-cliente'
import type { DocChecklist } from '@/lib/checklist-inss'

interface Props {
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
  tipoBeneficio?: string | null
  isLight?: boolean
  onGerarPeticao?: () => void
  onIrDocumentos?: () => void
  onEditarCadastro?: () => void
}

function iconeAcao(passo: ProximoPasso) {
  if (passo.tom === 'arquivado') return Archive
  if (passo.tom === 'revisao') return FileCheck2
  if (passo.acao === 'gerar_peticao') return Bot
  if (passo.acao === 'documentos') return ClipboardList
  return FileCheck2
}

/**
 * Banner de destaque com o estado atual / próximo passo — fica no topo da ficha.
 */
export function ProximoPassoCliente({
  client,
  documentos,
  temPeticao = false,
  tipoBeneficio = null,
  isLight = false,
  onGerarPeticao,
  onIrDocumentos,
  onEditarCadastro,
}: Props) {
  const passo = recomendarProximoPasso({
    client: {
      ...client,
      tipo_beneficio: tipoBeneficio || client.tipo_beneficio,
    },
    documentos,
    temPeticao,
  })

  const cores = coresTomProximoPasso(passo.tom)
  const Icon = iconeAcao(passo)
  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'

  function executarAcao() {
    if (passo.acao === 'gerar_peticao') onGerarPeticao?.()
    else if (passo.acao === 'documentos') onIrDocumentos?.()
    else if (passo.acao === 'editar_cadastro') onEditarCadastro?.()
  }

  const rotuloBotao =
    passo.acao === 'gerar_peticao'
      ? passo.tom === 'revisao'
        ? 'Revisar petição'
        : 'Gerar petição'
      : passo.acao === 'documentos'
        ? 'Ver documentos'
        : passo.acao === 'editar_cadastro'
          ? 'Editar cadastro'
          : null

  const temAcao =
    Boolean(rotuloBotao) &&
    ((passo.acao === 'gerar_peticao' && onGerarPeticao) ||
      (passo.acao === 'documentos' && onIrDocumentos) ||
      (passo.acao === 'editar_cadastro' && onEditarCadastro))

  return (
    <div
      className="mb-6 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        background: isLight ? `${cores.accent}14` : cores.bg,
        border: `1px solid ${cores.border}`,
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${cores.accent}22` }}
      >
        <Icon size={20} color={cores.accent} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: cores.accent }}>
          PRÓXIMO PASSO
        </div>
        <div className="text-base sm:text-lg font-bold leading-snug" style={{ color: corTexto }}>
          {passo.titulo}
        </div>
        {passo.detalhe && (
          <p className="text-sm mt-1 break-words" style={{ color: corMuted }}>
            {passo.detalhe}
          </p>
        )}
      </div>
      {temAcao && rotuloBotao && (
        <button
          type="button"
          onClick={executarAcao}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-opacity hover:opacity-90 w-full sm:w-auto"
          style={{ background: cores.accent, color: '#111' }}
        >
          {rotuloBotao}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  )
}
