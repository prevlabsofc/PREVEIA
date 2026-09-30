/**
 * Gera .docx *editável* da petição SM Rural (montagem estruturada).
 * Usado por /api/gerar-documento-docx (botão Word da UI).
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  LineRuleType,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
  VerticalAlignTable,
  type IBorderOptions,
  type IParagraphOptions,
  type IParagraphStylePropertiesOptions,
} from 'docx'
import {
  type DadosAdvogadoPeticao,
  limparMarkdownResidual,
} from '@/lib/peticao-export'
import {
  type ConteudoSmRural,
  type ItemProvaSm,
  type QuadroRow,
  type TimelineData,
  estruturarProvasSm,
  extrairConteudoSmRural,
  svgTimelineParaRaster,
  textoRodapeSm,
} from '@/lib/peticao-sm-rural'
import {
  ASSINATURA_ESPACO_CM,
  type AssinaturaEscritorio,
} from '@/lib/assinatura-escritorio'

const FONT = 'Times New Roman'
const SIZE = 24 // 12pt
const SIZE_SM = 20
const SIZE_TITLE = 28
const INDENT_1A = 709 // 1,25 cm
const LINE_15 = 360 // 1,5 (lineRule auto)
const PAGE_W = 11906 // A4
const MARGINS = {
  top: 1418,
  header: 567,
  bottom: 1134,
  footer: 567,
  left: 1701,
  right: 1134,
}
const CONTENT_W = PAGE_W - MARGINS.left - MARGINS.right // 9071
const BLUE = '2D5F8A'
const NAVY = '0A2540'
const CAPTION_BG = '1A3A5C'
const GOLD = 'C8A951'
const TWIPS_PER_PX = 15 // 96 dpi
const CM_TO_PX = 96 / 2.54
/** Altura máx. do logo: ≤ 1,6 cm e dentro do espaço header→corpo (1418 − 567 twips). */
const LOGO_MAX_H_PX = Math.floor(1.4 * CM_TO_PX)

const thinBorder: IBorderOptions = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: 'C5D0E0',
}
const dashBorder: IBorderOptions = {
  style: BorderStyle.DASHED,
  size: 12,
  color: NAVY,
}
const noBorder: IBorderOptions = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
}
const noBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
}
const thinBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
}

export type TimelinePngCliente = {
  png: Uint8Array
  widthPx?: number
  heightPx?: number
}

/** PNG da assinatura já dimensionado (ver `lib/assinatura-escritorio.ts`). */
export type AssinaturaDocx = Pick<AssinaturaEscritorio, 'bytes' | 'widthPx' | 'heightPx'>

const ESPACO_ASSINATURA_TW = Math.round((ASSINATURA_ESPACO_CM / 2.54) * 1440) // 1417

function run(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {},
) {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? SIZE,
    bold: opts.bold,
    color: opts.color,
    italics: opts.italics,
  })
}

/* ------------------------------------------------------------------ */
/* Montagem do corpo: parágrafos ficam como opções até o fim, para    */
/* ajustar espaçamento em volta de tabelas sem parágrafos vazios.     */
/* ------------------------------------------------------------------ */

/** Nunca há duas tabelas seguidas: faixas de seção são parágrafos (o Word fundiria tabelas adjacentes). */
type BodyItem =
  | { t: 'p'; o: IParagraphOptions }
  | { t: 'tbl'; el: Table; gapBefore: number; gapAfter: number }

class BodyBuilder {
  items: BodyItem[] = []

  p(o: IParagraphOptions) {
    this.items.push({ t: 'p', o })
  }

  /** Liga o último parágrafo ao bloco seguinte (ex.: texto que introduz a timeline). */
  keepLastWithNext() {
    const last = this.items[this.items.length - 1]
    if (last?.t === 'p') last.o = { ...last.o, keepNext: true }
  }

  table(el: Table, gap: { before?: number; after?: number } = {}) {
    this.items.push({
      t: 'tbl',
      el,
      gapBefore: gap.before ?? 120,
      gapAfter: gap.after ?? 160,
    })
  }

