'use client'

import { memo, useEffect, useRef, useState } from 'react'
import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  A4_HEIGHT_PX,
  A4_WIDTH_PX,
  normalizarEstiloPeticao,
} from '@/lib/peticao-export'
import { montarHtmlPeticao } from '@/lib/montar-html-peticao'
import { comAssinaturaEscritorio } from '@/lib/assinatura-pdf-cliente'

type Props = {
  text: string
  adv: DadosAdvogadoPeticao | null
  estilo: EstiloPeticao
  corPeticao?: string
  /** Debounce após edição manual (ms). */
  debounceMs?: number
  /** Debounce leve durante streaming (ms) — evita reparse a cada token. */
  streamingDebounceMs?: number
  className?: string
  agentType?: string | null
  /** Gera indicador sutil e estabiliza layout/scroll/template. */
  streaming?: boolean
}

const PLACEHOLDER_HTML =
  '<div class="pdf-page"><p style="padding:2cm;color:#888">Prévia da petição…</p></div>'

const LOADING_LOGO_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

/**
 * Bridge: recebe text a cada token, mas só propaga ao preview caro em batches.
 * O memo interno evita >~10 renders/s no DOM formatado/plano.
 */
export const PeticaoPreview = memo(function PeticaoPreview(props: Props) {
  const {
    text,
    streaming = false,
    debounceMs = 150,
    streamingDebounceMs = 80,
  } = props

  const latestTextRef = useRef(text)
  latestTextRef.current = text
  const wasStreamingRef = useRef(streaming)

  const [stableText, setStableText] = useState(text)
  const delay = streaming ? streamingDebounceMs : debounceMs

  useEffect(() => {
    const streamEnded = wasStreamingRef.current && !streaming
    wasStreamingRef.current = streaming

    // Ao concluir o stream, flush imediato para montar o HTML formatado.
    if (streamEnded) {
      setStableText(latestTextRef.current)
      return
    }

    const t = window.setTimeout(() => {
      setStableText(latestTextRef.current)
    }, delay)
    return () => window.clearTimeout(t)
  }, [text, streaming, delay])

  return (
    <PeticaoPreviewInner
      {...props}
      text={stableText}
      streaming={streaming}
    />
  )
})

type InnerProps = Props & { text: string; streaming: boolean }

