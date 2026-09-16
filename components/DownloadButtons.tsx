'use client'
import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  AlignmentType,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from 'docx'
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
  marcarBlocoFinal,
  margensDocxTwips,
  normalizarEstiloPeticao,
  prepararTextoPeticao,
  limparMarkdownResidual,
} from '@/lib/peticao-export'
import { montarHtmlPeticao } from '@/lib/montar-html-peticao'
import { textoRodapeSm } from '@/lib/peticao-sm-rural'

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

async function fetchImageBytes(url: string): Promise<{ data: Uint8Array; type: 'png' | 'jpg' } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const type: 'png' | 'jpg' = ct.includes('png') ? 'png' : 'jpg'
    return { data: new Uint8Array(buf), type }
  } catch {
    return null
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

function desenharRodapesPdf(
  pdf: InstanceType<typeof jsPDF>,
  advogado: DadosAdvogadoPeticao,
) {
  const pageW = pdf.internal.pageSize.getWidth()
  const total = pdf.getNumberOfPages()
  const leftTxt = textoRodapeSm(advogado)

  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    const pageH = pdf.internal.pageSize.getHeight()
    const mb = MARGEM_PETICAO_PT.bottom
    // Apaga qualquer conteúdo que tenha vazado na faixa do rodapé
    pdf.setFillColor(255, 255, 255)
    pdf.rect(0, pageH - mb, pageW, mb, 'F')

    const lineY = pageH - mb + 10
    const textY = lineY + 11
    pdf.setDrawColor(153, 153, 153)
    pdf.setLineWidth(0.4)
    pdf.line(MARGEM_PETICAO_PT.left, lineY, pageW - MARGEM_PETICAO_PT.right, lineY)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(85, 85, 85)
    pdf.text(leftTxt, MARGEM_PETICAO_PT.left, textY)
    pdf.text(`Pág. ${i}`, pageW - MARGEM_PETICAO_PT.right, textY, { align: 'right' })
  }
}

/**
 * Fatia o canvas em páginas A4.
 * Keep só em zonas pequenas (timeline). NUNCA seção VI / pedidos —
 * keep agressivo deixa página quase em branco após item i.
 */
function coletarZonasKeep(pageEl: HTMLElement, scale: number): { top: number; bottom: number }[] {
  const rootRect = pageEl.getBoundingClientRect()
  const nodes = pageEl.querySelectorAll('[data-pdf-keep], .sm-timeline')
  return Array.from(nodes)
    .map((node) => {
      const el = node as HTMLElement
      // Nunca keep em containers grandes / pedidos / seção VI / fecho
      if (
        el.classList.contains('sm-pedidos') ||
        el.classList.contains('sm-secao-vi') ||
        el.classList.contains('sm-fecho-bloco') ||
        el.classList.contains('sm-pedido-item') ||
        el.closest('.sm-secao-vi, .sm-pedidos, .sm-pedido-item, .sm-fecho-bloco')
      ) {
        return null
      }
      // Barras de seção dentro da VI não entram como keep de bloco grande
      if (el.classList.contains('sm-section-bar') && el.closest('.sm-secao-vi')) {
        return null
      }
      const r = el.getBoundingClientRect()
      const h = r.height * scale
      // Blocos > ~40% da página A4 (em px de captura) não devem forçar keep
      if (h > 650) return null
      const top = (r.top - rootRect.top + pageEl.scrollTop) * scale
      const bottom = (r.bottom - rootRect.top + pageEl.scrollTop) * scale
      return { top, bottom }
    })
    .filter((z): z is { top: number; bottom: number } => z != null && z.bottom > z.top + 2)
    .sort((a, b) => a.top - b.top)
}

function corteSemQuebrarKeep(
  srcY: number,
  idealEnd: number,
  maxSlice: number,
  zones: { top: number; bottom: number }[],
): number {
  let end = Math.min(idealEnd, srcY + maxSlice)
  for (const z of zones) {
    // Corte cai no meio de um bloco keep → recua para o início do bloco
    if (z.top >= srcY + 8 && z.top < end && z.bottom > end) {
      // Se o bloco inteiro cabe na página, inclui ele
      if (z.bottom - srcY <= maxSlice) {
        end = z.bottom
      } else if (z.top > srcY + 24) {
        const fill = z.top - srcY
        // Evita página quase vazia: se o recuo deixa menos de ~55% da página,
        // permite cortar (não deixa só o item i sozinho numa página vazia).
        if (fill < maxSlice * 0.55) {
          break
        }
        end = z.top
      }
      break
    }
  }
  return Math.max(srcY + 8, end)
}

