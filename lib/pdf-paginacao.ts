/**
 * Paginação por blocos (DOM) antes da captura html2canvas.
 * Insere espaçadores para que títulos não fiquem órfãos e blocos
 * não sejam cortados no meio — o canvas é fatiado nos limites calculados.
 *
 * Regra do fecho (assinatura + planilha): tratados como unidade atômica
 * (data-pdf-keep no .sm-fecho-bloco). Só quebra página se o bloco inteiro
 * não couber — evita página final quase vazia só com a planilha.
 */

import { A4_HEIGHT_PX, A4_WIDTH_PX, MARGEM_PETICAO_CM } from '@/lib/peticao-export'

/** Reserva CSS px para a faixa do rodapé desenhado no jsPDF. */
export const PDF_FOOTER_RESERVE_PX = 44

/** Altura útil de conteúdo por página (A4 @ 794px, menos margens + rodapé). */
export function alturaUtilPaginaPdfPx(
  containerWidthPx = A4_WIDTH_PX,
  comMargensNoHtml = false,
): number {
  const pageH = (297 / 210) * containerWidthPx
  const pxPerCm = containerWidthPx / 21
  // Se o HTML já traz padding de margem, não desconta de novo aqui —
  // a paginação mede o fluxo completo do .pdf-page (incl. padding).
  const margens = comMargensNoHtml
    ? 0
    : (MARGEM_PETICAO_CM.top + MARGEM_PETICAO_CM.bottom) * pxPerCm
  return Math.max(200, pageH - margens - PDF_FOOTER_RESERVE_PX)
}

export function relOffsetTop(el: HTMLElement, root: HTMLElement): number {
  const er = el.getBoundingClientRect()
  const rr = root.getBoundingClientRect()
  return er.top - rr.top + root.scrollTop
}

function lineHeightPx(el: HTMLElement): number {
  try {
    const cs = window.getComputedStyle(el)
    const raw = cs.lineHeight
    if (raw && raw !== 'normal') {
      const n = parseFloat(raw)
      if (Number.isFinite(n) && n > 0) return n
    }
    const fs = parseFloat(cs.fontSize) || 12
    return fs * 1.65
  } catch {
    return 12 * 1.65
  }
}

function isTituloOuSubhead(el: HTMLElement): boolean {
  return (
    el.classList.contains('sm-section-bar') ||
    el.classList.contains('sm-subhead') ||
    el.classList.contains('section-bar') ||
    el.classList.contains('section-classic') ||
    el.classList.contains('sub-title') ||
    el.classList.contains('sub-sub-title') ||
    el.classList.contains('sm-table-caption') ||
    el.classList.contains('sm-anexo-title') ||
    el.getAttribute('data-pdf-keep-with-next') === '1'
  )
}

function isBlocoAtomico(el: HTMLElement): boolean {
  return (
    el.getAttribute('data-pdf-keep') === '1' ||
    el.classList.contains('sm-fecho-bloco')
  )
}

function criarEspacador(heightPx: number): HTMLElement {
  const spacer = document.createElement('div')
  spacer.className = 'pdf-page-spacer'
  spacer.setAttribute('data-pdf-spacer', '1')
  spacer.setAttribute('aria-hidden', 'true')
  spacer.style.cssText = `display:block;width:100%;height:${Math.max(0, heightPx)}px;margin:0;padding:0;border:0;pointer-events:none;`
  return spacer
}

/**
 * Coleta blocos marcados; se vazio, usa seletor de fallback.
 * Títulos/subheads são agrupados com o bloco seguinte (keep-with-next).
 */
