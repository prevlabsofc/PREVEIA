/**
 * Paginação por blocos (DOM) antes da captura html2canvas.
 * Insere espaçadores para que títulos não fiquem órfãos e blocos
 * não sejam cortados no meio — o canvas é fatiado nos limites calculados.
 *
 * Blocos indivisíveis: data-pdf-block="atomic" (tabelas inteiras, do título à
 * última linha) e data-pdf-keep="1" / assinatura. Se não couberem no restante
 * da página, vão inteiros para a próxima (espaçador antes do título).
 * Tabela atômica maior que uma página: quebra só entre linhas completas,
 * ≥ 2 linhas de dados por parte, cabeçalho ([data-pdf-table-header]) repetido.
 * Parágrafos de encerramento são blocos independentes.
 * Nenhum bloco é empurrado para a página seguinte se couber inteiro.
 */

import { A4_HEIGHT_PX, A4_WIDTH_PX, MARGEM_PETICAO_CM } from '@/lib/peticao-export'

/**
 * Reserva CSS px para a faixa do rodapé desenhado no jsPDF.
 * Com HTML já margeado (comMargensNoHtml), o rodapé do PDF ocupa a
 * margem inferior — NÃO descontar de novo as margens top/bottom aqui
 * (evita altura útil ~25% menor e páginas com grande vazio).
 */
export const PDF_FOOTER_RESERVE_PX = 44

