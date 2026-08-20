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

/** Garante logo_url como data-URL (ou null → fallback de iniciais no template). */
async function prepararAdvComLogo(
  adv: DadosAdvogadoPeticao,
): Promise<DadosAdvogadoPeticao> {
  const url = adv.logo_url ? String(adv.logo_url) : ''
  if (!url) return { ...adv, logo_url: null }
  if (url.startsWith('data:')) return adv
  const dataUrl = await urlToDataUrl(url)
  return { ...adv, logo_url: dataUrl }
}

/** Converte <img> externos em data-URL para html2canvas não perder o logo (CORS). */
async function inlineImagesAsDataUrls(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || ''
      if (!src || src.startsWith('data:')) return
      const dataUrl = await urlToDataUrl(src)
      if (dataUrl) {
        img.setAttribute('src', dataUrl)
        img.removeAttribute('crossorigin')
      } else {
        // Remove img quebrada — o asterisco/ícone de broken image no PDF
        img.style.display = 'none'
        img.removeAttribute('src')
      }
    }),
  )
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
 * Respeita zonas data-pdf-keep (itens de pedido) para não cortar no meio.
 * Se a última fatia for pequena, tenta fundir com a anterior.
 */
function coletarZonasKeep(pageEl: HTMLElement, scale: number): { top: number; bottom: number }[] {
  const rootRect = pageEl.getBoundingClientRect()
  const nodes = pageEl.querySelectorAll('[data-pdf-keep], table.sm-pedido-item, .sm-timeline')
  return Array.from(nodes)
    .map((node) => {
      const el = node as HTMLElement
      const r = el.getBoundingClientRect()
      const top = (r.top - rootRect.top + pageEl.scrollTop) * scale
      const bottom = (r.bottom - rootRect.top + pageEl.scrollTop) * scale
      return { top, bottom }
    })
    .filter((z) => z.bottom > z.top + 2)
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

  // Funde última fatia órfã com a anterior, se couber
  if (slices.length >= 2) {
    const last = slices[slices.length - 1]
    const prev = slices[slices.length - 2]
    if (last.h + prev.h <= pageSlicePx) {
      slices.splice(slices.length - 2, 2, { y: prev.y, h: prev.h + last.h })
    } else if (last.h < pageSlicePx * 0.42) {
      const room = pageSlicePx - last.h
      const take = Math.min(room, prev.h - Math.floor(pageSlicePx * 0.35))
      if (take > 40) {
        prev.h -= take
        last.y = prev.y + prev.h
        last.h += take
      }
    }
  }

  slices.forEach((slice, pageIdx) => {
    const slicePtH = Math.min(usableH, slice.h / pxPerPt)
    const isLast = pageIdx === slices.length - 1

    if (pageIdx === 0) {
      // página inicial já existe
    } else if (isLast && slicePtH < usableH * 0.55) {
      // Mantém A4 completo na última página se houver nota de fechamento
      // (espaço preenchido visualmente pelo rodapé + nota no HTML)
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

  const W = A4_WIDTH_PX
  const container = document.createElement('div')
  container.setAttribute('data-pdf-capture', '1')
  container.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${W}px`,
    `max-width:${W}px`,
    'min-width:0',
    'overflow:hidden',
    'background:#fff',
    'box-sizing:border-box',
  ].join(';')
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const pageEl = (container.querySelector('.pdf-page') as HTMLElement) || container
    const forceA4 = (el: HTMLElement) => {
      el.style.setProperty('width', `${W}px`, 'important')
      el.style.setProperty('max-width', `${W}px`, 'important')
      el.style.setProperty('min-width', '0', 'important')
      el.style.setProperty('box-sizing', 'border-box', 'important')
      el.style.setProperty('overflow', 'hidden', 'important')
      el.style.setProperty('height', 'auto', 'important')
      el.style.setProperty('min-height', '0', 'important')
      el.style.setProperty('background', '#fff', 'important')
      el.style.setProperty('padding-top', '0', 'important')
      el.style.setProperty('padding-bottom', '0', 'important')
    }
    forceA4(pageEl)

    pageEl
      .querySelectorAll('.sm-footer, .pdf-footer, [data-pdf-footer], .sm-sheet-foot')
      .forEach((n) => n.remove())

    await inlineImagesAsDataUrls(container)
    await waitForImages(container)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    // Zonas que não podem ser cortadas no meio (itens de requerimento)
    const keepZones = coletarZonasKeep(pageEl, 2)

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      width: W,
      windowWidth: W,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 8000,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (_doc, cloned) => {
        const el = cloned as HTMLElement
        forceA4(el)
        el
          .querySelectorAll('.sm-footer, .pdf-footer, [data-pdf-footer], .sm-sheet-foot')
          .forEach((n) => n.remove())
        el.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src') || ''
          if (!src || !src.startsWith('data:')) {
            // Sem data-URL: esconde broken-image (asterisco) e mostra iniciais
            const td = img.closest('td')
            img.style.display = 'none'
            if (td && !td.querySelector('[data-logo-fallback]')) {
              const doc = el.ownerDocument
              const fb = doc.createElement('div')
              fb.setAttribute('data-logo-fallback', '1')
              fb.textContent = 'PL'
              fb.setAttribute(
                'style',
                'width:36px;height:36px;background:#D4AF37;color:#000;font-weight:bold;font-size:11px;line-height:36px;text-align:center;',
              )
              td.insertBefore(fb, img)
            }
          }
        })
        el.querySelectorAll('*').forEach((node) => {
          const n = node as HTMLElement
          if (!n.style) return
          n.style.maxWidth = '100%'
          n.style.overflowWrap = 'anywhere'
          n.style.wordWrap = 'break-word'
        })
      },
    })

    let finalCanvas = canvas
    const expectedW = W * 2
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