export function coletarBlocosPaginacao(root: HTMLElement): HTMLElement[] {
  const marked = Array.from(
    root.querySelectorAll('[data-pdf-block="1"]'),
  ) as HTMLElement[]
  // Evita blocos aninhados (ex.: parágrafos dentro de .sm-fecho-bloco)
  const topLevel = marked.filter((el) => {
    let p = el.parentElement
    while (p && p !== root) {
      if (p.getAttribute('data-pdf-block') === '1') return false
      p = p.parentElement
    }
    return true
  })
  if (topLevel.length > 0) return topLevel

  const fallbackSel = [
    '.sm-header',
    '.sm-endereco',
    '.sm-meta-row',
    'p.sm-para',
    'p.sm-para-qualif',
    '.sm-main-title',
    '.sm-sub-title',
    '.sm-section-bar',
    '.sm-subhead',
    'table.sm-quadro tr',
    '.sm-table-wrap',
    '.sm-timeline',
    'table.sm-provas-table tr',
    'table.sm-pedido-item',
    '.sm-pedidos-intro',
    '.sm-fechamento',
    '.sm-fecho-bloco',
    '.sm-anexo',
    '.sm-doc-fecho-wrap',
    'p.doc-para',
    '.section-bar',
    '.section-classic',
    '.sub-title',
    '.proof-item',
    '.closing-block',
    '.pdf-header',
  ].join(',')

  return Array.from(root.querySelectorAll(fallbackSel)) as HTMLElement[]
}

/**
 * Insere espaçadores para alinhar blocos às páginas.
 * Retorna os Y (CSS px relativos ao root) onde cada página termina
 * (limites exatos para fatiar o canvas).
 */
export function aplicarPaginacaoPorBlocos(
  root: HTMLElement,
  pageUsablePx: number,
): number[] {
  // Remove espaçadores de runs anteriores
  root.querySelectorAll('[data-pdf-spacer="1"]').forEach((n) => n.remove())

  const pageBreaks: number[] = []
  let pageStart = 0
  let pageEnd = pageUsablePx
  let guard = 0

  const getBlocks = () =>
    coletarBlocosPaginacao(root).filter((el) => el.offsetHeight > 0)

  let blocks = getBlocks()
  let i = 0

  while (i < blocks.length && guard < 5000) {
    guard += 1
    const el = blocks[i]
    if (!el.isConnected) {
      blocks = getBlocks()
      continue
    }

    const top = relOffsetTop(el, root)
    const h = el.offsetHeight
    const bottom = top + h

    // Já passou do início da página atual (conteúdo acima) — avança página
    if (top >= pageEnd - 0.5) {
      pageBreaks.push(pageEnd)
      pageStart = pageEnd
      pageEnd = pageStart + pageUsablePx
      continue
    }

    // Título + próximo bloco devem caber juntos
    if (isTituloOuSubhead(el) && i + 1 < blocks.length) {
      const next = blocks[i + 1]
      const nextH = next.offsetHeight
      const groupH = h + Math.max(0, relOffsetTop(next, root) + nextH - bottom)
      const groupBottom = top + Math.min(groupH, h + nextH + 8)

      if (groupBottom > pageEnd + 0.5 && top > pageStart + 2) {
        const falta = pageEnd - top
        if (falta > 1) {
          el.parentNode?.insertBefore(criarEspacador(falta), el)
          pageBreaks.push(pageEnd)
          pageStart = pageEnd
          pageEnd = pageStart + pageUsablePx
          blocks = getBlocks()
          // reprocessa o título na nova página
          continue
        }
      }
      i += 1
      continue
    }

    // Bloco atômico (fecho assinatura+planilha, timeline…): nunca partir
    if (isBlocoAtomico(el) && h <= pageUsablePx && bottom > pageEnd + 0.5 && top > pageStart + 2) {
      const falta = pageEnd - top
      if (falta > 1) {
        el.parentNode?.insertBefore(criarEspacador(falta), el)
        pageBreaks.push(pageEnd)
        pageStart = pageEnd
        pageEnd = pageStart + pageUsablePx
        blocks = getBlocks()
        continue
      }
    }

    // Bloco cabe na página
    if (bottom <= pageEnd + 0.5) {
      i += 1
      continue
    }

    // Bloco não cabe: se já há conteúdo nesta página, empurra
    if (top > pageStart + 2 && h <= pageUsablePx) {
      const falta = pageEnd - top
      if (falta > 1) {
        el.parentNode?.insertBefore(criarEspacador(falta), el)
        pageBreaks.push(pageEnd)
        pageStart = pageEnd
        pageEnd = pageStart + pageUsablePx
        blocks = getBlocks()
        continue
      }
    }

    // Bloco maior que uma página: permite quebra, mas só em múltiplos de line-height
    if (h > pageUsablePx || bottom > pageEnd + 0.5) {
      const lh = Math.max(10, lineHeightPx(el))
      // Quanto cabe nesta página a partir de top
      const room = pageEnd - top
      if (room > lh * 1.5) {
        const lines = Math.floor(room / lh)
        const cutAt = top + lines * lh
        // Marca limite de página no corte de linha
        pageBreaks.push(Math.min(cutAt, pageEnd))
        pageStart = pageBreaks[pageBreaks.length - 1]
        pageEnd = pageStart + pageUsablePx
        // Continua no mesmo bloco (agora em nova página)
        continue
      }
      // Room insuficiente: empurra bloco inteiro
      if (top > pageStart + 2) {
        const falta = pageEnd - top
        if (falta > 1) {
          el.parentNode?.insertBefore(criarEspacador(falta), el)
          pageBreaks.push(pageEnd)
          pageStart = pageEnd
          pageEnd = pageStart + pageUsablePx
          blocks = getBlocks()
          continue
        }
      }
      // Força avanço de página
      pageBreaks.push(pageEnd)
      pageStart = pageEnd
      pageEnd = pageStart + pageUsablePx
      continue
    }

    i += 1
  }

  // Altura final do conteúdo → último limite
  const totalH = Math.max(root.scrollHeight, root.offsetHeight)
  // Garante que o último pageEnd cobriu o conteúdo
  while (pageEnd < totalH - 1 && pageBreaks.length < 80) {
    pageBreaks.push(pageEnd)
    pageEnd += pageUsablePx
  }
  // Se sobrou fração de página com conteúdo, o fim do conteúdo é o último corte
  if (totalH > (pageBreaks[pageBreaks.length - 1] || 0) + 2) {
    // não adiciona página em branco: o último slice vai até totalH
  }

  return pageBreaks
}

