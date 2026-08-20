'use client'

import { AlertCircle, Check } from 'lucide-react'
import type { Feedback } from './clientes-shared'

/** Aviso flutuante de sucesso/erro. Local ao componente porque o app ainda não
 *  monta um provider global de toasts no layout. */
export default function FeedbackToast({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  const erro = feedback.tipo === 'erro'
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-start gap-2 px-4 py-3 rounded-xl text-xs font-medium max-w-sm"
      style={{
        background: erro ? 'rgba(40,10,10,0.96)' : 'rgba(10,30,15,0.96)',
        border: `1px solid ${erro ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)'}`,
        color: erro ? '#FCA5A5' : '#86EFAC',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}
    >
      {erro ? (
        <AlertCircle size={14} className="mt-px flex-shrink-0" />
      ) : (
        <Check size={14} className="mt-px flex-shrink-0" />
      )}
      <span>{feedback.texto}</span>
    </div>
  )
}
