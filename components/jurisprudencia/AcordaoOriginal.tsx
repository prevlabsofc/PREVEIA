'use client'

import { useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'

/**
 * Link para o acórdão original. Portais de tribunais costumam bloquear iframe
 * (X-Frame-Options), então abrimos em nova aba em vez de embutir.
 */
export function AcordaoOriginal({ url }: { url?: string | null }) {
  const [aviso, setAviso] = useState(false)
  if (!url) {
    return (
      <p className="text-[11px]" style={{ color: '#555' }}>
        Sem URL do acórdão original nesta jurisprudência.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.7)' }}>
        ACÓRDÃO ORIGINAL
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setAviso(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
        style={{ border: '1px solid rgba(59,130,246,0.35)', color: '#3B82F6' }}
      >
        <FileText size={14} />
        Abrir acórdão no tribunal
        <ExternalLink size={12} />
      </a>
      {aviso && (
        <p className="text-[10px]" style={{ color: '#666' }}>
          O portal do tribunal pode exigir login ou bloquear visualização embutida — por isso abrimos em nova aba.
        </p>
      )}
      <p className="text-[10px] break-all" style={{ color: '#444' }}>{url}</p>
    </div>
  )
}