  build(): (Paragraph | Table)[] {
    const items = this.items
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.t !== 'p') continue
      const prev = items[i - 1]
      const next = items[i + 1]
      const sp = { ...(it.o.spacing || {}) }
      if (prev?.t === 'tbl') sp.before = Math.max(sp.before ?? 0, prev.gapAfter)
      if (next?.t === 'tbl') sp.after = Math.max(sp.after ?? 0, next.gapBefore)
      it.o = { ...it.o, spacing: sp }
    }

    return items.map((it) => (it.t === 'p' ? new Paragraph(it.o) : it.el))
  }
}

function optsCorpo(
  text: string,
  opts: { indent?: boolean; spacingAfter?: number; bold?: boolean } = {},
): IParagraphOptions {
  return {
    alignment: AlignmentType.BOTH,
    keepLines: true,
    widowControl: true,
    spacing: {
      after: opts.spacingAfter ?? 160,
      line: LINE_15,
      lineRule: LineRuleType.AUTO,
    },
    indent: opts.indent === false ? undefined : { firstLine: INDENT_1A },
    children: [run(text, { bold: opts.bold })],
  }
}

function parasDeTexto(b: BodyBuilder, raw: string) {
  const text = limparMarkdownResidual(String(raw || '')).trim()
  if (!text) return
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((l) => b.p(optsCorpo(l)))
}

/** Folga interna da faixa (pt): bordas na cor do fundo funcionam como padding. */
const BAR_PAD_X_PT = 6
const BAR_PAD_Y_PT = 3

/**
 * Faixa de seção: parágrafo com fundo azul e bordas da mesma cor (padding),
 * ocupando a largura útil. Parágrafo (não tabela) para nunca ficar colado a
 * outra tabela — o Word funde tabelas adjacentes.
 */
function sectionBar(title: string): IParagraphOptions {
  const bd = (space: number): IBorderOptions => ({
    style: BorderStyle.SINGLE,
    size: 6,
    color: BLUE,
    space,
  })
  const padX = BAR_PAD_X_PT * 20
  return {
    alignment: AlignmentType.LEFT,
    keepNext: true,
    keepLines: true,
    spacing: { before: 280, after: 160 },
    indent: { left: padX, right: padX, firstLine: 0 },
    shading: { type: 'clear', fill: BLUE, color: 'auto' },
    border: {
      top: bd(BAR_PAD_Y_PT),
      bottom: bd(BAR_PAD_Y_PT),
      left: bd(BAR_PAD_X_PT),
      right: bd(BAR_PAD_X_PT),
    },
    children: [
      run(title.trim().toUpperCase(), {
        bold: true,
        size: SIZE,
        color: 'FFFFFF',
      }),
    ],
  }
}

/** Subtítulo preliminar: negrito, esquerda, sem recuo (todos os "DA …:"). */
function subheadPreliminar(title: string): IParagraphOptions {
  return {
    alignment: AlignmentType.LEFT,
    keepNext: true,
    keepLines: true,
    spacing: { before: 200, after: 80 },
    indent: { firstLine: 0, left: 0 },
    children: [run(title.toUpperCase(), { bold: true, size: 23 })],
  }
}

