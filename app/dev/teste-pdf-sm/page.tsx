'use client'

import { useCallback, useState } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { montarHtmlPeticao } from '@/lib/montar-html-peticao'
import { FIXTURE_SM_ANA_LUCIA } from '@/lib/fixtures/sm-ana-lucia'
import { AGENT_SM_RURAL, textoRodapeSm } from '@/lib/peticao-sm-rural'
import {
  A4_WIDTH_PX,
  MARGEM_PETICAO_PT,
  type DadosAdvogadoPeticao,
} from '@/lib/peticao-export'

const ADV_TESTE: DadosAdvogadoPeticao = {
  name: 'Prev Labs',
  office_name: 'Prev Labs',
  oab_number: '12345',
  oab_uf: 'MA',
  email: 'contato@prevlabs.com.br',
  cidade: 'São Luís',
  estado: 'MA',
  logo_url: null,
  cor_peticao: '#0A2540',
  estilo_peticao: 'moderno',
}

function desenharRodapes(pdf: InstanceType<typeof jsPDF>) {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const leftTxt = textoRodapeSm(ADV_TESTE)
  const total = pdf.getNumberOfPages()
  const lineY = pageH - MARGEM_PETICAO_PT.bottom + 10
  const textY = lineY + 12
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
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

async function gerarPdf(): Promise<{
  blob: Blob
  checks: string[]
  page1DataUrl: string
  lastPageDataUrl: string
}> {
  const W = A4_WIDTH_PX
  const html = montarHtmlPeticao({
    text: FIXTURE_SM_ANA_LUCIA,
    adv: ADV_TESTE,
    estilo: 'moderno',
    corPeticao: '#0A2540',
    comMargens: true,
    agentType: AGENT_SM_RURAL,
  })

  const checks: string[] = []
  checks.push(html.includes('R$ 1.518,00') ? 'HTML planilha OK' : 'HTML planilha FALHOU')
  checks.push(html.includes('SALÁRIO-<br/>MATERNIDADE') ? 'HTML título OK' : 'HTML título FALHOU')
  checks.push(html.includes('contato@prevlabs.com.br') ? 'HTML cabeçalho OK' : 'HTML cabeçalho FALHOU')
  checks.push(!/<div class="sm-footer[\s"]/.test(html) ? 'HTML sem rodapé inline OK' : 'HTML rodapé inline FALHOU')
  checks.push(!/<div class="sm-timeline[\s"]/.test(html) ? 'HTML sem timeline OK' : 'HTML timeline FALHOU')

  // Conteúdo planilha no DOM
  const hasVals = (html.match(/R\$ 1\.518,00/g) || []).length >= 4
  checks.push(hasVals ? 'Valores R$ 1.518,00 ×4 no HTML' : 'Valores planilha ausentes')

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;max-width:${W}px;overflow:hidden;background:#fff;box-sizing:border-box;`
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const pageEl = (container.querySelector('.pdf-page') as HTMLElement) || container
    pageEl.style.setProperty('width', `${W}px`, 'important')
    pageEl.style.setProperty('max-width', `${W}px`, 'important')
    pageEl.style.setProperty('overflow', 'hidden', 'important')
    pageEl.style.setProperty('box-sizing', 'border-box', 'important')

    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      width: W,
      windowWidth: W,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (_d, cloned) => {
        const el = cloned as HTMLElement
        el.style.setProperty('width', `${W}px`, 'important')
        el.style.setProperty('max-width', `${W}px`, 'important')
        el.style.setProperty('overflow', 'hidden', 'important')
      },
    })

    checks.push(
      Math.abs(canvas.width - W * 2) <= 4
        ? `Canvas width OK (${canvas.width})`
        : `Canvas width FALHOU (${canvas.width}, esperado ${W * 2})`,
    )

    let finalCanvas = canvas
    const expectedW = W * 2
    if (canvas.width > expectedW + 2) {
      const cropped = document.createElement('canvas')
      cropped.width = expectedW
      cropped.height = canvas.height
      const cctx = cropped.getContext('2d')!
      cctx.fillStyle = '#fff'
      cctx.fillRect(0, 0, expectedW, canvas.height)
      cctx.drawImage(canvas, 0, 0)
      finalCanvas = cropped
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    checks.push(
      Math.abs(pageW - 595.28) < 1 && Math.abs(pageH - 841.89) < 1
        ? `A4 OK (${pageW.toFixed(1)}×${pageH.toFixed(1)} pt)`
        : `A4 FALHOU (${pageW}×${pageH})`,
    )

    const footerReservePt = 22
    const usableH = pageH - footerReservePt
    const pxPerPt = finalCanvas.width / pageW
    const pageSlicePx = Math.floor(usableH * pxPerPt)
    let srcY = 0
    let pages = 0
    let page1DataUrl = ''
    let lastPageDataUrl = ''
    while (srcY < finalCanvas.height - 1) {
      const sliceH = Math.min(pageSlicePx, finalCanvas.height - srcY)
      if (sliceH < 8) break
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = finalCanvas.width
      pageCanvas.height = sliceH
      const ctx = pageCanvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(finalCanvas, 0, srcY, finalCanvas.width, sliceH, 0, 0, finalCanvas.width, sliceH)
      const dataUrl = pageCanvas.toDataURL('image/jpeg', 0.85)
      if (pages === 0) page1DataUrl = dataUrl
      lastPageDataUrl = dataUrl
      if (pages > 0) pdf.addPage()
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, sliceH / pxPerPt)
      srcY += sliceH
      pages++
    }
    desenharRodapes(pdf)
    checks.push(`Páginas: ${pdf.getNumberOfPages()}`)

    return { blob: pdf.output('blob'), checks, page1DataUrl, lastPageDataUrl: lastPageDataUrl || page1DataUrl }
  } finally {
    container.remove()
  }
}

