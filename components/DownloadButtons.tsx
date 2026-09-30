'use client'
import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { createBrowserClient } from '@supabase/ssr'
import { Eye, Loader2 } from 'lucide-react'
import { ModalDadosExportacao } from '@/components/peticao/ModalDadosExportacao'
import { ModalVisualizarPeticao } from '@/components/peticao/ModalVisualizarPeticao'
import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  A4_WIDTH_PX,
  MARGEM_PETICAO_PT,
  normalizarEstiloPeticao,
} from '@/lib/peticao-export'
import {
  aplicarPaginacaoPorBlocos,
  alturaUtilPaginaPdfPx,
  limitesCanvasDePaginas,
} from '@/lib/pdf-paginacao'
import { montarHtmlPeticao } from '@/lib/montar-html-peticao'
import {
  AGENT_SM_RURAL,
  ERRO_GERACAO_INTERROMPIDA,
  extrairConteudoSmRural,
  isSmRuralStructured,
  svgTimelineParaRaster,
  textoRodapeSm,
  validarCompletudeSmRural,
} from '@/lib/peticao-sm-rural'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Props = {
  text: string
  fileName?: string
  /** Sobrescreve o padrão do escritório no momento da exportação. */
  estiloOverride?: EstiloPeticao | null
  /** Dados já carregados (ex.: preview); se omitido, busca do Supabase. */
  advOverride?: DadosAdvogadoPeticao | null
  /** Abre modal de revisão de contato/OAB antes do PDF (padrão: true). */
  pedirConfirmacaoDados?: boolean
  /** Tipo do agente (ex.: salario-maternidade-rural) — aciona template dedicado. */
  agentType?: string | null
  /**
   * Se true (padrão em petições geradas), abre preview em tela cheia
   * e só permite download a partir dali — sem baixar direto ao clicar.
   */
  previewFirst?: boolean
}

function asAdv(raw: Record<string, unknown> | DadosAdvogadoPeticao): DadosAdvogadoPeticao {
  const r = raw as Record<string, unknown>
  return {
    name: String(r.nome_completo || r.name || ''),
    office_name: String(r.office_name || ''),
    oab_number: String(r.oab_number || r.oab || ''),
    oab_uf: String(r.oab_uf || ''),
    email: String(r.email || ''),
    whatsapp: String(r.whatsapp || r.phone || ''),
    phone: String(r.phone || ''),
    cidade: String(r.cidade || r.city || ''),
    estado: String(r.estado || r.state || r.oab_uf || ''),
    logo_url: (r.logo_url as string) || null,
    banner_url: (r.banner_url as string) || null,
    signature_url: (r.signature_url as string) || null,
    cor_peticao: String(r.cor_peticao || '#1d4ed8'),
    estilo_peticao: String(r.estilo_peticao || 'moderno'),
  }
}

/** Converte URL (Supabase Storage etc.) em data-URL via API server-side. */
async function urlToDataUrl(url: string): Promise<string | null> {
  const src = url.trim()
  if (!src) return null
  if (src.startsWith('data:')) return src

  // Preferência: proxy server-side (sem CORS)
  try {
    const res = await fetch('/api/logo-data-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: src }),
    })
    if (res.ok) {
      const json = (await res.json()) as { dataUrl?: string }
      if (json.dataUrl?.startsWith('data:')) return json.dataUrl
    }
  } catch {
    /* fallback client abaixo */
  }

  // Fallback: fetch client + Image/canvas
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit', cache: 'no-store' })
    if (res.ok) {
      const blob = await res.blob()
      if (blob.size > 0) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => reject(new Error('read failed'))
          reader.readAsDataURL(blob)
        })
        if (dataUrl.startsWith('data:')) return dataUrl
      }
    }
  } catch {
    /* tenta Image */
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const timer = window.setTimeout(() => reject(new Error('timeout')), 8000)
      img.onload = () => {
        window.clearTimeout(timer)
        try {
          const c = document.createElement('canvas')
          c.width = Math.max(1, img.naturalWidth)
          c.height = Math.max(1, img.naturalHeight)
          const ctx = c.getContext('2d')
          if (!ctx) {
            reject(new Error('no ctx'))
            return
          }
          ctx.drawImage(img, 0, 0)
          resolve(c.toDataURL('image/png'))
        } catch (e) {
          reject(e)
        }
      }
      img.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('img error'))
      }
      const sep = src.includes('?') ? '&' : '?'
      img.src = `${src}${sep}pdf=${Date.now()}`
    })
    if (dataUrl.startsWith('data:')) return dataUrl
  } catch {
    /* falhou */
  }
  return null
}