function linhaCaption(text: string, span: number): TableRow {
  return new TableRow({
    cantSplit: true,
    tableHeader: true,
    children: [
      new TableCell({
        columnSpan: span,
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: noBorders,
        shading: { type: 'clear', fill: CAPTION_BG, color: 'auto' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            spacing: { before: 60, after: 60 },
            children: [
              run(text.toUpperCase(), {
                bold: true,
                size: 21,
                color: 'FFFFFF',
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

/** Tabela 2 colunas com a legenda (caption) como linha de cabeçalho repetível. */
function tabelaDuasColunas(
  caption: string,
  rows: QuadroRow[],
  opts: { highlightTotal?: boolean } = {},
): Table {
  const width = CONTENT_W
  const colA = Math.round(width * 0.42)
  const colB = width - colA
  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [colA, colB],
    layout: TableLayoutType.FIXED,
    rows: [
      linhaCaption(caption, 2),
      ...rows.map((r, i) => {
        const isTotal = opts.highlightTotal && /^total$/i.test(r.campo)
        const fill = isTotal ? GOLD : i % 2 === 0 ? 'F5F5F5' : 'FFFFFF'
        return new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: colA, type: WidthType.DXA },
              borders: thinBorders,
              shading: { type: 'clear', fill, color: 'auto' },
              children: [
                new Paragraph({
                  children: [run(r.campo, { bold: true, size: 22 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: colB, type: WidthType.DXA },
              borders: thinBorders,
              shading: { type: 'clear', fill, color: 'auto' },
              children: [
                new Paragraph({
                  alignment: opts.highlightTotal
                    ? AlignmentType.RIGHT
                    : AlignmentType.LEFT,
                  children: [run(r.valor, { bold: isTotal, size: 22 })],
                }),
              ],
            }),
          ],
        })
      }),
    ],
  })
}

/* ------------------------------ Timeline ------------------------------ */

/** Largura útil inteira (9071 twips ≈ 16 cm) em px @96dpi. */
const TIMELINE_DISPLAY_W_PX = CONTENT_W / TWIPS_PER_PX

function tituloTimeline(data: TimelineData): string {
  const local = data.local ? ` • ${data.local}` : ''
  return `LINHA DO TEMPO — ${data.nome.toUpperCase()} | ${data.atividade}${local}`
}

/**
 * Tabela fallback: título (1ª linha, como no topo da caixa da timeline do PDF)
 * + Data | Evento | Detalhe (uma linha por marco).
 */
function tabelaTimelineFallback(data: TimelineData): Table {
  const width = CONTENT_W
  const colA = Math.round(width * 0.22)
  const colB = Math.round(width * 0.28)
  const colC = width - colA - colB
  const headerCell = (txt: string, w: number) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: thinBorders,
      shading: { type: 'clear', fill: CAPTION_BG, color: 'auto' },
      children: [
        new Paragraph({
          keepNext: true,
          children: [run(txt, { bold: true, size: 18, color: 'FFFFFF' })],
        }),
      ],
    })
  const bodyCell = (txt: string, w: number, fill: string, bold = false) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders: thinBorders,
      shading: { type: 'clear', fill, color: 'auto' },
      children: [
        new Paragraph({
          children: [run(limparMarkdownResidual(txt), { bold, size: 18 })],
        }),
      ],
    })

  const eventos = data.eventos.length
    ? data.eventos
    : [{ data: '—', titulo: 'Sem eventos', detalhe: '' }]

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [colA, colB, colC],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        tableHeader: true,
        children: [
          new TableCell({
            columnSpan: 3,
            width: { size: width, type: WidthType.DXA },
            borders: thinBorders,
            shading: { type: 'clear', fill: 'EEF1F5', color: 'auto' },
            margins: { left: 120, right: 120, top: 60, bottom: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                keepNext: true,
                children: [run(tituloTimeline(data), { bold: true, size: 20, color: NAVY })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        cantSplit: true,
        tableHeader: true,
        children: [
          headerCell('Data', colA),
          headerCell('Evento', colB),
          headerCell('Detalhe', colC),
        ],
      }),
      ...eventos.map((ev, i) => {
        const fill = i % 2 === 0 ? 'F5F5F5' : 'FFFFFF'
        return new TableRow({
          cantSplit: true,
          children: [
            bodyCell(ev.data || '—', colA, fill),
            bodyCell(ev.titulo || '', colB, fill, true),
            bodyCell(ev.detalhe || '', colC, fill),
          ],
        })
      }),
    ],
  })
}

function garantirSvgAbsoluto(svg: string, w: number, h: number): string {
  let out = svg
  if (!/<svg\b[^>]*\sxmlns=/.test(out)) {
    out = out.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  out = out.replace(/<svg\b[^>]*>/, (tag) => {
    let t = tag
    t = /\swidth=["'][^"']*["']/.test(t)
      ? t.replace(/\swidth=["'][^"']*["']/, ` width="${w}"`)
      : t.replace(/<svg\b/, `<svg width="${w}"`)
    t = /\sheight=["'][^"']*["']/.test(t)
      ? t.replace(/\sheight=["'][^"']*["']/, ` height="${h}"`)
      : t.replace(/<svg\b/, `<svg height="${h}"`)
    return t
  })
  return out
}

/** Rasterização no servidor (plano B quando o cliente não envia o PNG). */
async function rasterizarTimelinePngServidor(
  data: TimelineData,
): Promise<{ png: Uint8Array; rasterW: number; rasterH: number } | null> {
  const prepared = svgTimelineParaRaster(data, 1400)
  if (!prepared) {
    console.error('[peticao-sm-rural-docx] svgTimelineParaRaster retornou null (sem eventos/SVG).')
    return null
  }
  const svg = garantirSvgAbsoluto(prepared.svg, prepared.width, prepared.height)

  try {
    const { Resvg } = await import('@resvg/resvg-js')
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: prepared.width },
      font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
      background: 'white',
    })
    const img = resvg.render()
    return { png: new Uint8Array(img.asPng()), rasterW: img.width, rasterH: img.height }
  } catch (err) {
    console.error('[peticao-sm-rural-docx] resvg falhou ao rasterizar timeline:', err)
  }

  try {
    const sharpMod = await import('sharp')
    const sharp = sharpMod.default || sharpMod
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    return { png: new Uint8Array(png), rasterW: prepared.width, rasterH: prepared.height }
  } catch (err) {
    console.error('[peticao-sm-rural-docx] sharp falhou ao rasterizar timeline:', err)
  }
  return null
}

function dimensoesImagem(bytes: Uint8Array): { w: number; h: number } | null {
  if (
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { w: dv.getUint32(16), h: dv.getUint32(20) }
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++
        continue
      }
      const marker = bytes[i + 1]
      const len = (bytes[i + 2] << 8) | bytes[i + 3]
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {
          h: (bytes[i + 5] << 8) | bytes[i + 6],
          w: (bytes[i + 7] << 8) | bytes[i + 8],
        }
      }
      i += 2 + len
    }
  }
  return null
}