function adicionarCanvasAoPdf(
  pdf: InstanceType<typeof jsPDF>,
  canvas: HTMLCanvasElement,
  keepZones: { top: number; bottom: number }[] = [],
) {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageHFull = pdf.internal.pageSize.getHeight()
  const mt = MARGEM_PETICAO_PT.top
  const mb = MARGEM_PETICAO_PT.bottom
  const footerBand = 8
  const usableH = pageHFull - mt - mb - footerBand
  const pxPerPt = canvas.width / pageW
  const pageSlicePx = Math.max(1, Math.floor(usableH * pxPerPt))

  type Slice = { y: number; h: number }
  const slices: Slice[] = []
  let srcY = 0
  while (srcY < canvas.height - 1) {
    const remaining = canvas.height - srcY
    const idealEnd = srcY + Math.min(pageSlicePx, remaining)
    const end = corteSemQuebrarKeep(srcY, idealEnd, pageSlicePx, keepZones)
    const sliceH = Math.min(end - srcY, remaining)
    if (sliceH < 8) break
    slices.push({ y: srcY, h: sliceH })
    srcY += sliceH
  }

  // Funde fatias órfãs (última e penúltima pequenas) para evitar página em branco
  // entre pedidos/assinaturas e a planilha.
  const fundirOrfas = () => {
    if (slices.length < 2) return false
    const last = slices[slices.length - 1]
    const prev = slices[slices.length - 2]
    if (last.h + prev.h <= pageSlicePx) {
      slices.splice(slices.length - 2, 2, { y: prev.y, h: prev.h + last.h })
      return true
    }
    if (last.h < pageSlicePx * 0.48) {
      const room = pageSlicePx - last.h
      const take = Math.min(room, prev.h - Math.floor(pageSlicePx * 0.32))
      if (take > 40) {
        prev.h -= take
        last.y = prev.y + prev.h
        last.h += take
        return true
      }
    }
    return false
  }
  fundirOrfas()
  fundirOrfas()

  slices.forEach((slice, pageIdx) => {
    const slicePtH = Math.min(usableH, slice.h / pxPerPt)
    const isLast = pageIdx === slices.length - 1

    if (pageIdx === 0) {
      // página inicial já existe
    } else if (isLast && slicePtH < usableH * 0.55) {
      pdf.addPage()
    } else {
      pdf.addPage()
    }

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = slice.h
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
      slice.h,
    )

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)
    pdf.addImage(imgData, 'JPEG', 0, mt, pageW, slicePtH)
  })

  if (slices.length === 0) {
    const h = Math.min(usableH, canvas.height / pxPerPt)
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, mt, pageW, h)
  }
}