/** Garante logo_url como data-URL (ou null → espaço em branco, sem asterisco). */
async function prepararAdvComLogo(
  adv: DadosAdvogadoPeticao,
): Promise<DadosAdvogadoPeticao> {
  const url = adv.logo_url ? String(adv.logo_url).trim() : ''
  if (!url || url === '*' || url === 'null' || url === 'undefined') {
    return { ...adv, logo_url: null }
  }
  if (url.startsWith('data:image/') && url.length > 64) return adv
  if (url.startsWith('data:')) return { ...adv, logo_url: null }
  const dataUrl = await urlToDataUrl(url)
  return { ...adv, logo_url: dataUrl && dataUrl.startsWith('data:image/') ? dataUrl : null }
}

/** Substitui <img> por slot vazio (evita CORS / broken-image no html2canvas). */
function substituirImgPorSlot(img: HTMLImageElement): void {
  const slot = document.createElement('div')
  slot.className = 'sm-logo-slot'
  slot.setAttribute('aria-hidden', 'true')
  slot.style.cssText = 'width:60px;height:36px;display:block;'
  img.replaceWith(slot)
}

/** Converte <img> externos em data-URL; o que não for data: vira slot vazio. */
async function inlineImagesAsDataUrls(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || ''
      if (!src || src.startsWith('data:')) return
      const dataUrl = await urlToDataUrl(src)
      if (dataUrl?.startsWith('data:')) {
        img.setAttribute('src', dataUrl)
        img.removeAttribute('crossorigin')
      } else {
        substituirImgPorSlot(img)
      }
    }),
  )
  // Passo final: qualquer img ainda sem data: (externa/quebrada) → slot vazio
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || ''
    if (!src.startsWith('data:')) substituirImgPorSlot(img as HTMLImageElement)
  })
}

/** Espera todas as imagens do container (ou timeout) antes do html2canvas. */
async function waitForImages(root: HTMLElement, timeoutMs = 4000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          setTimeout(done, timeoutMs)
        }),
    ),
  )
}

/**
 * Fatia o canvas nos limites de página e monta páginas A4 completas
 * (conteúdo + rodapé embutidos na imagem).
 */
function adicionarCanvasAoPdf(
  pdf: InstanceType<typeof jsPDF>,
  canvas: HTMLCanvasElement,
  slices: { y: number; h: number }[],
  advogado: DadosAdvogadoPeticao,
): void {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageHFull = pdf.internal.pageSize.getHeight()
  const mb = MARGEM_PETICAO_PT.bottom
  const usableH = pageHFull - mb
  const pxPerPt = canvas.width / pageW
  const fullPagePxH = Math.round(pageHFull * pxPerPt)
  const leftTxt = textoRodapeSm(advogado)

  const list =
    slices.length > 0
      ? slices
      : [{ y: 0, h: canvas.height }]

  const contentSlices = list.filter((slice) => slice.h >= 4)
  contentSlices.forEach((slice, pageIdx) => {
    const slicePtH = Math.min(usableH, slice.h / pxPerPt)
    if (pageIdx > 0) pdf.addPage()

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = fullPagePxH
    const ctx = pageCanvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(
      canvas,
      0,
      slice.y,
      canvas.width,
      slice.h,
      0,
      0,
      canvas.width,
      Math.round(slicePtH * pxPerPt),
    )

    // Rodapé na imagem da página
    const lineY = Math.round((pageHFull - mb + 10) * pxPerPt)
    const textY = lineY + Math.round(11 * pxPerPt)
    const leftPx = Math.round(MARGEM_PETICAO_PT.left * pxPerPt)
    const rightPx = Math.round((pageW - MARGEM_PETICAO_PT.right) * pxPerPt)
    ctx.strokeStyle = '#999999'
    ctx.lineWidth = Math.max(1, Math.round(0.4 * pxPerPt))
    ctx.beginPath()
    ctx.moveTo(leftPx, lineY)
    ctx.lineTo(rightPx, lineY)
    ctx.stroke()
    ctx.fillStyle = '#555555'
    ctx.font = `${Math.round(8 * pxPerPt)}px Helvetica, Arial, sans-serif`
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    ctx.fillText(leftTxt, leftPx, textY)
    ctx.textAlign = 'right'
    ctx.fillText(`Pág. ${pageIdx + 1}`, rightPx, textY)

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageHFull)
  })
}

