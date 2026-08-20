'use client'

import { useEffect } from 'react'
import { Download, FileText, Loader2, X } from 'lucide-react'

type Props = {
  open: boolean
  fileName: string
  /** URL do blob PDF (object URL). */
  pdfUrl: string | null
  gerando: boolean
  baixando: boolean
  erro?: string | null
  onBaixarPdf: () => void
  onBaixarDocx: () => void
  onClose: () => void
}

/**
 * Preview em tela cheia do PDF gerado (iframe + blob URL)
 * antes do download — scroll nativo entre páginas no viewer do browser.
 */
export function ModalVisualizarPeticao({
  open,
  fileName,
  pdfUrl,
  gerando,
  baixando,
  erro,
  onBaixarPdf,
  onBaixarDocx,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const busy = gerando || baixando

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: '#0c0c0a' }}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar documento"
    >
      <header
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0 flex-wrap"
        style={{
          borderBottom: '1px solid rgba(212,175,55,0.2)',
          background: '#12120e',
        }}
      >
        <FileText size={18} color="#D4AF37" className="flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: '#eee' }}>
            Visualizar documento
          </div>
          <div className="text-[11px] truncate" style={{ color: '#888' }}>
            {fileName}.pdf
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBaixarPdf}
            disabled={busy || !pdfUrl}
            className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg,#D4AF37,#F0D060)',
              color: '#000',
            }}
          >
            {baixando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Baixar PDF
          </button>
          <button
            type="button"
            onClick={onBaixarDocx}
            disabled={busy}
            className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            style={{ border: '1px solid rgba(59,130,246,0.4)', color: '#3B82F6' }}
          >
            {baixando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Baixar DOCX
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={gerando}
            className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#aaa' }}
            aria-label="Fechar"
          >
            <X size={14} />
            Fechar
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 relative" style={{ background: '#1a1a16' }}>
        {gerando && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin" color="#D4AF37" />
            <p className="text-sm" style={{ color: '#bbb' }}>
              Gerando preview do PDF…
            </p>
          </div>
        )}

        {erro && !gerando && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm" style={{ color: '#EF4444' }}>
              {erro}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#aaa' }}
            >
              Fechar
            </button>
          </div>
        )}

        {pdfUrl && !erro && (
          <iframe
            title={`Preview — ${fileName}`}
            src={pdfUrl}
            className="w-full h-full border-0"
            style={{ background: '#525659' }}
          />
        )}
      </div>
    </div>
  )
}