/** Altura útil de conteúdo por página (A4 @ 794px, menos margens + rodapé). */
export function alturaUtilPaginaPdfPx(
  containerWidthPx = A4_WIDTH_PX,
  comMargensNoHtml = false,
): number {
  const pageH = (297 / 210) * containerWidthPx
  const pxPerCm = containerWidthPx / 21
  // Se o HTML já traz padding de margem, não desconta margens de novo —
  // a paginação mede o fluxo completo do .pdf-page (incl. padding).
  // Reserva só a faixa do rodapé jsPDF (≈ margem inferior), uma única vez.
  if (comMargensNoHtml) {
    const rodapePx = MARGEM_PETICAO_CM.bottom * pxPerCm
    return Math.max(200, pageH - rodapePx)
  }
  const margens =
    (MARGEM_PETICAO_CM.top + MARGEM_PETICAO_CM.bottom) * pxPerCm
  // Sem padding no HTML: margens + reserva de tipografia do rodapé
  // (rodapé cabe na margem inferior; PDF_FOOTER_RESERVE cobre a linha de texto).
  return Math.max(200, pageH - margens)
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

const SEL_BLOCOS = '[data-pdf-block="1"],[data-pdf-block="atomic"]'

function isMarcadoComoBloco(el: HTMLElement): boolean {
  const v = el.getAttribute('data-pdf-block')
  return v === '1' || v === 'atomic'
}

function isBlocoAtomico(el: HTMLElement): boolean {
  return (
    el.getAttribute('data-pdf-block') === 'atomic' ||
    el.getAttribute('data-pdf-keep') === '1' ||
    el.classList.contains('sm-assinatura-bloco')
  )
}

function nomeBloco(el: HTMLElement): string {
  return el.getAttribute('data-pdf-nome') || el.className.split(' ')[0] || el.tagName.toLowerCase()
}

export type RelatorioPaginacao = {
  /** Blocos atômicos empurrados inteiros para a página seguinte, com a sobra deixada. */
  empurrados: { bloco: string; pagina: number; sobraPx: number; sobraPct: number }[]
  /** Tabelas divididas entre linhas (cabeçalho repetido): maiores que uma página ou pela válvula de 30%. */
  divisoes: { bloco: string; pagina: number; linhasNaPagina: number; linhasRestantes: number }[]
  /** Fração da altura útil ocupada em cada página, após paginar. */
  ocupacao: number[]
  /** Páginas (exceto a última) que terminam antes de 80% da altura útil. */
  alertas: { pagina: number; ocupacaoPct: number; sobraPx: number; causa: string }[]
}

export function novoRelatorioPaginacao(): RelatorioPaginacao {
  return { empurrados: [], divisoes: [], ocupacao: [], alertas: [] }
}

/** Válvula: se manter a tabela inteira deixar mais que isso vazio na página, ela pode quebrar. */
const VALVULA_VAZIO = 0.3
const OCUPACAO_MINIMA = 0.8

/** Só tabelas marcadas com data-pdf-quebra="linhas" podem quebrar (planilha e timeline nunca). */
function isTabelaQuebravel(el: HTMLElement): boolean {
  return el.getAttribute('data-pdf-quebra') === 'linhas'
}

function isCaixaProva(el: HTMLElement): boolean {
  return el.getAttribute('data-pdf-prova') === '1'
}

/**
 * Divide uma tabela atômica entre linhas completas: as linhas que terminam até
 * `limiteY` ficam no bloco; as demais vão para um bloco de continuação atômico,
 * inserido logo depois, com o cabeçalho da tabela repetido.
 * Retorna quantas linhas ficaram, ou null se não der para deixar `minLinhas` de cada lado.
 */
function dividirTabelaAtomica(
  el: HTMLElement,
  root: HTMLElement,
  limiteY: number,
  minLinhas = 2,
): { ficaram: number; restantes: number; continuacao: HTMLElement } | null {
  const table = el.querySelector('table') as HTMLTableElement | null
  const tbody = table?.tBodies[0]
  if (!table || !tbody) return null
  const rows = Array.from(tbody.rows)
  if (rows.length < minLinhas * 2) return null

  let cabem = 0
  for (const row of rows) {
    if (relOffsetTop(row, root) + row.offsetHeight > limiteY - 1) break
    cabem += 1
  }
  cabem = Math.min(cabem, rows.length - minLinhas)
  if (cabem < minLinhas) return null

  const cont = el.cloneNode(false) as HTMLElement
  cont.removeAttribute('id')
  cont.setAttribute('data-pdf-continuacao', '1')
  const header = el.querySelector('[data-pdf-table-header]')
  if (header) cont.appendChild(header.cloneNode(true))
  const novaTabela = table.cloneNode(false) as HTMLTableElement
  table.querySelectorAll(':scope > colgroup, :scope > thead').forEach((n) => {
    novaTabela.appendChild(n.cloneNode(true))
  })
  const novoBody = tbody.cloneNode(false) as HTMLTableSectionElement
  rows.slice(cabem).forEach((r) => novoBody.appendChild(r))
  novaTabela.appendChild(novoBody)
  cont.appendChild(novaTabela)
  el.parentNode?.insertBefore(cont, el.nextSibling)
  return { ficaram: cabem, restantes: rows.length - cabem, continuacao: cont }
}

/** Parágrafo de texto corrido que pode ser dividido entre páginas (≥ 2 linhas de cada lado). */
function isParagrafoDivisivel(el: HTMLElement): boolean {
  return (
    el.tagName === 'P' &&
    (el.classList.contains('sm-para') || el.classList.contains('doc-para')) &&
    !isBlocoAtomico(el) &&
    !isTituloOuSubhead(el)
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

/** Base (px CSS, relativo a `root`) do último bloco de conteúdo visível. */
export function fimConteudoPaginacaoPx(root: HTMLElement): number {
  let fim = 0
  for (const b of coletarBlocosPaginacao(root)) {
    if (b.offsetHeight <= 0) continue
    fim = Math.max(fim, relOffsetTop(b, root) + b.offsetHeight)
  }
  return fim > 0 ? fim : Number.POSITIVE_INFINITY
}

/**
 * Coleta blocos marcados; se vazio, usa seletor de fallback.
 * Títulos/subheads são agrupados com o bloco seguinte (keep-with-next).
 */
export function coletarBlocosPaginacao(root: HTMLElement): HTMLElement[] {
  const marked = Array.from(root.querySelectorAll(SEL_BLOCOS)) as HTMLElement[]
  // Evita blocos aninhados (ex.: faixa de seção dentro do bloco do quadro)
  const topLevel = marked.filter((el) => {
    let p = el.parentElement
    while (p && p !== root) {
      if (isMarcadoComoBloco(p)) return false
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
    '.sm-assinatura-bloco',
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
  relatorio: RelatorioPaginacao = novoRelatorioPaginacao(),
): number[] {
  // Remove espaçadores de runs anteriores
  root.querySelectorAll('[data-pdf-spacer="1"]').forEach((n) => n.remove())

  const registrarEmpurrado = (bloco: string, sobraPx: number) => {
    const item = {
      bloco,
      pagina: pageBreaks.length + 1,
      sobraPx: Math.round(sobraPx),
      sobraPct: Math.round((sobraPx / pageUsablePx) * 100),
    }
    relatorio.empurrados.push(item)
    console.info(
      `[pdf-paginacao] "${bloco}" não coube e foi para a página ${item.pagina + 1}; ` +
        `sobra na página ${item.pagina}: ${item.sobraPx}px (${item.sobraPct}%)`,
    )
  }

  const registrarDivisao = (el: HTMLElement, ficaram: number, restantes: number, motivo: string) => {
    const item = { bloco: nomeBloco(el), pagina: pageBreaks.length + 1, linhasNaPagina: ficaram, linhasRestantes: restantes }
    relatorio.divisoes.push(item)
    console.info(
      `[pdf-paginacao] "${item.bloco}" ${motivo}: ${ficaram} linha(s) na página ${item.pagina}, ` +
        `${restantes} na continuação com cabeçalho repetido`,
    )
  }

  const pageBreaks: number[] = []
  let pageStart = 0
  let pageEnd = pageUsablePx
  let guard = 0

  const avancarComEspacador = (alvo: HTMLElement, falta: number) => {
    alvo.parentNode?.insertBefore(criarEspacador(falta), alvo)
    pageBreaks.push(pageEnd)
    pageStart = pageEnd
    pageEnd = pageStart + pageUsablePx
  }

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

    // Título + 2 primeiras linhas do próximo bloco; se o próximo for atômico
    // (tabela) e couber numa página, título + bloco inteiro.
    // Títulos encadeados (faixa + "Diante do exposto, requer:") contam como um grupo só.
    if (isTituloOuSubhead(el) && i + 1 < blocks.length) {
      let j = i + 1
      while (j + 1 < blocks.length && isTituloOuSubhead(blocks[j])) j += 1
      const next = blocks[j]
      const nextTop = relOffsetTop(next, root)
      const lhNext = Math.max(10, lineHeightPx(next))
      const nextAtomico = isBlocoAtomico(next) && nextTop + next.offsetHeight - top <= pageUsablePx
      const segundaCaixa = isCaixaProva(next) && blocks[j + 1] && isCaixaProva(blocks[j + 1]) ? blocks[j + 1] : null
      const groupBottom = segundaCaixa
        ? relOffsetTop(segundaCaixa, root) + segundaCaixa.offsetHeight
        : nextAtomico
          ? nextTop + next.offsetHeight
          : nextTop + Math.min(next.offsetHeight, lhNext * 2 + 8)

      if (groupBottom > pageEnd + 0.5 && top > pageStart + 2) {
        const falta = pageEnd - top
        if (falta > 1) {
          if (nextAtomico) registrarEmpurrado(`${nomeBloco(next)} (com título)`, falta)
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

    // Caixa de prova que não cabe: quebra entre caixas, com ≥ 2 caixas em cada
    // parte (nunca 1 sozinha no fim ou no início da página).
    if (isCaixaProva(el) && bottom > pageEnd + 0.5 && top > pageStart + 2) {
      const caixas = Array.from(el.parentElement?.children || []).filter(
        (c) => c instanceof HTMLElement && isCaixaProva(c),
      ) as HTMLElement[]
      const idx = caixas.indexOf(el)
      let corte = Math.min(idx, caixas.length - 2)
      const naPagina = (k: number) =>
        caixas.slice(0, k).filter((c) => relOffsetTop(c, root) >= pageStart - 0.5).length
      if (corte > 0 && naPagina(corte) < 2) corte -= naPagina(corte)
      let alvo: HTMLElement = caixas[Math.max(0, corte)]
      if (corte <= 0) {
        const anterior = blocks[blocks.indexOf(caixas[0]) - 1]
        if (anterior && isTituloOuSubhead(anterior)) alvo = anterior
      }
      const falta = pageEnd - relOffsetTop(alvo, root)
      if (falta > 1 && relOffsetTop(alvo, root) > pageStart + 2) {
        registrarEmpurrado(`caixa de prova ${Math.max(0, corte) + 1} de ${caixas.length}`, falta)
        avancarComEspacador(alvo, falta)
        blocks = getBlocks()
        continue
      }
    }

    // Válvula: tabela quebrável que, empurrada inteira, deixaria > 30% vazio —
    // quebra entre linhas, ≥ 3 linhas em cada parte, título na primeira parte.
    const fimAnterior = i > 0 ? relOffsetTop(blocks[i - 1], root) + blocks[i - 1].offsetHeight : pageStart
    if (
      isTabelaQuebravel(el) &&
      bottom > pageEnd + 0.5 &&
      top > pageStart + 2 &&
      pageEnd - Math.max(pageStart, fimAnterior) > pageUsablePx * VALVULA_VAZIO
    ) {
      const div = dividirTabelaAtomica(el, root, pageEnd, 3)
      if (div) {
        registrarDivisao(el, div.ficaram, div.restantes, 'quebrada pela válvula de 30%')
        blocks = getBlocks()
        continue
      }
    }

    // Tabela quebrável maior que uma página: divide entre linhas completas
    // no espaço restante; se nem 2 linhas couberem aqui, vai para a próxima.
    if (isBlocoAtomico(el) && h > pageUsablePx && bottom > pageEnd + 0.5) {
      const div = isTabelaQuebravel(el) ? dividirTabelaAtomica(el, root, pageEnd) : null
      if (div) {
        registrarDivisao(el, div.ficaram, div.restantes, 'maior que uma página')
        blocks = getBlocks()
        continue
      }
      if (top > pageStart + 2) {
        const falta = pageEnd - top
        registrarEmpurrado(nomeBloco(el), falta)
        el.parentNode?.insertBefore(criarEspacador(falta), el)
        pageBreaks.push(pageEnd)
        pageStart = pageEnd
        pageEnd = pageStart + pageUsablePx
        blocks = getBlocks()
        continue
      }
    }

    // Bloco atômico (tabela inteira, timeline, assinatura…): nunca partir
    if (isBlocoAtomico(el) && h <= pageUsablePx && bottom > pageEnd + 0.5 && top > pageStart + 2) {
      const falta = pageEnd - top
      if (falta > 1) {
        registrarEmpurrado(nomeBloco(el), falta)
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
    // (exceto parágrafo longo > meia página — quebra em line-height)
    const lh = Math.max(10, lineHeightPx(el))
    const halfPage = pageUsablePx / 2
    const room = pageEnd - top

    // Parágrafo corrido que não cabe: divide em múltiplo exato do line-height,
    // deixando ≥ 2 linhas em cada página (em vez de empurrar e deixar vazio).
    if (isParagrafoDivisivel(el) && bottom > pageEnd + 0.5) {
      const totalLines = Math.round(h / lh)
      const lines = Math.floor(room / lh)
      if (totalLines >= 4 && lines >= 2 && totalLines - lines >= 2) {
        const cutAt = top + lines * lh
        pageBreaks.push(cutAt)
        pageStart = cutAt
        pageEnd = pageStart + pageUsablePx
        continue
      }
    }

    // BUG3: parágrafo > restante E > meia página → cortar só em múltiplo exato do line-height
    if (h > halfPage && room >= lh && bottom > pageEnd + 0.5) {
      const lines = Math.max(1, Math.floor(room / lh))
      const cutAt = top + lines * lh
      if (cutAt > top + lh * 0.5 && cutAt < bottom - lh * 0.5) {
        pageBreaks.push(cutAt)
        pageStart = cutAt
        pageEnd = pageStart + pageUsablePx
        continue
      }
    }

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

    // Bloco maior que uma página (sem ter entrado no corte acima): múltiplos de lh
    if (h > pageUsablePx || bottom > pageEnd + 0.5) {
      const room2 = pageEnd - top
      if (room2 > lh) {
        const lines = Math.floor(room2 / lh)
        const cutAt = top + lines * lh
        pageBreaks.push(Math.min(cutAt, pageEnd))
        pageStart = pageBreaks[pageBreaks.length - 1]
        pageEnd = pageStart + pageUsablePx
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

  // BUG4: se o último pageBreak deixa uma fatia final que caberia na página anterior
  // (ex.: ~2 linhas / fecho empurrado indevidamente), remove o break e o espaçador.
  while (pageBreaks.length > 0) {
    const lastBreak = pageBreaks[pageBreaks.length - 1]
    const rem = totalH - lastBreak
    if (rem <= 0) {
      pageBreaks.pop()
      continue
    }
    // Quase vazio: < 28% da útil OU menos que ~3 linhas (~48px) → fundir,
    // mas só se o resto couber no espaço do espaçador (senão estouraria a página
    // anterior e o excedente seria cortado na montagem do PDF).
    const quaseVazio = rem < pageUsablePx * 0.28 || rem < 48
    if (quaseVazio) {
      const spacer = (Array.from(root.querySelectorAll('[data-pdf-spacer="1"]')) as HTMLElement[]).find(
        (sp) => Math.abs(relOffsetTop(sp, root) + sp.offsetHeight - lastBreak) < 2,
      )
      if (spacer && spacer.offsetHeight + 1 >= rem) {
        spacer.remove()
        pageBreaks.pop()
        continue
      }
    }
    break
  }

  // Garante que o último pageEnd cobriu o conteúdo
  let pageEndCursor =
    pageBreaks.length > 0 ? pageBreaks[pageBreaks.length - 1] + pageUsablePx : pageUsablePx
  // Recalcula total após possível remoção de spacers
  const totalH2 = Math.max(root.scrollHeight, root.offsetHeight)
  while (pageEndCursor < totalH2 - 1 && pageBreaks.length < 80) {
    pageBreaks.push(pageEndCursor)
    pageEndCursor += pageUsablePx
  }

  verificarOcupacao(root, pageBreaks, pageUsablePx, relatorio)
  return pageBreaks
}

/** Mede a ocupação de cada página e loga as que terminam antes de 80% (exceto a última). */
function verificarOcupacao(
  root: HTMLElement,
  pageBreaks: number[],
  pageUsablePx: number,
  relatorio: RelatorioPaginacao,
): void {
  const blocos = coletarBlocosPaginacao(root)
    .filter((b) => b.offsetHeight > 0)
    .map((b) => ({ el: b, top: relOffsetTop(b, root), bottom: relOffsetTop(b, root) + b.offsetHeight }))
  const fim = blocos.reduce((m, b) => Math.max(m, b.bottom), 0)
  const inicios = [0, ...pageBreaks.filter((y) => y < fim - 1)]
  relatorio.ocupacao = []
  relatorio.alertas = []
  inicios.forEach((ini, k) => {
    const fimPagina = inicios[k + 1] ?? ini + pageUsablePx
    let usado = ini
    for (const b of blocos) {
      if (b.top >= fimPagina - 0.5 || b.bottom <= ini + 0.5) continue
      usado = Math.max(usado, Math.min(b.bottom, fimPagina))
    }
    const ocupacao = (usado - ini) / pageUsablePx
    relatorio.ocupacao.push(Math.round(ocupacao * 100) / 100)
    if (k === inicios.length - 1 || ocupacao >= OCUPACAO_MINIMA) return
    const proximo = blocos.find((b) => b.top >= fimPagina - 1.5)
    const causa = proximo
      ? `${nomeBloco(proximo.el)}: "${(proximo.el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50)}"`
      : 'desconhecida'
    const alerta = {
      pagina: k + 1,
      ocupacaoPct: Math.round(ocupacao * 100),
      sobraPx: Math.round(ini + pageUsablePx - usado),
      causa,
    }
    relatorio.alertas.push(alerta)
    console.warn(
      `[pdf-paginacao] página ${alerta.pagina} termina em ${alerta.ocupacaoPct}% da altura útil ` +
        `(sobra ${alerta.sobraPx}px); bloco empurrado para a página seguinte: ${causa}`,
    )
  })
}

/** Converte limites CSS px → coordenadas do canvas (× scale), com fim = altura do canvas. */
export function limitesCanvasDePaginas(
  pageBreaksCss: number[],
  canvasHeight: number,
  scale: number,
  /** Altura útil da página em px do canvas: fusões nunca ultrapassam esse limite. */
  maxSliceH = Number.POSITIVE_INFINITY,
  /** Fim do último bloco de conteúdo em px CSS: o que vem depois é só margem/padding em branco. */
  fimConteudoCss = Number.POSITIVE_INFINITY,
): { y: number; h: number }[] {
  const fim = Math.min(canvasHeight, Math.ceil(fimConteudoCss * scale))
  const cabe = (s: { y: number }, hTotal: number) => Math.min(s.y + hTotal, fim) - s.y <= maxSliceH
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
  } else if (
    slices.length > 0 &&
    rem > 0 &&
    cabe(slices[slices.length - 1], slices[slices.length - 1].h + rem)
  ) {
    // funde fiapo final na página anterior (evita página em branco)
    slices[slices.length - 1].h += rem
  } else if (slices.length === 0 && canvasHeight > 0) {
    slices.push({ y: 0, h: canvasHeight })
  }

  // Remove última página quase vazia (< 35% da altura média OU < ~3 linhas @ scale)
  // — evita meia página / ~2 linhas em branco após a planilha.
  if (slices.length > 1) {
    const last = slices[slices.length - 1]
    const avg = slices.slice(0, -1).reduce((s, x) => s + x.h, 0) / (slices.length - 1)
    const tresLinhas = Math.max(36, Math.round(48 * scale))
    const prev = slices[slices.length - 2]
    const semConteudo = last.y >= fim - 2
    if (semConteudo || ((last.h < avg * 0.35 || last.h < tresLinhas) && cabe(prev, prev.h + last.h))) {
      slices.pop()
      if (slices.length) slices[slices.length - 1].h += last.h
    }
  }

  return slices
}

export { A4_HEIGHT_PX }