async function blocosTimeline(
  b: BodyBuilder,
  data: TimelineData | null,
  pngCliente?: TimelinePngCliente | null,
) {
  if (!data || data.estilo === 'none' || !data.eventos?.length) return

  b.keepLastWithNext()

  // Estilo vertical: tabela editável (sem imagem)
  if (data.estilo === 'vertical') {
    b.table(tabelaTimelineFallback(data))
    return
  }

  let raster: { png: Uint8Array; rasterW: number; rasterH: number } | null = null
  if (pngCliente?.png?.length) {
    const dim = dimensoesImagem(pngCliente.png)
    const rasterW = dim?.w || pngCliente.widthPx || 0
    const rasterH = dim?.h || pngCliente.heightPx || 0
    if (rasterW > 0 && rasterH > 0) {
      raster = { png: pngCliente.png, rasterW, rasterH }
    } else {
      console.error('[peticao-sm-rural-docx] PNG da timeline enviado pelo cliente sem dimensões válidas.')
    }
  } else {
    console.warn('[peticao-sm-rural-docx] timelinePngBase64 ausente; tentando rasterizar no servidor.')
  }
  if (!raster) raster = await rasterizarTimelinePngServidor(data)

  if (!raster) {
    console.error(
      '[peticao-sm-rural-docx] timeline sem imagem (cliente não enviou PNG e rasterização no servidor falhou) — usando tabela.',
    )
    b.table(tabelaTimelineFallback(data))
    return
  }

  const imgW = TIMELINE_DISPLAY_W_PX
  const imgH = Math.max(40, (raster.rasterH / raster.rasterW) * imgW)

  b.p({
    alignment: AlignmentType.CENTER,
    keepLines: true,
    spacing: { before: 120, after: 160 },
    children: [
      new ImageRun({
        type: 'png',
        data: raster.png,
        transformation: { width: imgW, height: imgH },
        altText: {
          title: 'Linha do tempo',
          description: tituloTimeline(data),
          name: 'timeline-sm-rural',
        },
      }),
    ],
  })
}

/* ------------------------------ Provas / Meta ------------------------------ */