async function gerarPdfBlob(
  text: string,
  advogado: DadosAdvogadoPeticao,
  estilo: EstiloPeticao,
  agentType: string | null,
): Promise<Blob> {
  if (agentType === 'salario-maternidade-rural' || text.includes('<<<SM_RURAL_V2>>>')) {
    const v = validarCompletudeSmRural(text)
    if (!v.ok) {
      throw new Error(v.motivo || ERRO_GERACAO_INTERROMPIDA)
    }
  }

  const corPeticao = String(advogado.cor_peticao || '#1d4ed8')
  const advComLogo = await prepararAdvComLogo(advogado)

  const html = montarHtmlPeticao({
    text,
    adv: advComLogo,
    estilo,
    corPeticao,
    comMargens: true,
    agentType,
  })

  const W = A4_WIDTH_PX // 794
  const CAPTURE_SCALE = 2
  const scrollAntes = { x: window.scrollX, y: window.scrollY }
  window.scrollTo(0, 0)

  // Offscreen: fixed + top 0 (evita herdar margin/padding do dashboard / blank no topo)
  const container = document.createElement('div')
  container.setAttribute('data-pdf-capture', '1')
  container.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${W}px`,
    `max-width:${W}px`,
    'display:block',
    'overflow:visible',
    'opacity:1',
    'visibility:visible',
    'background:#ffffff',
    'box-sizing:border-box',
    'margin:0',
    'padding:0',
    'border:0',
    'transform:none',
  ].join(';')
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const pageEl =
      (container.querySelector('.pdf-page.sm-rural') as HTMLElement) ||
      (container.querySelector('.pdf-page') as HTMLElement)

    if (!pageEl) {
      throw new Error('Elemento .pdf-page não encontrado para captura PDF')
    }

    pageEl.style.width = `${W}px`
    pageEl.style.maxWidth = `${W}px`
    pageEl.style.boxSizing = 'border-box'
    pageEl.style.overflow = 'visible'
    pageEl.style.opacity = '1'
    pageEl.style.visibility = 'visible'
    pageEl.style.display = 'block'
    pageEl.style.background = '#ffffff'
    pageEl.style.height = 'auto'
    pageEl.style.maxHeight = 'none'
    pageEl.style.margin = '0'
    pageEl.style.position = 'relative'
    pageEl.style.left = '0'
    pageEl.style.top = '0'

    pageEl
      .querySelectorAll('.sm-footer, .pdf-footer, [data-pdf-footer], .sm-sheet-foot')
      .forEach((n) => n.remove())

    pageEl.querySelectorAll('.sm-secao-vi, .sm-pedidos, .sm-pedido-item').forEach((node) => {
      const n = node as HTMLElement
      n.removeAttribute('data-pdf-keep')
      n.classList.remove('keep-together')
      n.style.pageBreakInside = 'auto'
      n.style.breakInside = 'auto'
    })

    await inlineImagesAsDataUrls(container)
    await waitForImages(container)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    await new Promise<void>((r) => setTimeout(r, 200))

    if (!pageEl.offsetHeight) {
      const h = Math.max(pageEl.scrollHeight, container.scrollHeight, 200)
      pageEl.style.minHeight = `${h}px`
      container.style.minHeight = `${h}px`
    }

    if (!pageEl.offsetHeight) {
      throw new Error(
        `PDF capture: .pdf-page com offsetHeight=0 (innerHTML=${pageEl.innerHTML.length}).`,
      )
    }

    // Paginação por blocos ANTES da captura
    const usablePx = alturaUtilPaginaPdfPx(W, true)
    const pageBreaksCss = aplicarPaginacaoPorBlocos(pageEl, usablePx)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    const canvas = await html2canvas(pageEl, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: pageEl.scrollWidth,
      windowHeight: pageEl.scrollHeight,
      width: W,
      logging: false,
      imageTimeout: 15000,
      onclone: (_doc, cloned) => {
        const el = cloned as HTMLElement
        el.style.width = `${W}px`
        el.style.maxWidth = `${W}px`
        el.style.boxSizing = 'border-box'
        el.style.overflow = 'visible'
        el.style.opacity = '1'
        el.style.visibility = 'visible'
        el.style.display = 'block'
        el.style.background = '#ffffff'
        el.style.height = 'auto'
        el.style.maxHeight = 'none'
        el.style.position = 'relative'
        el.style.left = '0'
        el.style.top = '0'
        el.style.margin = '0'
        el
          .querySelectorAll('.sm-footer, .pdf-footer, [data-pdf-footer], .sm-sheet-foot')
          .forEach((n) => n.remove())
        el.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src') || ''
          if (!src || !src.startsWith('data:')) {
            const doc = el.ownerDocument
            const slot = doc.createElement('div')
            slot.className = 'sm-logo-slot'
            slot.setAttribute('aria-hidden', 'true')
            slot.style.cssText = 'width:60px;height:36px;display:block;'
            img.replaceWith(slot)
          }
        })
      },
    })

    let finalCanvas = canvas
    const expectedW = Math.round(W * CAPTURE_SCALE)
    if (canvas.width !== expectedW) {
      const cropped = document.createElement('canvas')
      cropped.width = expectedW
      cropped.height = canvas.height
      const cctx = cropped.getContext('2d')
      if (cctx) {
        cctx.fillStyle = '#ffffff'
        cctx.fillRect(0, 0, cropped.width, cropped.height)
        cctx.drawImage(canvas, 0, 0)
        finalCanvas = cropped
      }
    }

    const slices = limitesCanvasDePaginas(
      pageBreaksCss,
      finalCanvas.height,
      CAPTURE_SCALE,
    )

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    adicionarCanvasAoPdf(pdf, finalCanvas, slices, advComLogo)

    return pdf.output('blob')
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container)
    window.scrollTo(scrollAntes.x, scrollAntes.y)
  }
}

/**
 * Rasteriza a timeline horizontal SM (mesmo SVG do PDF) em PNG 2x no navegador,
 * para o DOCX receber imagem sem depender de rasterização no servidor.
 */
async function rasterizarTimelineSmPng(
  text: string,
  advogado: DadosAdvogadoPeticao,
  agentType: string | null,
): Promise<{ timelinePngBase64: string; timelineWidthPx: number; timelineHeightPx: number } | null> {
  if (agentType !== AGENT_SM_RURAL && !isSmRuralStructured(text)) return null
  const timeline = extrairConteudoSmRural({ text, adv: advogado })?.timeline
  if (!timeline || timeline.estilo === 'none' || timeline.estilo === 'vertical') return null
  if (!timeline.eventos?.length) return null

  const prepared = svgTimelineParaRaster(timeline, 1200)
  if (!prepared) return null
  const { width, height } = prepared

  const doc = new DOMParser().parseFromString(prepared.svg, 'image/svg+xml')
  const svgEl = doc.documentElement
  if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') return null
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svgEl.setAttribute('width', String(width))
  svgEl.setAttribute('height', String(height))
  const svgStr = new XMLSerializer().serializeToString(svgEl)

  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Falha ao carregar SVG da timeline'))
      img.src = url
    })
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return {
      timelinePngBase64: canvas.toDataURL('image/png'),
      timelineWidthPx: canvas.width,
      timelineHeightPx: canvas.height,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function DownloadButtons({
  text,
  fileName = 'peticao',
  estiloOverride,
  advOverride,
  pedirConfirmacaoDados = true,
  agentType = null,
  previewFirst = false,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [previewErro, setPreviewErro] = useState<string | null>(null)
  const [docxErro, setDocxErro] = useState<string | null>(null)
  const [advBase, setAdvBase] = useState<DadosAdvogadoPeticao>({})
  const [estiloBase, setEstiloBase] = useState<EstiloPeticao>('moderno')
  const [advPreview, setAdvPreview] = useState<DadosAdvogadoPeticao>({})
  const [estiloPreview, setEstiloPreview] = useState<EstiloPeticao>('moderno')
  const pdfUrlRef = useRef<string | null>(null)

  function revokePdfUrl() {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = null
    }
    setPdfUrl(null)
    setPdfBlob(null)
  }

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
    }
  }, [])

  async function carregarAdvogado(): Promise<DadosAdvogadoPeticao> {
    if (advOverride) return asAdv(advOverride)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return {}
    const { data } = await supabase.from('lawyers').select('*').eq('id', user.id).single()
    return asAdv((data || {}) as Record<string, unknown>)
  }

  async function abrirPreview(advogado: DadosAdvogadoPeticao, estilo: EstiloPeticao) {
    setAdvPreview(advogado)
    setEstiloPreview(estilo)
    setPreviewErro(null)
    setPreviewOpen(true)
    setGenerating(true)
    revokePdfUrl()
    try {
      const blob = await gerarPdfBlob(text, advogado, estilo, agentType)
      const url = URL.createObjectURL(blob)
      pdfUrlRef.current = url
      setPdfBlob(blob)
      setPdfUrl(url)
    } catch (err) {
      console.error('Falha ao gerar preview PDF:', err)
      const msg = err instanceof Error ? err.message : ''
      setPreviewErro(
        msg === ERRO_GERACAO_INTERROMPIDA
          ? ERRO_GERACAO_INTERROMPIDA
          : 'Não foi possível gerar o preview do PDF. Tente novamente.',
      )
    } finally {
      setGenerating(false)
    }
  }

  async function iniciarFluxoPdf() {
    const advogado = await carregarAdvogado()
    const estilo = normalizarEstiloPeticao(estiloOverride ?? advogado.estilo_peticao)
    setAdvBase(advogado)
    setEstiloBase(estilo)
    if (pedirConfirmacaoDados) {
      setModalOpen(true)
      return
    }
    if (previewFirst) {
      await abrirPreview(advogado, estilo)
      return
    }
    await baixarPdfDireto(advogado, estilo)
  }

  async function onConfirmModal(
    dados: DadosAdvogadoPeticao,
    estilo: EstiloPeticao,
    salvarNoPerfil: boolean,
  ) {
    if (salvarNoPerfil) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('lawyers')
          .update({
            name: dados.name,
            office_name: dados.office_name,
            oab_number: dados.oab_number,
            oab_uf: dados.oab_uf,
            email: dados.email,
            phone: dados.phone || dados.whatsapp,
            whatsapp: dados.whatsapp || dados.phone,
            cidade: dados.cidade,
            estado: dados.estado,
            estilo_peticao: estilo,
          })
          .eq('id', user.id)
      }
    }
    setModalOpen(false)
    if (previewFirst) {
      await abrirPreview(dados, estilo)
      return
    }
    await baixarPdfDireto(dados, estilo)
  }

  async function baixarPdfDireto(advogado: DadosAdvogadoPeticao, estilo: EstiloPeticao) {
    setGenerating(true)
    try {
      const blob = await gerarPdfBlob(text, advogado, estilo, agentType)
      saveAs(blob, `${fileName}.pdf`)
    } catch (err) {
      console.error('Falha ao gerar PDF:', err)
      const msg = err instanceof Error ? err.message : ''
      alert(
        msg === ERRO_GERACAO_INTERROMPIDA
          ? ERRO_GERACAO_INTERROMPIDA
          : 'Não foi possível gerar o PDF. Tente novamente.',
      )
    } finally {
      setGenerating(false)
    }
  }

  function baixarPdfDoPreview() {
    if (!pdfBlob) return
    setBaixando(true)
    try {
      saveAs(pdfBlob, `${fileName}.pdf`)
    } finally {
      setBaixando(false)
    }
  }

  async function baixarDOCX(advogadoArg?: DadosAdvogadoPeticao, estiloArg?: EstiloPeticao) {
    setBaixando(true)
    setDocxErro(null)
    try {
      const advogado = advogadoArg || (await carregarAdvogado())
      const estilo = normalizarEstiloPeticao(
        estiloArg ?? estiloOverride ?? advogado.estilo_peticao,
      )

      let timelinePng: Awaited<ReturnType<typeof rasterizarTimelineSmPng>> = null
      try {
        timelinePng = await rasterizarTimelineSmPng(text, advogado, agentType)
      } catch (err) {
        console.error('Falha ao rasterizar timeline para o DOCX:', err)
      }

      const res = await fetch('/api/gerar-documento-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          advogado,
          estilo,
          agentType,
          fileName,
          ...(timelinePng || {}),
        }),
      })

      if (!res.ok) {
        let msg = 'Não foi possível gerar o Word (.docx). Tente novamente.'
        try {
          const json = (await res.json()) as { error?: string }
          if (json.error) msg = json.error
        } catch {
          /* ignore */
        }
        throw new Error(msg)
      }

      const blob = await res.blob()
      saveAs(blob, `${fileName}.docx`)
    } catch (err) {
      console.error('Falha ao gerar DOCX:', err)
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível gerar o Word (.docx). Tente novamente.'
      setDocxErro(msg)
      if (!previewOpen) {
        alert(msg)
      }
    } finally {
      setBaixando(false)
    }
  }

  function fecharPreview() {
    setPreviewOpen(false)
    setPreviewErro(null)
    setDocxErro(null)
    revokePdfUrl()
  }

  return (
    <>
      {previewFirst ? (
        <button
          type="button"
          onClick={iniciarFluxoPdf}
          disabled={generating}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/5 flex items-center gap-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
            border: '1px solid rgba(212,175,55,0.45)',
            color: '#D4AF37',
          }}
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Eye size={13} />}
          Visualizar documento
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={iniciarFluxoPdf}
            disabled={generating}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 flex items-center gap-1.5"
            style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : null} ⬇ PDF
          </button>
          <button
            type="button"
            onClick={() => baixarDOCX()}
            disabled={generating || baixando}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6' }}
          >
            {baixando ? <Loader2 size={12} className="animate-spin" /> : null} Baixar em Word (.docx)
          </button>
        </>
      )}

      {docxErro && !previewOpen ? (
        <p className="text-[11px] mt-1 w-full" style={{ color: '#EF4444' }} role="alert">
          {docxErro}
        </p>
      ) : null}

      <ModalDadosExportacao
        open={modalOpen}
        initial={advBase}
        estiloAtual={estiloBase}
        confirming={generating}
        confirmLabel={previewFirst ? 'Confirmar e visualizar' : 'Confirmar e exportar PDF'}
        onClose={() => setModalOpen(false)}
        onConfirm={onConfirmModal}
      />

      <ModalVisualizarPeticao
        open={previewOpen}
        fileName={fileName}
        pdfUrl={pdfUrl}
        gerando={generating}
        baixando={baixando}
        erro={previewErro}
        erroDocx={docxErro}
        onBaixarPdf={baixarPdfDoPreview}
        onBaixarDocx={() => baixarDOCX(advPreview, estiloPreview)}
        onClose={fecharPreview}
      />
    </>
  )
}