async function gerarPdfBlob(
  text: string,
  advogado: DadosAdvogadoPeticao,
  estilo: EstiloPeticao,
  agentType: string | null,
): Promise<Blob> {
  const corPeticao = String(advogado.cor_peticao || '#1d4ed8')
  // Logo como data-URL ANTES de montar o HTML (evita asterisco/broken image)
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
  const CAPTURE_SCALE = 1.5

  // Offscreen VISÍVEL ao layout (nunca display:none / visibility:hidden / height:0 / z-index:-1)
  const container = document.createElement('div')
  container.setAttribute('data-pdf-capture', '1')
  container.style.cssText = [
    'position:fixed',
    'top:-9999px',
    'left:-9999px',
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

    // Largura A4 + overflow visível — sem height:0 / overflow:hidden que zerariam a captura
    pageEl.style.width = `${W}px`
    pageEl.style.maxWidth = `${W}px`
    pageEl.style.boxSizing = 'border-box'
    pageEl.style.overflow = 'visible'
    pageEl.style.opacity = '1'
    pageEl.style.visibility = 'visible'
    pageEl.style.display = 'block'
    pageEl.style.background = '#ffffff'
    // height natural do conteúdo (não forçar 0 / min-height que colapsa)
    pageEl.style.height = 'auto'
    pageEl.style.maxHeight = 'none'

    pageEl
      .querySelectorAll('.sm-footer, .pdf-footer, [data-pdf-footer], .sm-sheet-foot')
      .forEach((n) => n.remove())

    // Seção VI: sem keep / avoid no fatiamento
    pageEl.querySelectorAll('.sm-secao-vi, .sm-pedidos, .sm-pedido-item').forEach((node) => {
      const n = node as HTMLElement
      n.removeAttribute('data-pdf-keep')
      n.classList.remove('keep-together')
      n.style.pageBreakInside = 'auto'
      n.style.breakInside = 'auto'
      n.style.pageBreakBefore = 'auto'
      n.style.pageBreakAfter = 'auto'
    })

    await inlineImagesAsDataUrls(container)
    await waitForImages(container)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    await new Promise<void>((r) => setTimeout(r, 1000))

    // Se ainda sem altura, forçar pelo scrollHeight (causa típica de canvas branco)
    if (!pageEl.offsetHeight) {
      const h = Math.max(pageEl.scrollHeight, container.scrollHeight, 200)
      pageEl.style.minHeight = `${h}px`
      container.style.minHeight = `${h}px`
    }

    console.log('elemento:', pageEl)
    console.log('innerHTML length:', pageEl?.innerHTML?.length)
    console.log('offsetHeight:', pageEl?.offsetHeight)

    if (!pageEl.offsetHeight) {
      throw new Error(
        `PDF capture: .pdf-page com offsetHeight=0 (innerHTML=${pageEl.innerHTML.length}). Container offscreen colapsou.`,
      )
    }

    const keepZones = coletarZonasKeep(pageEl, CAPTURE_SCALE)

    const canvas = await html2canvas(pageEl, {
      useCORS: true,
      allowTaint: true,
      scale: CAPTURE_SCALE,
      backgroundColor: '#ffffff',
      width: W,
      windowWidth: W,
      logging: true,
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
        // Clone às vezes herda left:-9999 — reposiciona para o motor pintar
        el.style.position = 'relative'
        el.style.left = '0'
        el.style.top = '0'
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
        el.querySelectorAll('.sm-secao-vi, .sm-pedidos, .sm-pedido-item, .sm-fecho-bloco').forEach(
          (node) => {
            const n = node as HTMLElement
            n.removeAttribute('data-pdf-keep')
            n.classList.remove('keep-together')
            n.style.setProperty('page-break-inside', 'auto', 'important')
            n.style.setProperty('break-inside', 'auto', 'important')
            n.style.setProperty('overflow', 'visible', 'important')
            n.style.setProperty('height', 'auto', 'important')
            n.style.setProperty('max-height', 'none', 'important')
          },
        )
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

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    adicionarCanvasAoPdf(pdf, finalCanvas, keepZones)
    desenharRodapesPdf(pdf, advComLogo)

    return pdf.output('blob')
  } finally {
    if (container.parentNode) container.parentNode.removeChild(container)
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
      setPreviewErro('Não foi possível gerar o preview do PDF. Tente novamente.')
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
      alert('Não foi possível gerar o PDF. Tente novamente.')
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
    try {
      const advogado = advogadoArg || (await carregarAdvogado())
      const estilo = normalizarEstiloPeticao(
        estiloArg ?? estiloOverride ?? advogado.estilo_peticao,
      )
      const prepared = prepararTextoPeticao(text, advogado)
      const marked = marcarBlocoFinal(prepared)
      const [antes, resto] = marked.split('<<<CLOSING>>>')
      const [closingRaw = '', depois = ''] = (resto || '').split('<<<END_CLOSING>>>')

      const nomeEscritorio = String(advogado.office_name || advogado.name || 'Advogado')
      const oabUf = String(advogado.oab_uf || advogado.estado || '').toUpperCase()
      const oabNum = String(advogado.oab_number || '')

      const headerChildren: Paragraph[] = []

      const logoSrc = advogado.banner_url || advogado.logo_url
      if (logoSrc) {
        const img = await fetchImageBytes(String(logoSrc))
        if (img) {
          headerChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: img.data,
                  transformation: { width: advogado.banner_url ? 480 : 80, height: advogado.banner_url ? 48 : 48 },
                  type: img.type,
                }),
              ],
            }),
          )
        }
      }

      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: nomeEscritorio.toUpperCase(),
              bold: true,
              font: 'Times New Roman',
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: `OAB/${oabUf} nº ${oabNum}`,
              font: 'Times New Roman',
              size: 18,
            }),
          ],
        }),
      )
      if (advogado.email) {
        headerChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: String(advogado.email),
                font: 'Times New Roman',
                size: 16,
              }),
            ],
          }),
        )
      }

      const toParas = (
        block: string,
        align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH,
      ) => {
        return block.split('\n').map((line) => {
          const trimmed = line.trim()
          const isSection =
            /^#{1,2}\s/.test(trimmed) ||
            /^\d+\.\s+[A-ZÀ-Ÿ]/.test(trimmed) ||
            /^[IVXLC]+\s*[–—\-.:)]/.test(trimmed)
          const isSub = /^###\s/.test(trimmed) || /^\d+\.\d+/.test(trimmed)
          const clean = limparMarkdownResidual(
            trimmed
              .replace(/^#{1,6}\s+/, '')
              .replace(/^>\s?/, '')
              .replace(/[|─]/g, ''),
          )

          const bold = isSection || isSub
          return new Paragraph({
            alignment: align,
            spacing: { after: isSection ? 200 : 120 },
            indent: isSub ? { left: 360 } : undefined,
            children: [
              new TextRun({
                text: clean,
                font: 'Times New Roman',
                size: isSection ? 24 : 22,
                bold: Boolean(bold || /\*\*.+\*\*/.test(line)),
                underline:
                  estilo === 'classico' && isSection
                    ? { type: UnderlineType.SINGLE }
                    : undefined,
              }),
            ],
          })
        })
      }

      const margins = margensDocxTwips()
      const children = [
        ...toParas(antes || ''),
        ...toParas(closingRaw, AlignmentType.RIGHT),
        ...toParas(depois),
      ]

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: margins.top,
                  right: margins.right,
                  bottom: margins.bottom,
                  left: margins.left,
                },
              },
            },
            headers: {
              default: new Header({ children: headerChildren }),
            },
            children,
          },
        ],
      })
      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${fileName}.docx`)
    } finally {
      setBaixando(false)
    }
  }

  function fecharPreview() {
    setPreviewOpen(false)
    setPreviewErro(null)
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
            ⬇ DOCX
          </button>
        </>
      )}

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
        onBaixarPdf={baixarPdfDoPreview}
        onBaixarDocx={() => baixarDOCX(advPreview, estiloPreview)}
        onClose={fecharPreview}
      />
    </>
  )
}