/** Lista de provas: tabela 2 colunas (✓ | texto), fundo alternado. */
function tabelaProvas(items: ItemProvaSm[]): Table | null {
  if (!items.length) return null
  const width = CONTENT_W
  const colCheck = Math.round(width * 0.06)
  const colTxt = width - colCheck
  const softBorder: IBorderOptions = {
    style: BorderStyle.SINGLE,
    size: 2,
    color: 'E5E7EB',
  }
  const softBorders = {
    top: softBorder,
    bottom: softBorder,
    left: softBorder,
    right: softBorder,
  }

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [colCheck, colTxt],
    layout: TableLayoutType.FIXED,
    rows: items.map((item, i) => {
      const fill = i % 2 === 0 ? 'F5F5F5' : 'FFFFFF'
      return new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: colCheck, type: WidthType.DXA },
            borders: softBorders,
            shading: { type: 'clear', fill, color: 'auto' },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: [run('✓', { bold: true, size: 22, color: '15803D' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colTxt, type: WidthType.DXA },
            borders: softBorders,
            shading: { type: 'clear', fill, color: 'auto' },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  run(item.nome, { bold: true, size: 22 }),
                  ...(item.explicacao ? [run(` — ${item.explicacao}`, { size: 22 })] : []),
                ],
              }),
            ],
          }),
        ],
      })
    }),
  })
}

function metaBox(c: ConteudoSmRural): Table {
  const width = CONTENT_W
  const chk = (on: boolean) => (on ? '(X)' : '( )')
  const p = c.meta.prioridades
  const innerW = Math.round(width * 0.54)
  const lines = [
    c.meta.tipoAcao || 'SALÁRIO MATERNIDADE - SEGURADO ESPECIAL',
    c.meta.juizoDigital !== false ? 'JUÍZO 100% DIGITAL' : '',
    'Prioridade Legal na tramitação processual:',
    `${chk(p.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;`,
    `${chk(p.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;`,
    `${chk(p.menor)} Menor nos termos do ECA – Lei 8.069/1990;`,
  ].filter(Boolean)

  // Box alinhado à direita (sem célula espaçadora vazia à esquerda).
  return new Table({
    width: { size: innerW, type: WidthType.DXA },
    columnWidths: [innerW],
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.RIGHT,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: innerW, type: WidthType.DXA },
            borders: {
              top: dashBorder,
              bottom: dashBorder,
              left: dashBorder,
              right: dashBorder,
            },
            margins: { left: 80, right: 80 },
            children: lines.map(
              (line, i) =>
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    run(line, {
                      bold: i <= 2,
                      size: 19,
                      color: i <= 1 ? NAVY : undefined,
                    }),
                  ],
                }),
            ),
          }),
        ],
      }),
    ],
  })
}

async function fetchImageBytes(
  url: string,
): Promise<{ data: Uint8Array; type: 'png' | 'jpg' } | null> {
  try {
    const src = String(url || '').trim()
    if (!src) return null
    if (src.startsWith('data:image/')) {
      const m = src.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i)
      if (!m) return null
      const type: 'png' | 'jpg' = /png/i.test(m[1]) ? 'png' : 'jpg'
      const bin = Buffer.from(m[2], 'base64')
      return { data: new Uint8Array(bin), type }
    }
    const res = await fetch(src)
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    const type: 'png' | 'jpg' = ct.includes('png') ? 'png' : 'jpg'
    return { data: buf, type }
  } catch {
    return null
  }
}

