'use client'

import { useEffect, useRef, useState } from 'react'
import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  A4_WIDTH_PX,
  normalizarEstiloPeticao,
} from '@/lib/peticao-export'
import { montarHtmlPeticao } from '@/lib/montar-html-peticao'

type Props = {
  text: string
  adv: DadosAdvogadoPeticao | null
  estilo: EstiloPeticao
  corPeticao?: string
  debounceMs?: number
  className?: string
  agentType?: string | null
}

/** Prévia fiel ao template de exportação (mesmas margens 3/2 cm e CSS). */
export function PeticaoPreview({
  text,
  adv,
  estilo,
  corPeticao,
  debounceMs = 400,
  className = '',
  agentType = null,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState('')
  const [scale, setScale] = useState(0.55)
  const [innerH, setInnerH] = useState(1100)

  // 1x1 transparente para evitar "broken image" (asterisco) enquanto a logo é convertida.
  const EMPTY_LOGO_DATA_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [bannerDataUrl, setBannerDataUrl] = useState<string | null>(null)

  async function urlToDataUrlPreview(src: string, kind: 'logo' | 'banner'): Promise<string | null> {
    const trimmed = src.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('data:')) return trimmed
    if (!/^https?:\/\//i.test(trimmed)) return trimmed // relativo: deixa o browser lidar

    try {
      const res = await fetch('/api/logo-data-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      if (!res.ok) return kind === 'logo' ? EMPTY_LOGO_DATA_URL : null

      const json = (await res.json().catch(() => ({}))) as { dataUrl?: string }
      if (json.dataUrl?.startsWith('data:')) return json.dataUrl
      return kind === 'logo' ? EMPTY_LOGO_DATA_URL : null
    } catch {
      return kind === 'logo' ? EMPTY_LOGO_DATA_URL : null
    }
  }

  // Converte `logo_url`/`banner_url` (Supabase Storage etc.) para data-URL,
  // evitando broken-image (asterisco) no preview.
  useEffect(() => {
    let cancelled = false

    async function run() {
      const rawLogo = adv?.logo_url ? String(adv.logo_url) : ''
      const rawBanner = adv?.banner_url ? String(adv.banner_url) : ''

      const logoNeedsProxy = Boolean(rawLogo) && !rawLogo.startsWith('data:') && /^https?:\/\//i.test(rawLogo)
      const bannerNeedsProxy = Boolean(rawBanner) && !rawBanner.startsWith('data:') && /^https?:\/\//i.test(rawBanner)

      // Estado inicial: esconde o que depende de conversão.
      setLogoDataUrl(logoNeedsProxy ? EMPTY_LOGO_DATA_URL : (rawLogo || null))
      setBannerDataUrl(bannerNeedsProxy ? null : (rawBanner || null))

      if (!logoNeedsProxy && !bannerNeedsProxy) return

      const [convertedLogo, convertedBanner] = await Promise.all([
        logoNeedsProxy ? urlToDataUrlPreview(rawLogo, 'logo') : Promise.resolve(rawLogo || null),
        bannerNeedsProxy ? urlToDataUrlPreview(rawBanner, 'banner') : Promise.resolve(rawBanner || null),
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

  useEffect(() => {
    const t = setTimeout(() => {
      const advForRender: DadosAdvogadoPeticao = {
        ...(adv || {}),
        logo_url: logoDataUrl,
        banner_url: bannerDataUrl,
      }

      setHtml(
        montarHtmlPeticao({
          text: text || '',
          adv: advForRender,
          estilo: normalizarEstiloPeticao(estilo),
          corPeticao,
          comMargens: true,
          agentType,
        }),
      )
    }, debounceMs)
    return () => clearTimeout(t)
  }, [text, adv, estilo, corPeticao, debounceMs, agentType, logoDataUrl, bannerDataUrl])

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

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setInnerH(el.scrollHeight || 1100))
    ro.observe(el)
    setInnerH(el.scrollHeight || 1100)
    return () => ro.disconnect()
  }, [html])

  return (
    <div ref={hostRef} className={`w-full overflow-auto ${className}`}>
      <div
        style={{
          width: A4_WIDTH_PX * scale,
          height: innerH * scale,
          margin: '0 auto',
          position: 'relative',
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: A4_WIDTH_PX,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
            background: '#fff',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          dangerouslySetInnerHTML={{
            __html:
              html ||
              '<div class="pdf-page"><p style="padding:2cm;color:#888">Prévia da petição…</p></div>',
          }}
        />
      </div>
    </div>
  )
}
