'use client'

import { useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'

/**
 * A6 — link/viewer do acórdão original quando `url_original` está preenchida.
 *
 * Portais de tribunais BR costumam enviar X-Frame-Options / CSP frame-ancestors
 * que deixam iframe em branco. Por isso o caminho padrão é abrir em nova aba.
 * Só tentamos embed quando a URL parece ser PDF (mais realista de embutir).
 */

function sanitizarUrl(raw?: string | null): string | null {
  if (!raw) return null
  const t = raw.trim()
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

function parecePdf(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase()
    return path.endsWith('.pdf') || path.includes('.pdf?')
  } catch {
    return /\.pdf(\?|$)/i.test(url)
  }
}

/** A6 — link/viewer do acórdão original quando `url_original` está preenchida. */
export function UrlOriginalViewer({ url }: { url?: string | null }) {
  const safe = sanitizarUrl(url)
  const [aviso, setAviso] = useState(false)

  if (!safe) {
    return (
      <p className="text-[11px]" style={{ color: '#555' }}>
        Sem URL do acórdão original nesta base.
      </p>
    )
  }

  let host = safe
  try {
    host = new URL(safe).hostname.replace(/^www\./, '')
  } catch { /* ignore */ }

  const pdf = parecePdf(safe)

  return (
    <div className="space-y-2">
      <a
        href={safe}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setAviso(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
        style={{ border: '1px solid rgba(59,130,246,0.35)', color: '#3B82F6' }}
      >
        <FileText size={14} />
        Abrir acórdão na íntegra no site do tribunal
        <ExternalLink size={12} />
        <span style={{ color: '#666' }}>({host})</span>
      </a>

      {pdf && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#050505' }}
        >
          <iframe
            title="PDF do acórdão"
            src={safe}
            className="w-full"
            style={{ height: 280, border: 0 }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {aviso && (
        <p className="text-[10px]" style={{ color: '#666' }}>
          O portal do tribunal pode exigir login ou bloquear visualização embutida — por isso abrimos em nova aba.
        </p>
      )}
      {!pdf && (
        <p className="text-[10px]" style={{ color: '#555' }}>
          Páginas HTML de tribunais raramente permitem iframe; use o link acima.
        </p>
      )}
    </div>
  )
}
