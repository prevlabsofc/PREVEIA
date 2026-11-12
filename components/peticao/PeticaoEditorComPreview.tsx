'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Check, Eye, EyeOff, Loader2, Pencil } from 'lucide-react'
import { DownloadButtons } from '@/components/DownloadButtons'
import { AvisoCitacao } from '@/components/AvisoCitacao'
import { PeticaoPreview } from '@/components/peticao/PeticaoPreview'
import { PeticaoRichEditor } from '@/components/peticao/PeticaoRichEditor'
import { SalvarAcessoPeticao } from '@/components/peticao/SalvarAcessoPeticao'
import type { DadosAdvogadoPeticao, EstiloPeticao } from '@/lib/peticao-export'
import {
  chaveRascunhoPeticao,
  gravarRascunhoPeticao,
  lerRascunhoPeticao,
} from '@/lib/peticao-rascunho'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const AUTOSAVE_MS = 3000

type Props = {
  text: string
  onChange?: (text: string) => void
  fileName?: string
  onFileNameChange?: (name: string) => void
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
  /** Persistir no banco (aba Documentos). */
  documentId?: string | null
  onSaved?: (payload: { title: string; content: string }) => void
  /** Layout: lado a lado (desktop) ou alternância editar/visualizar. */
  layoutMode?: 'split' | 'tabs'
  /**
   * Alerta amarelo (ex.: ausência de prova rural). Só exibe se informado.
   * Não altera o layout geral — faixa discreta acima do editor.
   */
  alertaAmarelo?: string | null
}