const PeticaoPreviewInner = memo(function PeticaoPreviewInner({
  text,
  adv,
  estilo,
  corPeticao,
  className = '',
  agentType = null,
  streaming = false,
}: InnerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const lastGoodHtmlRef = useRef('')
  const streamingRef = useRef(streaming)
  streamingRef.current = streaming
  const followEndRef = useRef(true)
  const renderCountRef = useRef(0)
  const renderWindowStartRef = useRef(0)

  const [html, setHtml] = useState('')
  const [scale, setScale] = useState(0.55)
  const [innerH, setInnerH] = useState(A4_HEIGHT_PX)

  // Medição DEV: renders/s do preview interno (meta < 10 durante stream).
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (!renderWindowStartRef.current) renderWindowStartRef.current = now
    renderCountRef.current += 1
    const elapsed = now - renderWindowStartRef.current
    if (elapsed < 1000) return
    const rps = (renderCountRef.current * 1000) / elapsed
    if (streaming) {
      // eslint-disable-next-line no-console
      console.debug(`[PeticaoPreview] ~${rps.toFixed(1)} renders/s (streaming)`)
    }
    renderCountRef.current = 0
    renderWindowStartRef.current = now
  })

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null)

  async function urlToDataUrlPreview(src: string): Promise<string | null> {
    const trimmed = src.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('data:')) return trimmed
    if (!/^https?:\/\//i.test(trimmed)) return trimmed

    try {
      const res = await fetch('/api/logo-data-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (!res.ok) return null

      const json = (await res.json().catch(() => ({}))) as { dataUrl?: string }
      if (json.dataUrl?.startsWith('data:')) return json.dataUrl
      return null
    } catch {
      return null
    }
  }

  useEffect(() => {
    let cancelled = false

    async function run() {
      const rawLogo = adv?.logo_url ? String(adv.logo_url) : ''
      const rawBanner = adv?.banner_url ? String(adv.banner_url) : ''

      const logoNeedsProxy =
        Boolean(rawLogo) && !rawLogo.startsWith('data:') && /^https?:\/\//i.test(rawLogo)
      const bannerNeedsProxy =
        Boolean(rawBanner) && !rawBanner.startsWith('data:') && /^https?:\/\//i.test(rawBanner)

      setLogoDataUrl((prev) => {
        if (logoNeedsProxy) {
          if (prev && prev !== LOADING_LOGO_DATA_URL && prev.startsWith('data:')) return prev
          return LOADING_LOGO_DATA_URL
        }
        return rawLogo.startsWith('data:') ? rawLogo : null
      })
      setBannerDataUrl(bannerNeedsProxy ? null : rawBanner || null)

      if (!logoNeedsProxy && !bannerNeedsProxy) {
        if (rawLogo && !rawLogo.startsWith('data:') && !/^https?:\/\//i.test(rawLogo)) {
          setLogoDataUrl(null)
        }
        return
      }

      const [convertedLogo, convertedBanner] = await Promise.all([
        logoNeedsProxy
          ? urlToDataUrlPreview(rawLogo)
          : Promise.resolve(rawLogo.startsWith('data:') ? rawLogo : null),
        bannerNeedsProxy
          ? urlToDataUrlPreview(rawBanner)
          : Promise.resolve(rawBanner || null),
      ])

      if (cancelled) return
      setLogoDataUrl(convertedLogo)
      setBannerDataUrl(convertedBanner)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [adv?.logo_url, adv?.banner_url])

  const [assinatura, setAssinatura] = useState<DadosAdvogadoPeticao['assinatura']>(null)
  useEffect(() => {
    let cancelled = false
    if (!adv) {
      setAssinatura(null)
      return
    }
    void comAssinaturaEscritorio(adv).then((a) => {
      if (!cancelled) setAssinatura(a.assinatura ?? null)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adv?.signature_url, adv?.assinatura])

  // Nova geração: limpa HTML formatado anterior.
  useEffect(() => {
    if ((text || '').trim()) return
    lastGoodHtmlRef.current = ''
    setHtml('')
    setInnerH(A4_HEIGHT_PX)
  }, [text])

  // HTML formatado completo só fora do streaming (1 parse pesado ao concluir).
  useEffect(() => {
    if (streaming) return
    if (!(text || '').trim()) return

    const advForRender: DadosAdvogadoPeticao = {
      ...(adv || {}),
      logo_url: logoDataUrl,
      banner_url: bannerDataUrl,
      assinatura,
    }

    const next = montarHtmlPeticao({
      text: text || '',
      adv: advForRender,
      estilo: normalizarEstiloPeticao(estilo),
      corPeticao,
      comMargens: true,
      agentType,
      estabilizarPreview: false,
    })

    const resolved = next || lastGoodHtmlRef.current
    if (!resolved || resolved === lastGoodHtmlRef.current) return

    const host = hostRef.current
    const scrollTop = host?.scrollTop ?? 0
    const scrollLeft = host?.scrollLeft ?? 0

    lastGoodHtmlRef.current = resolved
    setHtml(resolved)

    requestAnimationFrame(() => {
      if (!host) return
      host.scrollTop = scrollTop
      host.scrollLeft = scrollLeft
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    streaming,
    estilo,
    corPeticao,
    agentType,
    logoDataUrl,
    bannerDataUrl,
    assinatura,
    adv?.name,
    adv?.office_name,
    adv?.oab_number,
    adv?.oab_uf,
    adv?.email,
    adv?.cor_peticao,
  ])

  // Escala: RO uma vez no host.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w > 0) setScale(Math.min(1, Math.max(0.35, w / A4_WIDTH_PX)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Altura do miolo; no stream só cresce.
  useEffect(() => {
    const el = innerRef.current
    if (!el) return

    const applyHeight = (h: number) => {
      const next = h || A4_HEIGHT_PX
      setInnerH((prev) => (streamingRef.current ? Math.max(prev, next) : next))
    }

    applyHeight(el.scrollHeight)
    const ro = new ResizeObserver(() => applyHeight(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const h = el.scrollHeight || A4_HEIGHT_PX
    setInnerH((prev) => (streamingRef.current ? Math.max(prev, h) : h))
  }, [html, text, streaming])

  useEffect(() => {
    if (streaming) return
    const el = innerRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      setInnerH(el.scrollHeight || A4_HEIGHT_PX)
    })
    return () => cancelAnimationFrame(id)
  }, [streaming, html])

  // Seguir fim só se o usuário já estiver perto do final.
  useEffect(() => {
    const host = hostRef.current
    if (!host || !streaming) return

    const onScroll = () => {
      const dist = host.scrollHeight - host.scrollTop - host.clientHeight
      followEndRef.current = dist < 80
    }
    host.addEventListener('scroll', onScroll, { passive: true })
    return () => host.removeEventListener('scroll', onScroll)
  }, [streaming])

  useEffect(() => {
    if (!streaming || !followEndRef.current) return
    const host = hostRef.current
    if (!host) return
    requestAnimationFrame(() => {
      host.scrollTop = host.scrollHeight
    })
  }, [text, streaming, innerH])

  const paperH = Math.max(innerH, A4_HEIGHT_PX)
  // Mantém texto plano até o HTML formatado ficar pronto (evita flash do placeholder).
  const showPlain =
    streaming || (Boolean((text || '').trim()) && !(html || '').trim())

  return (
    <div
      ref={hostRef}
      className={`w-full overflow-auto ${className}`}
      style={{
        contain: 'content',
        overflowAnchor: 'none',
        position: 'relative',
      }}
    >
      {streaming && (
        <div
          aria-hidden
          className="animate-pulse"
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            zIndex: 2,
            height: 2,
            marginBottom: 8,
            borderRadius: 1,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.9), transparent)',
          }}
        />
      )}
      <div
        style={{
          width: A4_WIDTH_PX * scale,
          height: paperH * scale,
          margin: '0 auto',
          position: 'relative',
          contain: 'layout',
          minHeight: paperH * scale,
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: A4_WIDTH_PX,
            minHeight: A4_HEIGHT_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            background: '#fff',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {showPlain ? (
            <StreamingPlainPreview text={text} showCursor={streaming} />
          ) : (
            <div
              dangerouslySetInnerHTML={{
                __html: html || PLACEHOLDER_HTML,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
})

/** Preview leve durante o stream: sem markdown/HTML/paginação — só texto estável. */
const StreamingPlainPreview = memo(function StreamingPlainPreview({
  text,
  showCursor = true,
}: {
  text: string
  showCursor?: boolean
}) {
  const body = (text || '').replace(/\r\n/g, '\n')
  const empty = !body.trim()

  return (
    <div
      className="pdf-page"
      style={{
        boxSizing: 'border-box',
        width: '100%',
        minHeight: A4_HEIGHT_PX,
        padding: '2cm 2cm 2cm 3cm',
        color: '#111',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '12pt',
        lineHeight: 1.5,
        background: '#fff',
      }}
    >
      {empty ? (
        <p style={{ color: '#888', margin: 0 }}>Prévia da petição…</p>
      ) : (
        <pre
          style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            color: 'inherit',
          }}
        >
          {body}
          {showCursor && (
            <span
              aria-hidden
              className="animate-pulse"
              style={{
                display: 'inline-block',
                width: 7,
                height: 14,
                marginLeft: 2,
                verticalAlign: 'text-bottom',
                background: '#D4AF37',
                borderRadius: 1,
              }}
            />
          )}
        </pre>
      )}
      {showCursor && !empty && (
        <div
          aria-hidden
          style={{
            marginTop: 24,
            height: 48,
            borderRadius: 4,
            background:
              'linear-gradient(180deg, rgba(212,175,55,0.12), rgba(212,175,55,0.02))',
          }}
        />
      )}
    </div>
  )
})
