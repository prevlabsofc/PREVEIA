'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, EyeOff } from 'lucide-react'
import { DownloadButtons } from '@/components/DownloadButtons'
import { AvisoCitacao } from '@/components/AvisoCitacao'
import { PeticaoPreview } from '@/components/peticao/PeticaoPreview'
import { SalvarAcessoPeticao } from '@/components/peticao/SalvarAcessoPeticao'
import type { DadosAdvogadoPeticao, EstiloPeticao } from '@/lib/peticao-export'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Props = {
  text: string
  onChange?: (text: string) => void
  fileName?: string
  estilo: EstiloPeticao
  streaming?: boolean
  editable?: boolean
  isLight?: boolean
  /** Se informado, evita refetch; senão carrega de /configuracoes. */
  adv?: DadosAdvogadoPeticao | null
  corPeticao?: string
  /** Tipo do agente — aciona template dedicado no PDF (ex.: SM rural). */
  agentType?: string | null
  clientId?: string | null
  clientName?: string | null
}

/**
 * Layout dividido: editor à esquerda, prévia PDF à direita (mobile: toggle).
 */
export function PeticaoEditorComPreview({
  text,
  onChange,
  fileName = 'peticao-marple',
  estilo,
  streaming,
  editable = true,
  isLight,
  adv: advProp,
  corPeticao,
  agentType = null,
  clientId = null,
  clientName = null,
}: Props) {
  const [advLoaded, setAdvLoaded] = useState<DadosAdvogadoPeticao>({})
  const [showPreview, setShowPreview] = useState(true)
  const [draft, setDraft] = useState(text)

  useEffect(() => {
    setDraft(text)
  }, [text])

  useEffect(() => {
    if (advProp) return
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
      setAdvLoaded((data || {}) as DadosAdvogadoPeticao)
    }
    load()
  }, [advProp])

  const adv = advProp || advLoaded

  function handleEdit(v: string) {
    setDraft(v)
    onChange?.(v)
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <label
          className="text-[10px] font-bold tracking-widest"
          style={{ color: 'rgba(212,175,55,0.7)' }}
        >
          PETIÇÃO GERADA
        </label>
        <div className="flex gap-2 items-center flex-wrap">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="lg:hidden px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPreview ? 'Ocultar prévia' : 'Ver prévia PDF'}
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(draft)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
          >
            📋 Copiar
          </button>
          <DownloadButtons
            text={draft}
            fileName={fileName}
            estiloOverride={estilo}
            advOverride={adv}
            pedirConfirmacaoDados
            agentType={agentType}
            previewFirst
          />
        </div>
      </div>

      <div className={`grid gap-3 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: isLight ? '#fff' : '#050300',
            border: '1px solid rgba(212,175,55,0.15)',
            minHeight: 320,
          }}
        >
          {editable && !streaming ? (
            <textarea
              value={draft}
              onChange={(e) => handleEdit(e.target.value)}
              className="w-full h-full min-h-[320px] max-h-[70vh] p-4 font-mono text-xs leading-relaxed resize-y outline-none"
              style={{
                background: 'transparent',
                color: isLight ? '#374151' : '#ccc',
              }} spellCheck={true} />
          ) : (
            <div
              className="p-4 font-mono text-xs leading-relaxed overflow-auto max-h-[70vh] whitespace-pre-wrap"
              style={{ color: isLight ? '#374151' : '#ccc' }}
            >
              {draft}
              {streaming && (
                <span className="inline-block w-2 h-4 bg-yellow-500 ml-1 animate-pulse" />
              )}
            </div>
          )}
        </div>

        <div
          className={`rounded-xl overflow-hidden ${showPreview ? 'block' : 'hidden lg:block'}`}
          style={{
            background: isLight ? '#E8E8E8' : '#1a1a16',
            border: '1px solid rgba(212,175,55,0.15)',
            minHeight: 320,
            maxHeight: '70vh',
          }}
        >
          <div
            className="px-3 py-2 text-[10px] font-bold tracking-widest"
            style={{
              color: 'rgba(212,175,55,0.7)',
              borderBottom: '1px solid rgba(212,175,55,0.1)',
            }}
          >
            PRÉVIA PDF · margens 3cm / 2cm
          </div>
          <div className="p-3 overflow-auto" style={{ maxHeight: 'calc(70vh - 36px)' }}>
            <PeticaoPreview
              text={draft}
              adv={adv}
              estilo={estilo}
              corPeticao={corPeticao || adv.cor_peticao || undefined}
              agentType={agentType}
            />
          </div>
        </div>
      </div>

      {!streaming && <AvisoCitacao text={draft} className="mt-2" />}

      {!streaming && draft.trim().length > 40 && (
        <SalvarAcessoPeticao
          text={draft}
          fileName={fileName}
          agentType={agentType}
          clientId={clientId}
          clientName={clientName}
          streaming={streaming}
          isLight={isLight}
        />
      )}
    </div>
  )
}
