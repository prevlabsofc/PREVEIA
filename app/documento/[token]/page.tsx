'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Download, FileText, Loader2 } from 'lucide-react'
import { DownloadButtons } from '@/components/DownloadButtons'
import type { DadosAdvogadoPeticao, EstiloPeticao } from '@/lib/peticao-export'
import { normalizarEstiloPeticao } from '@/lib/peticao-export'

type DocPublico = {
  title: string
  content: string
  agent_type: string | null
  client_name: string | null
  created_at: string | null
  lawyer_snapshot: DadosAdvogadoPeticao | null
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'indisponivel' }
  | { fase: 'ok'; doc: DocPublico }

export default function DocumentoPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })

  const carregar = useCallback(async (t: string) => {
    setEstado({ fase: 'carregando' })
    try {
      const res = await fetch(`/api/documento/${encodeURIComponent(t)}`, {
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error || !data.content) {
        setEstado({ fase: 'indisponivel' })
        return
      }
      setEstado({
        fase: 'ok',
        doc: {
          title: data.title || 'Documento',
          content: data.content,
          agent_type: data.agent_type || null,
          client_name: data.client_name || null,
          created_at: data.created_at || null,
          lawyer_snapshot: data.lawyer_snapshot || null,
        },
      })
    } catch {
      setEstado({ fase: 'indisponivel' })
    }
  }, [])

  useEffect(() => {
    if (token) void carregar(token)
  }, [token, carregar])

  function baixarTxt(doc: DocPublico) {
    const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(doc.title || 'documento').replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const estilo: EstiloPeticao = normalizarEstiloPeticao(
    estado.fase === 'ok' ? estado.doc.lawyer_snapshot?.estilo_peticao : 'moderno',
  )

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{
        background: 'linear-gradient(160deg, #0a0a08 0%, #141410 50%, #0c0c0a 100%)',
        color: '#eee',
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <div className="relative w-[22px] h-[22px] flex-shrink-0">
            <Image src="/logo.png" alt="Marple" fill className="object-contain" sizes="22px" />
          </div>
          <span className="font-bold text-lg" style={{ color: '#D4AF37' }}>
            Marple
          </span>
          <span className="text-xs ml-2" style={{ color: '#666' }}>
            Acesso ao documento
          </span>
        </div>

        {estado.fase === 'carregando' && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 size={28} className="animate-spin" color="#D4AF37" />
            <p className="text-sm" style={{ color: '#888' }}>
              Carregando documento…
            </p>
          </div>
        )}

        {estado.fase === 'indisponivel' && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#12120e' }}
          >
            <FileText size={36} color="#666" className="mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Link indisponível</h1>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              Este link de acesso não existe, expirou ou foi regenerado. Peça um novo
              link a quem gerou o documento.
            </p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'linear-gradient(135deg,#D4AF37,#F0D060)', color: '#000' }}
            >
              Entrar no Marple
            </Link>
          </div>
        )}

        {estado.fase === 'ok' && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(212,175,55,0.25)', background: '#12120e' }}
          >
            <div
              className="px-5 py-4 flex flex-wrap items-start justify-between gap-3"
              style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}
            >
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">{estado.doc.title}</h1>
                <p className="text-xs mt-1" style={{ color: '#888' }}>
                  {estado.doc.client_name ? `Cliente: ${estado.doc.client_name}` : 'Documento jurídico'}
                  {estado.doc.created_at
                    ? ` · ${new Date(estado.doc.created_at).toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
                <p className="text-[11px] mt-1" style={{ color: '#666' }}>
                  Acesso público via link — download sem login
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => baixarTxt(estado.doc)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#aaa' }}
                >
                  <Download size={12} />
                  Baixar TXT
                </button>
                <DownloadButtons
                  text={estado.doc.content}
                  fileName={(estado.doc.title || 'documento').replace(/\s+/g, '-').toLowerCase()}
                  estiloOverride={estilo}
                  advOverride={estado.doc.lawyer_snapshot}
                  pedirConfirmacaoDados={false}
                  previewFirst={false}
                  agentType={estado.doc.agent_type}
                />
              </div>
            </div>

            <div
              className="p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[70vh] overflow-auto"
              style={{ color: '#ccc', background: '#0a0a08' }}
            >
              {estado.doc.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
