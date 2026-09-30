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
 * Faixa IV + lista de provas e o encerramento (Protesta / Dá-se à causa / Termos)
 * são blocos indivisíveis. Parágrafos longos só se dividem entre linhas reais
 * completas, e nenhum corte final atravessa uma linha de texto ou caixa.
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
    return fs * 1.2
  } catch {
    return 12 * 1.2
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

/** Faixa IV + lista de provas: indivisível; só quebra entre caixas se não couber numa página vazia. */
function isListaProvas(el: HTMLElement): boolean {
  return el.getAttribute('data-pdf-quebra') === 'provas'
}

/**
 * Divide a lista de provas entre caixas completas: as caixas que terminam até
 * `limiteY` ficam; as demais vão para um bloco de continuação inserido logo depois.
 * Exige `minCaixas` em cada parte.
 */
function dividirListaProvas(
  el: HTMLElement,
  root: HTMLElement,
  limiteY: number,
  minCaixas = 3,
): { ficaram: number; restantes: number } | null {
  const caixas = Array.from(el.querySelectorAll('[data-pdf-prova="1"]')) as HTMLElement[]
  const lista = caixas[0]?.parentElement
  if (!lista || caixas.length < minCaixas * 2) return null
  let cabem = 0
  for (const c of caixas) {
    if (relOffsetTop(c, root) + c.offsetHeight > limiteY - 1) break
    cabem += 1
  }
  cabem = Math.min(cabem, caixas.length - minCaixas)
  if (cabem < minCaixas) return null
  const cont = el.cloneNode(false) as HTMLElement
  cont.setAttribute('data-pdf-continuacao', '1')
  const novaLista = lista.cloneNode(false) as HTMLElement
  caixas.slice(cabem).forEach((c) => novaLista.appendChild(c))
  cont.appendChild(novaLista)
  el.parentNode?.insertBefore(cont, el.nextSibling)
  return { ficaram: cabem, restantes: caixas.length - cabem }
}

type FaixaY = { top: number; bottom: number }

/** Tinta de descendentes/antialias pode passar ~1–2px do retângulo da linha. */
const FOLGA_DESCENDENTE = 2

/**
 * Linhas reais de texto (Range.getClientRects) dentro de `el`, em px relativos
 * ao root. Retângulos que se sobrepõem verticalmente formam uma linha.
 */
function linhasDeTexto(el: HTMLElement, root: HTMLElement): FaixaY[] {
  const rr = root.getBoundingClientRect()
  const off = root.scrollTop - rr.top
  const rects: FaixaY[] = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue
    range.selectNodeContents(n)
    for (const r of Array.from(range.getClientRects())) {
      if (r.height < 1 || r.width < 0.5) continue
      rects.push({ top: r.top + off, bottom: r.bottom + off })
    }
  }
  rects.sort((a, b) => a.top - b.top)
  const linhas: FaixaY[] = []
  for (const r of rects) {
    const ult = linhas[linhas.length - 1]
    if (ult && r.top < ult.bottom - 1) ult.bottom = Math.max(ult.bottom, r.bottom)
    else linhas.push({ ...r })
  }
  return linhas
}

/**
 * Ponto de corte de um bloco de texto no espaço entre duas linhas completas:
 * todas as linhas acima do corte terminam até `limiteY`. Respeita o mínimo de
 * linhas antes/depois. null se não houver corte válido.
 */
function corteEntreLinhas(
  el: HTMLElement,
  root: HTMLElement,
  limiteY: number,
  minAntes = 2,
  minDepois = 2,
): number | null {
  const linhas = linhasDeTexto(el, root)
  if (linhas.length < minAntes + minDepois) return null
  let k = linhas.findIndex((l) => l.bottom + FOLGA_DESCENDENTE > limiteY)
  if (k === -1) return null
  k = Math.min(k, linhas.length - minDepois)
  if (k < minAntes) return null
  return Math.min((linhas[k - 1].bottom + linhas[k].top) / 2, limiteY)
}