/** Converte limites CSS px → coordenadas do canvas (× scale), com fim = altura do canvas. */
export function limitesCanvasDePaginas(
  pageBreaksCss: number[],
  canvasHeight: number,
  scale: number,
): { y: number; h: number }[] {
  const breaks = pageBreaksCss
    .map((y) => Math.round(y * scale))
    .filter((y, idx, arr) => y > 0 && (idx === 0 || y > arr[idx - 1]))
    .filter((y) => y < canvasHeight - 2)

  const slices: { y: number; h: number }[] = []
  let y = 0
  for (const b of breaks) {
    const h = b - y
    if (h >= 4) slices.push({ y, h })
    y = b
  }
  const rem = canvasHeight - y
  if (rem >= 8) {
    slices.push({ y, h: rem })
  } else if (slices.length > 0 && rem > 0) {
    // funde fiapo final na página anterior (evita página em branco)
    slices[slices.length - 1].h += rem
  } else if (slices.length === 0 && canvasHeight > 0) {
    slices.push({ y: 0, h: canvasHeight })
  }

  // Remove última página quase vazia (< 15% da altura média)
  if (slices.length > 1) {
    const last = slices[slices.length - 1]
    const avg = slices.slice(0, -1).reduce((s, x) => s + x.h, 0) / (slices.length - 1)
    if (last.h < avg * 0.15) {
      slices.pop()
      if (slices.length) slices[slices.length - 1].h += last.h
    }
  }

  return slices
}

export { A4_HEIGHT_PX }
