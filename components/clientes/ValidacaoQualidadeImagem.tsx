'use client'

import { AlertTriangle, Upload, Save } from 'lucide-react'
import {
  descreverProblemas,
  type ResultadoQualidade,
} from '@/lib/qualidade-imagem'

type PropsModal = {
  aberto: boolean
  nomeArquivo: string
  resultado: ResultadoQualidade | null
  salvando?: boolean
  onReenviar: () => void
  onSalvarMesmoAssim: () => void
}

/**
 * Modal de aviso: a imagem falhou na análise de qualidade, mas o save
 * permanece permitido (marca `qualidade_pendente` no banco).
 */
export function ModalQualidadeImagem({
  aberto,
  nomeArquivo,
  resultado,
  salvando = false,
  onReenviar,
  onSalvarMesmoAssim,
}: PropsModal) {
  if (!aberto || !resultado) return null

  const detalhe = descreverProblemas(resultado.problemas)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qualidade-imagem-titulo"
      onClick={onReenviar}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#0A0A0A', border: '1px solid rgba(245,158,11,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)' }}
          >
            <AlertTriangle size={18} color="#F59E0B" />
          </div>
          <div>
            <h3
              id="qualidade-imagem-titulo"
              className="font-bold text-white text-sm mb-1"
            >
              Imagem com baixa qualidade — recomenda-se reenviar
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Você pode salvar mesmo assim. O arquivo ficará marcado como{' '}
              <span style={{ color: '#F59E0B' }}>qualidade a confirmar</span>.
            </p>
          </div>
        </div>

        <div
          className="rounded-xl px-3 py-2.5 mb-4 text-xs"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-gray-300 truncate mb-1">{nomeArquivo}</div>
          {detalhe && (
            <div style={{ color: '#F59E0B' }}>Motivo: {detalhe}</div>
          )}
          <div className="text-gray-500 mt-1">
            {resultado.width}×{resultado.height}px · brilho {resultado.brilho} ·
            contraste {resultado.contraste} · nitidez {resultado.nitidez}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReenviar}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37' }}
          >
            <Upload size={14} /> Reenviar
          </button>
          <button
            type="button"
            onClick={onSalvarMesmoAssim}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: 'rgba(245,158,11,0.18)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.35)' }}
          >
            <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar mesmo assim'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Badge exibido na ficha do cliente / listagem de documentos. */
export function BadgeQualidadePendente() {
  return (
    <span
      className="text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap"
      style={{ background: 'rgba(245,158,11,0.14)', color: '#F59E0B' }}
      title="Arquivo salvo com aviso de baixa qualidade"
    >
      qualidade a confirmar
    </span>
  )
}