async function buildBody(
  c: ConteudoSmRural,
  pngCliente?: TimelinePngCliente | null,
  assinaturaImg?: AssinaturaDocx | null,
): Promise<(Paragraph | Table)[]> {
  const b = new BodyBuilder()

  b.p({
    alignment: AlignmentType.BOTH,
    keepNext: true,
    spacing: { before: 200, after: 200, line: 276 },
    children: [run(c.enderecoTexto.toUpperCase(), { bold: true })],
  })

  b.table(metaBox(c), { before: 200, after: 200 })

  parasDeTexto(b, c.qualificacao)

  b.p({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    keepLines: true,
    spacing: { before: 200, after: 60 },
    children: [run(c.titulo.toUpperCase(), { bold: true, size: SIZE_TITLE, color: NAVY })],
  })
  b.p({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    keepLines: true,
    spacing: { after: 160 },
    children: [run(c.subtitulo, { bold: true })],
  })

  parasDeTexto(b, c.emFace)

  b.p(sectionBar('I – PRELIMINARMENTE'))
  for (const pre of c.preliminares) {
    if (pre.titulo) b.p(subheadPreliminar(pre.titulo))
    parasDeTexto(b, pre.corpo)
  }

  b.p(sectionBar('II – QUADRO SINÓPTICO'))
  b.table(tabelaDuasColunas('RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO', c.quadro))

  b.p(sectionBar('III – SÍNTESE DO CONTEXTO FÁTICO'))
  parasDeTexto(b, c.sinteseAntes)
  await blocosTimeline(b, c.timeline, pngCliente)
  parasDeTexto(b, c.sinteseDepois)

  b.p(sectionBar('IV – DAS PROVAS JUNTADAS AOS AUTOS'))
  const provasTable = tabelaProvas(estruturarProvasSm(c.provas))
  if (provasTable) b.table(provasTable)
  parasDeTexto(b, c.provasFecho)

  b.p(sectionBar('V – FUNDAMENTAÇÃO JURÍDICA'))
  parasDeTexto(b, c.fundamentacao)

  b.p(sectionBar('VI – PEDIDO / REQUERIMENTOS'))
  b.p(optsCorpo('Diante do exposto, requer:', { indent: false }))
  for (const ped of c.pedidos) {
    b.p({
      alignment: AlignmentType.BOTH,
      keepLines: true,
      widowControl: true,
      spacing: { after: 120, line: LINE_15, lineRule: LineRuleType.AUTO },
      children: [run(limparMarkdownResidual(ped))],
    })
  }

  parasDeTexto(b, c.fechamentoExtra)

  // Bloco de assinatura: encadeado com keepNext até a última linha.
  // Entre local/data e o primeiro traço há sempre ESPACO_ASSINATURA_TW de altura:
  // com imagem, é a linha de altura exata que a contém; sem imagem, é o spacing before do traço.
  b.p({
    alignment: AlignmentType.CENTER,
    keepNext: c.assinaturas.length > 0,
    keepLines: true,
    spacing: { before: 200, after: c.assinaturas.length > 0 ? 0 : 280 },
    children: [run(`${c.localData}.`)],
  })
  c.assinaturas.forEach((a, idx) => {
    const ultima = idx === c.assinaturas.length - 1
    const comImagem = idx === 0 && !!assinaturaImg
    if (comImagem && assinaturaImg) {
      b.p({
        alignment: AlignmentType.CENTER,
        keepNext: true,
        keepLines: true,
        spacing: {
          before: 0,
          after: 0,
          line: ESPACO_ASSINATURA_TW,
          lineRule: LineRuleType.EXACT,
        },
        children: [
          new ImageRun({
            data: assinaturaImg.bytes,
            type: 'png',
            transformation: {
              width: assinaturaImg.widthPx,
              height: assinaturaImg.heightPx,
            },
          }),
        ],
      })
    }
    b.p({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      keepLines: true,
      spacing: { before: idx > 0 ? 200 : comImagem ? 0 : ESPACO_ASSINATURA_TW },
      children: [run('_______________________________')],
    })
    b.p({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      keepLines: true,
      children: [run(a.nome, { bold: true })],
    })
    b.p({
      alignment: AlignmentType.CENTER,
      keepNext: !ultima,
      keepLines: true,
      spacing: { after: 160 },
      children: [run(a.oab, { size: SIZE_SM })],
    })
  })

  b.p({
    alignment: AlignmentType.CENTER,
    keepNext: true,
    keepLines: true,
    spacing: { before: 200, after: 80 },
    children: [run('ANEXO – PLANILHA DE CÁLCULO', { bold: true, size: 22 })],
  })
  b.table(tabelaDuasColunas('PLANILHA DE CÁLCULO', c.planilha.rows, { highlightTotal: true }), {
    before: 80,
  })
  if (c.planilha.nota) {
    b.p({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [run(c.planilha.nota, { italics: true, size: 19, color: '555555' })],
    })
  }

  const dataTxt = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  b.p({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160 },
    children: [
      run(`Documento gerado em ${dataTxt} pela plataforma Marple`, {
        size: 16,
        color: '888888',
      }),
    ],
  })

  return b.build()
}

/* ------------------------------ Cabeçalho / Rodapé ------------------------------ */

