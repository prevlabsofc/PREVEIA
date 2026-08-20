'use client'

import { MessageCircle } from 'lucide-react'
import { telefoneParaWaMe } from '@/lib/aprovacao-cliente'

type Props = {
  pendingDocs: string[]
  /** Preferir `whatsapp`, senão `phone` do cliente. */
  phone?: string | null
  clientName?: string | null
}

export function montarMensagemDocsPendentes(
  clientName: string | null | undefined,
  pendingDocs: string[]
): string {
  const nome = clientName?.trim() || 'cliente'
  const lista = pendingDocs.map((d) => `- ${d}`).join('\n')
  return (
    `Olá, ${nome}. Para darmos andamento ao seu caso, ainda precisamos dos seguintes documentos:\n` +
    `${lista}\n` +
    `Poderia nos enviar, por favor?`
  )
}

/**
 * Abre wa.me com mensagem pré-preenchida listando documentos pendentes da checklist.
 * Sem API Business — só link wa.me.
 */
export function SolicitarDocsWhatsApp({ pendingDocs, phone, clientName }: Props) {
  if (!pendingDocs.length) return null

  const digits = telefoneParaWaMe(phone)
  const disabled = !digits
  const mensagem = montarMensagemDocsPendentes(clientName, pendingDocs)
  const href = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`
    : undefined

  return (
    <div className="mt-3">
      {disabled ? (
        <button
          type="button"
          disabled
          title="Cadastre o telefone do cliente para solicitar via WhatsApp"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
        >
          <MessageCircle size={13} /> Solicitar via WhatsApp
        </button>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
          style={{ border: '1px solid rgba(37,211,102,0.35)', color: '#25D366' }}
        >
          <MessageCircle size={13} /> Solicitar via WhatsApp
        </a>
      )}
      {disabled && (
        <p className="text-[10px] mt-1.5" style={{ color: '#888' }}>
          Cadastre o telefone do cliente para solicitar via WhatsApp
        </p>
      )}
    </div>
  )
}