export default function TestePdfSmPage() {
  const [status, setStatus] = useState('Pronto')
  const [checks, setChecks] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [page1, setPage1] = useState<string | null>(null)
  const [lastPage, setLastPage] = useState<string | null>(null)

  const run = useCallback(async () => {
    setStatus('Gerando…')
    try {
      const { blob, checks: c, page1DataUrl, lastPageDataUrl } = await gerarPdf()
      setChecks(c)
      setPage1(page1DataUrl || null)
      setLastPage(lastPageDataUrl || null)
      const url = URL.createObjectURL(blob)
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      const res = await fetch('/api/dev/save-pdf', {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': 'application/pdf' },
      })
      const json = await res.json()
      setStatus(res.ok ? `Salvo: ${json.path} (${json.bytes} bytes)` : `Erro save: ${JSON.stringify(json)}`)
      ;(window as unknown as { __PDF_TEST_OK__?: boolean }).__PDF_TEST_OK__ = res.ok
      ;(window as unknown as { __PDF_CHECKS__?: string[] }).__PDF_CHECKS__ = c
    } catch (e) {
      setStatus(`Erro: ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720 }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>Teste PDF — SM Rural (Ana Lúcia)</h1>
      <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
        Timeline: none · Planilha estática R$ 1.518,00 · Cabeçalho Prev Labs
      </p>
      <button
        type="button"
        id="btn-gerar-pdf-teste"
        onClick={run}
        style={{
          padding: '10px 16px',
          background: '#0A2540',
          color: '#fff',
          border: 0,
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Gerar PDF de teste
      </button>
      <p id="pdf-status" style={{ marginTop: 12, fontSize: 13 }}>
        {status}
      </p>
      <ul style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6 }}>
        {checks.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {page1 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          id="pdf-page1-preview"
          src={page1}
          alt="Página 1 do PDF"
          style={{ width: 420, marginTop: 16, border: '1px solid #ccc', display: 'block' }}
        />
      ) : null}
      {lastPage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          id="pdf-last-preview"
          src={lastPage}
          alt="Última página do PDF"
          style={{ width: 420, marginTop: 16, border: '1px solid #ccc', display: 'block' }}
        />
      ) : null}
      {previewUrl ? (
        <iframe
          title="Prévia PDF"
          src={previewUrl}
          style={{ width: '100%', height: '70vh', marginTop: 16, border: '1px solid #ccc' }}
        />
      ) : null}
    </div>
  )
}