/** Faixas verticais que nenhum corte de página pode atravessar (linhas de texto e caixas visuais). */
function faixasIndivisiveis(root: HTMLElement, pageUsablePx: number): FaixaY[] {
  const caixas = Array.from(
    root.querySelectorAll(
      'tr, img, svg, .sm-section-bar, .sm-table-caption, [data-pdf-prova="1"], .sm-sign-row, .sm-meta-box',
    ),
  ) as HTMLElement[]
  const rr = root.getBoundingClientRect()
  const off = root.scrollTop - rr.top
  const visuais = caixas
    .map((c) => c.getBoundingClientRect())
    .filter((r) => r.height >= 1 && r.height < pageUsablePx)
    .map((r) => ({ top: r.top + off, bottom: r.bottom + off }))
  const texto = linhasDeTexto(root, root).map((l) => ({ top: l.top, bottom: l.bottom + FOLGA_DESCENDENTE }))
  return [...texto, ...visuais]
}

/**
 * Validação pós-paginação: nenhum corte pode cair dentro de uma linha de texto
 * ou caixa visual, e nenhuma página pode passar da altura útil. Corte inválido
 * recua para o fim da linha anterior (e é logado).
 */
function validarCortes(root: HTMLElement, pageBreaks: number[], pageUsablePx: number): number[] {
  const faixas = faixasIndivisiveis(root, pageUsablePx)
  const totalH = Math.max(root.scrollHeight, root.offsetHeight)
  const out: number[] = []
  let prev = 0
  const ajustar = (alvo: number): number => {
    let b = Math.min(alvo, prev + pageUsablePx)
    for (let guard = 0; guard < 100; guard += 1) {
      const hit = faixas.find((f) => f.top < b - 0.5 && f.bottom > b + 0.5)
      if (!hit) break
      console.warn(
        `[pdf-paginacao] corte em ${b.toFixed(1)}px cairia dentro de uma linha/caixa ` +
          `(${hit.top.toFixed(1)}–${hit.bottom.toFixed(1)}px); recuado para ${(hit.top - 0.5).toFixed(1)}px`,
      )
      b = hit.top - 0.5
    }
    return b > prev + 1 ? b : Math.min(alvo, prev + pageUsablePx)
  }
  for (const alvo of pageBreaks) {
    if (alvo <= prev + 1) continue
    if (alvo >= totalH - 1 && totalH - prev <= pageUsablePx + 0.5) break
    const b = ajustar(alvo)
    if (Math.abs(b - alvo) > 0.01) {
      console.warn(`[pdf-paginacao] corte da página ${out.length + 1} ajustado de ${alvo.toFixed(1)} para ${b.toFixed(1)}px`)
    }
    out.push(b)
    prev = b
  }
  while (totalH - prev > pageUsablePx + 0.5 && out.length < 80) {
    const b = ajustar(prev + pageUsablePx)
    out.push(b)
    prev = b
  }
  return out
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
      const groupBottom = nextAtomico
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
    // Lista de provas maior que uma página: divide entre caixas, ≥ 3 em cada parte.
    if (isBlocoAtomico(el) && h > pageUsablePx && bottom > pageEnd + 0.5) {
      const div = isTabelaQuebravel(el)
        ? dividirTabelaAtomica(el, root, pageEnd)
        : isListaProvas(el)
          ? dividirListaProvas(el, root, pageEnd, 3)
          : null
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

    // Parágrafo corrido que não cabe: divide entre duas linhas reais completas
    // (Range.getClientRects), deixando ≥ 2 linhas em cada página.
    if (isParagrafoDivisivel(el) && bottom > pageEnd + 0.5) {
      const cutAt = corteEntreLinhas(el, root, pageEnd)
      if (cutAt !== null) {
        pageBreaks.push(cutAt)
        pageStart = cutAt
        pageEnd = pageStart + pageUsablePx
        continue
      }
    }

    // Bloco de texto > restante E > meia página: corta entre linhas reais completas
    if (h > halfPage && room >= lh && bottom > pageEnd + 0.5) {
      const cutAt = corteEntreLinhas(el, root, pageEnd, 1, 1)
      if (cutAt !== null && cutAt > top + 1) {
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
        const cutAt = corteEntreLinhas(el, root, pageEnd, 1, 1) ?? top + Math.floor(room2 / lh) * lh
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

  const validos = validarCortes(root, pageBreaks, pageUsablePx)
  verificarOcupacao(root, validos, pageUsablePx, relatorio)
  return validos
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

/** Pixel escuro o bastante para ser texto/traço (fundos cinza-claro das caixas não contam). */
const LIMIAR_TINTA = 600

/**
 * O html2canvas desenha o texto alguns px abaixo da posição informada pelo DOM, então um
 * corte que no DOM cai entre linhas pode atravessar uma linha no canvas. Cada corte é recuado
 * (no canvas real) para uma faixa sem tinta: se já estiver numa, fica; senão vai para o meio
 * da faixa em branco mais próxima acima (até `maxRecuoCss`).
 */
export function ajustarCortesAoCanvas(
  canvas: HTMLCanvasElement,
  pageBreaksCss: number[],
  scale: number,
  /** Altura útil em px CSS: um corte recuado puxa o seguinte para não exceder a página. */
  pageUsableCss = Number.POSITIVE_INFINITY,
  /** Fim do conteúdo em px CSS: se a última página passar da altura útil, ganha mais um corte. */
  fimConteudoCss = Number.POSITIVE_INFINITY,
  maxRecuoCss = 60,
): number[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings)
  if (!ctx) return pageBreaksCss
  const w = canvas.width
  const linhaEmBranco = (y: number): boolean => {
    const d = ctx.getImageData(0, y, w, 1).data
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] < LIMIAR_TINTA) return false
    }
    return true
  }
  const maxRecuo = Math.round(maxRecuoCss * scale)
  let anterior = 0
  const maxPagina = Math.floor(pageUsableCss * scale)
  const fim = Math.min(canvas.height, Math.ceil(fimConteudoCss * scale))
  const ajustar = (y0: number, idx: number): number => {
    const y = Math.min(y0, canvas.height - 1, anterior + maxPagina)
    if (y <= 0 || linhaEmBranco(y)) return y
    let fimBranco = -1
    for (let yy = y - 1; yy >= Math.max(anterior + 1, y - maxRecuo); yy--) {
      if (linhaEmBranco(yy)) {
        fimBranco = yy
        break
      }
    }
    if (fimBranco < 0) {
      console.error(`[pdf-paginacao] corte da página ${idx + 1} (${y}px no canvas) atravessa tinta e não há faixa em branco acima`)
      return y
    }
    let iniBranco = fimBranco
    while (iniBranco - 1 > anterior && y - (iniBranco - 1) <= maxRecuo && linhaEmBranco(iniBranco - 1)) iniBranco--
    const novo = Math.floor((iniBranco + fimBranco) / 2)
    console.warn(
      `[pdf-paginacao] corte da página ${idx + 1} atravessava tinta no canvas; recuado de ${y} para ${novo}px (canvas)`,
    )
    return novo
  }
  const out: number[] = []
  for (const b of pageBreaksCss) {
    anterior = ajustar(Math.floor(b * scale), out.length)
    out.push(anterior)
  }
  while (fim - anterior > maxPagina + 1 && out.length < pageBreaksCss.length + 20) {
    const y = ajustar(anterior + maxPagina, out.length)
    if (y <= anterior) break
    console.warn(`[pdf-paginacao] página extra no fim: corte em ${y}px (canvas)`)
    anterior = y
    out.push(y)
  }
  return out.map((y) => (y + 0.001) / scale)
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
  // floor: o corte nunca avança para dentro da linha seguinte
  const breaks = pageBreaksCss
    .map((y) => Math.floor(y * scale))
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

  // Fatia nunca passa da altura útil: o que excede após as fusões é só branco (após `fim`).
  for (const s of slices) {
    if (s.h <= maxSliceH) continue
    if (s.y + maxSliceH >= fim) s.h = maxSliceH
    else console.error(`[pdf-paginacao] fatia ${s.y}+${s.h}px excede a altura útil (${maxSliceH}px) com conteúdo`)
  }

  return slices
}

export { A4_HEIGHT_PX }