async function cabecalhoPrimeiraPagina(adv: DadosAdvogadoPeticao): Promise<Header> {
  const colLogo = Math.round(CONTENT_W * 0.4)
  const colTxt = CONTENT_W - colLogo
  const linhaBase: IBorderOptions = { style: BorderStyle.SINGLE, size: 12, color: NAVY }

  const logoChildren: (ImageRun | TextRun)[] = []
  const logoSrc = adv.banner_url || adv.logo_url
  if (logoSrc) {
    const img = await fetchImageBytes(String(logoSrc))
    if (img) {
      const dim = dimensoesImagem(img.data)
      const ratio = dim && dim.h > 0 ? dim.w / dim.h : adv.banner_url ? 10 : 70 / 42
      const maxW = Math.floor(colLogo / TWIPS_PER_PX) - 4
      let h = LOGO_MAX_H_PX
      let w = Math.round(h * ratio)
      if (w > maxW) {
        w = maxW
        h = Math.max(1, Math.round(w / ratio))
      }
      logoChildren.push(
        new ImageRun({ data: img.data, transformation: { width: w, height: h }, type: img.type }),
      )
    }
  }

  const nomeEscritorio = String(adv.office_name || adv.name || 'Advocacia')
  const oabUf = String(adv.oab_uf || adv.estado || '').toUpperCase()
  const oabNum = String(adv.oab_number || '')

  const txtParas: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [run(nomeEscritorio.toUpperCase(), { bold: true, size: 22, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 0, after: 0 },
      children: [run(`OAB/${oabUf} nº ${oabNum}`, { size: 18 })],
    }),
  ]
  if (adv.email) {
    txtParas.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [run(String(adv.email), { size: 16, color: '1D4ED8' })],
      }),
    )
  }

  const cellBorders = { ...noBorders, bottom: linhaBase }
  const table = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [colLogo, colTxt],
    layout: TableLayoutType.FIXED,
    borders: {
      ...noBorders,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: colLogo, type: WidthType.DXA },
            borders: cellBorders,
            verticalAlign: VerticalAlignTable.CENTER,
            margins: { left: 0, right: 0, top: 0, bottom: 40 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0 },
                children: logoChildren,
              }),
            ],
          }),
          new TableCell({
            width: { size: colTxt, type: WidthType.DXA },
            borders: cellBorders,
            verticalAlign: VerticalAlignTable.CENTER,
            margins: { left: 0, right: 0, top: 0, bottom: 40 },
            children: txtParas,
          }),
        ],
      }),
    ],
  })

  return new Header({
    children: [
      table,
      new Paragraph({
        spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
        children: [new TextRun({ text: '', size: 2 })],
      }),
    ],
  })
}

function cabecalhoVazio(): Header {
  return new Header({
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT },
        children: [],
      }),
    ],
  })
}

function rodape(adv: DadosAdvogadoPeticao): Footer {
  return new Footer({
    children: [
      new Paragraph({
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 8 },
        },
        alignment: AlignmentType.LEFT,
        children: [
          run(`${textoRodapeSm(adv)}  ·  `, { size: 16, color: '555555' }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
            size: 16,
            color: '555555',
          }),
        ],
      }),
    ],
  })
}

export async function montarDocxSmRural(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  sexoParteAutora?: string | null
  timelinePng?: TimelinePngCliente | null
  assinatura?: AssinaturaDocx | null
}): Promise<Buffer | null> {
  const conteudo = extrairConteudoSmRural(opts)
  if (!conteudo) return null

  const children = await buildBody(conteudo, opts.timelinePng, opts.assinatura)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE },
          paragraph: { widowControl: true } as IParagraphStylePropertiesOptions,
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          quickFormat: true,
          run: { font: FONT, size: SIZE },
          paragraph: { widowControl: true } as IParagraphStylePropertiesOptions,
        },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            margin: {
              top: MARGINS.top,
              right: MARGINS.right,
              bottom: MARGINS.bottom,
              left: MARGINS.left,
              header: MARGINS.header,
              footer: MARGINS.footer,
            },
          },
        },
        headers: {
          first: await cabecalhoPrimeiraPagina(opts.adv),
          default: cabecalhoVazio(),
        },
        footers: {
          first: rodape(opts.adv),
          default: rodape(opts.adv),
        },
        children,
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