function formatarHoraSalvo(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Área Documento: editor rich text + prévia PDF, rename, salvar/autosave.
 * Edições do usuário têm prioridade; localStorage é fallback se o backend falhar.
 */
export function PeticaoEditorComPreview({
  text,
  onChange,
  fileName = 'peticao-marple',
  onFileNameChange,
  estilo,
  streaming,
  editable = true,
  isLight,
  adv: advProp,
  corPeticao,
  agentType = null,
  clientId = null,
  clientName = null,
  documentId = null,
  onSaved,
  layoutMode = 'split',
  alertaAmarelo = null,
}: Props) {
  const [advLoaded, setAdvLoaded] = useState<DadosAdvogadoPeticao>({})
  const [showPreview, setShowPreview] = useState(true)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [draft, setDraft] = useState(text)
  const [titleDraft, setTitleDraft] = useState(fileName)
  const [editingTitle, setEditingTitle] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [salvoEm, setSalvoEm] = useState<Date | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const hydratedRef = useRef(false)

  const draftKey = chaveRascunhoPeticao({
    documentId,
    clientId,
    agentType,
    fileName,
  })

  useEffect(() => {
    setDraft(text)
  }, [text])

  useEffect(() => {
    setTitleDraft(fileName)
  }, [fileName])

  // Restaura rascunho local (fallback) — só em documento persistido ou após refresh com texto.
  useEffect(() => {
    if (streaming || hydratedRef.current) return
    hydratedRef.current = true
    // Evita sobrescrever petição recém-gerada com rascunho antigo da mesma chave.
    if (!documentId) return
    const local = lerRascunhoPeticao(draftKey)
    if (!local?.content?.trim()) return
    const externo = (text || '').trim()
    if (local.content === externo) return
    // Preferir rascunho local se o usuário editou offline / deu refresh.
    if (local.updatedAt > Date.now() - 1000 * 60 * 60 * 24) {
      setDraft(local.content)
      onChange?.(local.content)
      if (local.title && local.title !== fileName) {
        setTitleDraft(local.title)
        onFileNameChange?.(local.title)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hidrata 1x por chave
  }, [draftKey, streaming, documentId])

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus()
  }, [editingTitle])

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

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  // Persiste rascunho ao sair da página / ocultar aba.
  useEffect(() => {
    function flush() {
      if (streaming) return
      gravarRascunhoPeticao(draftKey, { title: titleDraft, content: draft })
    }
    function onVis() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVis)
      flush()
    }
  }, [draft, titleDraft, draftKey, streaming])

  const adv = advProp || advLoaded
  const useTabs = layoutMode === 'tabs'
  // Texto vai direto; o debounce/batch fica no PeticaoPreview (bridge interno).
  const previewText = draft

  async function persist(nextTitle: string, nextContent: string) {
    if (streaming) return
    gravarRascunhoPeticao(draftKey, { title: nextTitle, content: nextContent })

    if (!documentId) {
      setSaveStatus('saving')
      onFileNameChange?.(nextTitle)
      onChange?.(nextContent)
      onSaved?.({ title: nextTitle.trim() || 'Petição', content: nextContent })
      const agora = new Date()
      setSalvoEm(agora)
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 4000)
      return
    }

    setSaveStatus('saving')
    const { error } = await supabase
      .from('documents')
      .update({
        title: nextTitle.trim() || 'Petição',
        content: nextContent,
      })
      .eq('id', documentId)

    if (error) {
      setSaveStatus('error')
      return
    }
    const agora = new Date()
    setSalvoEm(agora)
    setSaveStatus('saved')
    onSaved?.({ title: nextTitle.trim() || 'Petição', content: nextContent })
    window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 4000)
  }

  function scheduleSave(nextTitle: string, nextContent: string) {
    if (streaming) return
    setSaveStatus('dirty')
    gravarRascunhoPeticao(draftKey, { title: nextTitle, content: nextContent })
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persist(nextTitle, nextContent)
    }, AUTOSAVE_MS)
  }

  function handleEdit(v: string) {
    setDraft(v)
    onChange?.(v)
    scheduleSave(titleDraft, v)
  }

  function commitTitle(raw: string) {
    const next = (raw || '').trim() || 'peticao'
    setTitleDraft(next)
    setEditingTitle(false)
    onFileNameChange?.(next)
    scheduleSave(next, draft)
  }

  async function salvarAgora() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await persist(titleDraft, draft)
  }

  const showEditorPane = useTabs ? viewMode === 'edit' : true
  const showPreviewPane = useTabs ? viewMode === 'preview' : showPreview

  const statusLabel =
    saveStatus === 'dirty'
      ? 'Alterações não salvas'
      : saveStatus === 'saving'
        ? 'Salvando…'
        : saveStatus === 'saved' && salvoEm
          ? `Salvo às ${formatarHoraSalvo(salvoEm)}`
          : saveStatus === 'saved'
            ? 'Salvo'
            : saveStatus === 'error'
              ? 'Erro ao salvar — rascunho local mantido'
              : null

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editingTitle && editable && !streaming ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => commitTitle(titleDraft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitTitle(titleDraft)
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setTitleDraft(fileName)
                  setEditingTitle(false)
                }
              }}
              aria-label="Nome do documento"
              className="input-glass px-3 text-sm font-bold min-w-0 flex-1 max-w-md"
              style={{ height: 36 }}
              spellCheck={true}
            />
          ) : (
            <button
              type="button"
              disabled={!editable || Boolean(streaming)}
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-2 min-w-0 text-left group"
              title="Renomear documento"
            >
              <span
                className="text-sm font-bold truncate"
                style={{ color: isLight ? '#1E1E1E' : '#fff' }}
              >
                {titleDraft || 'Petição'}
              </span>
              {editable && !streaming && (
                <Pencil
                  size={12}
                  className="flex-shrink-0 opacity-60 group-hover:opacity-100"
                  style={{ color: '#D4AF37' }}
                  aria-hidden
                />
              )}
            </button>
          )}
          <span
            className="text-[10px] font-bold tracking-widest hidden sm:inline"
            style={{ color: 'rgba(212,175,55,0.55)' }}
          >
            DOCUMENTO
          </span>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {statusLabel && (
            <span
              className="text-[11px] flex items-center gap-1"
              style={{
                color:
                  saveStatus === 'error'
                    ? '#EF4444'
                    : saveStatus === 'saved'
                      ? '#22C55E'
                      : '#D4AF37',
              }}
              aria-live="polite"
            >
              {saveStatus === 'saving' && <Loader2 size={11} className="animate-spin" />}
              {saveStatus === 'saved' && <Check size={11} />}
              {statusLabel}
            </span>
          )}

          {editable && !streaming && (
            <button
              type="button"
              onClick={() => void salvarAgora()}
              disabled={saveStatus === 'saving'}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{
                background: 'rgba(212,175,55,0.15)',
                border: '1px solid rgba(212,175,55,0.35)',
                color: '#D4AF37',
              }}
            >
              Salvar
            </button>
          )}

          {useTabs ? (
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {(['edit', 'preview'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{
                    background: viewMode === m ? 'rgba(212,175,55,0.15)' : 'transparent',
                    color: viewMode === m ? '#D4AF37' : '#888',
                  }}
                >
                  {m === 'edit' ? 'Editar' : 'Visualizar'}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="lg:hidden px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
            >
              {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPreview ? 'Ocultar prévia' : 'Ver prévia'}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(draft)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}
          >
            Copiar
          </button>
          <DownloadButtons
            text={draft}
            fileName={titleDraft}
            estiloOverride={estilo}
            advOverride={adv}
            pedirConfirmacaoDados
            agentType={agentType}
            previewFirst
          />
        </div>
      </div>

      <div
        className={`grid gap-3 ${
          useTabs ? 'grid-cols-1' : showPreviewPane ? 'lg:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {showEditorPane && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: isLight ? '#fff' : '#050300',
              border: '1px solid rgba(212,175,55,0.15)',
              minHeight: 320,
            }}
          >
            {alertaAmarelo ? (
              <div
                role="status"
                className="px-4 py-2.5 text-xs leading-snug"
                style={{
                  background: 'rgba(234,179,8,0.14)',
                  borderBottom: '1px solid rgba(234,179,8,0.45)',
                  color: isLight ? '#92400e' : '#fbbf24',
                }}
              >
                {alertaAmarelo}
              </div>
            ) : null}
            {editable ? (
              <PeticaoRichEditor
                value={draft}
                onChange={handleEdit}
                readOnly={Boolean(streaming)}
                streaming={Boolean(streaming)}
                isLight={isLight}
                minHeight={420}
              />
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
            {streaming && editable && (
              <div className="px-4 pb-2 text-[10px]" style={{ color: '#D4AF37' }}>
                Gerando… a edição fica liberada ao concluir.
              </div>
            )}
          </div>
        )}

        {showPreviewPane && (
          <div
            className={
              useTabs
                ? 'rounded-xl overflow-hidden flex flex-col'
                : showPreview
                  ? 'rounded-xl overflow-hidden flex flex-col'
                  : 'rounded-xl overflow-hidden hidden lg:flex lg:flex-col'
            }
            style={{
              background: isLight ? '#E8E8E8' : '#1a1a16',
              border: '1px solid rgba(212,175,55,0.15)',
              minHeight: 320,
              maxHeight: '70vh',
              contain: 'content',
            }}
          >
            <div
              className="px-3 py-2 text-[10px] font-bold tracking-widest flex items-center justify-between gap-2 flex-shrink-0"
              style={{
                color: 'rgba(212,175,55,0.7)',
                borderBottom: '1px solid rgba(212,175,55,0.1)',
              }}
            >
              <span>
                {streaming
                  ? 'PRÉVIA · gerando (texto ao vivo)'
                  : 'PRÉVIA · Times 12pt · espaçamento 1,5 · margens ABNT'}
              </span>
              {streaming && (
                <span
                  className="font-medium tracking-normal normal-case"
                  style={{ color: '#D4AF37' }}
                  aria-live="polite"
                >
                  Gerando…
                </span>
              )}
            </div>
            {/* Um único scroll: o host do PeticaoPreview (evita tremor por scroll aninhado). */}
            <div
              className="p-3 flex-1 min-h-0"
              style={{
                contain: 'layout',
                overflowAnchor: 'none',
              }}
            >
              <PeticaoPreview
                text={previewText}
                adv={adv}
                estilo={estilo}
                corPeticao={corPeticao || adv.cor_peticao || undefined}
                agentType={agentType}
                streaming={Boolean(streaming)}
                debounceMs={150}
                streamingDebounceMs={80}
                className="h-full max-h-[calc(70vh-48px)]"
              />
            </div>
          </div>
        )}
      </div>

      {!streaming && <AvisoCitacao text={draft} className="mt-2" />}

      {!streaming && draft.trim().length > 40 && (
        <SalvarAcessoPeticao
          text={draft}
          fileName={titleDraft}
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
