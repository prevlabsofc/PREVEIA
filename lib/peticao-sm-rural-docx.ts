/**
 * Gera .docx editável da petição SM Rural a partir da mesma fonte
 * de conteúdo do HTML/PDF (extrairConteudoSmRural) — sem converter PDF.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IBorderOptions,
} from 'docx'
import {
  type DadosAdvogadoPeticao,
  limparMarkdownResidual,
  margensDocxTwips,
} from '@/lib/peticao-export'
import {
  type ConteudoSmRural,
  type QuadroRow,
  extrairConteudoSmRural,
  textoRodapeSm,
} from '@/lib/peticao-sm-rural'

const FONT = 'Times New Roman'
const SIZE = 24 // 12pt
const SIZE_SM = 20
const SIZE_TITLE = 28
const INDENT_1A = Math.round(1.25 * 567) // 1,25 cm
const PAGE_W = 11906 // A4 twips approx
const BLUE = '2D5F8A'
const NAVY = '0A2540'
const CAPTION_BG = '1A3A5C'
const GOLD = 'C8A951'

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

function paraJustificado(
  text: string,
  opts: { indent?: boolean; spacingAfter?: number; bold?: boolean } = {},
): Paragraph {
  const clean = limparMarkdownResidual(String(text || '')).trim()
  if (!clean) {
    return new Paragraph({ children: [] })
  }
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: opts.spacingAfter ?? 160, line: 276 },
    indent: opts.indent === false ? undefined : { firstLine: INDENT_1A },
    children: [run(clean, { bold: opts.bold })],
  })
}

function parasDeTexto(raw: string): Paragraph[] {
  const text = limparMarkdownResidual(String(raw || '')).trim()
  if (!text) return []
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => paraJustificado(l))
}

function sectionBar(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 280, after: 160 },
    shading: { type: 'clear', fill: BLUE },
    children: [
      run(`  ${title.toUpperCase()}  `, {
        bold: true,
        size: SIZE,
        color: 'FFFFFF',
      }),
    ],
  })
}

/** Subtítulo preliminar: negrito, esquerda, sem recuo (todos os "DA …:"). */
function subheadPreliminar(title: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 80 },
    indent: { firstLine: 0, left: 0 },
    children: [
      run(title.toUpperCase(), { bold: true, size: 23 }),
    ],
  })
}

function usableWidthTwips(margins: ReturnType<typeof margensDocxTwips>) {
  return PAGE_W - margins.left - margins.right
}

function tabelaDuasColunas(
  rows: QuadroRow[],
  width: number,
  opts: { highlightTotal?: boolean } = {},
): Table {
  const colA = Math.round(width * 0.42)
  const colB = width - colA
  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [colA, colB],
    rows: rows.map((r, i) => {
      const isTotal = opts.highlightTotal && /^total$/i.test(r.campo)
      const fill = isTotal ? GOLD : i % 2 === 0 ? 'F5F5F5' : 'FFFFFF'
      return new TableRow({
        children: [
          new TableCell({
            width: { size: colA, type: WidthType.DXA },
            borders: {
              top: thinBorder,
              bottom: thinBorder,
              left: thinBorder,
              right: thinBorder,
            },
            shading: { type: 'clear', fill },
            children: [
              new Paragraph({
                children: [run(r.campo, { bold: true, size: 22 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: colB, type: WidthType.DXA },
            borders: {
              top: thinBorder,
              bottom: thinBorder,
              left: thinBorder,
              right: thinBorder,
            },
            shading: { type: 'clear', fill },
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
  })
}

function captionBar(text: string, width: number): Table {
  return new Table({
    width: { size: width, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: width, type: WidthType.DXA },
            borders: {
              top: noBorder,
              bottom: noBorder,
              left: noBorder,
              right: noBorder,
            },
            shading: { type: 'clear', fill: CAPTION_BG },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
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
      }),
    ],
  })
}

function metaBox(c: ConteudoSmRural, width: number): Table {
  const chk = (on: boolean) => (on ? '(X)' : '( )')
  const p = c.meta.prioridades
  const innerW = Math.round(width * 0.54)
  const spacerW = width - innerW
  const lines = [
    c.meta.tipoAcao || 'SALÁRIO MATERNIDADE - SEGURADO ESPECIAL',
    c.meta.juizoDigital !== false ? 'JUÍZO 100% DIGITAL' : '',
    'Prioridade Legal na tramitação processual:',
    `${chk(p.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;`,
    `${chk(p.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;`,
    `${chk(p.menor)} Menor nos termos do ECA – Lei 8.069/1990;`,
  ].filter(Boolean)

  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: [spacerW, innerW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: spacerW, type: WidthType.DXA },
            borders: {
              top: noBorder,
              bottom: noBorder,
              left: noBorder,
              right: noBorder,
            },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: innerW, type: WidthType.DXA },
            borders: {
              top: dashBorder,
              bottom: dashBorder,
              left: dashBorder,
              right: dashBorder,
            },
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

function buildBody(
  c: ConteudoSmRural,
  width: number,
): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = []

  out.push(
    new Paragraph({
      alignment: AlignmentType.BOTH,
      spacing: { before: 200, after: 200, line: 276 },
      children: [run(c.enderecoTexto.toUpperCase(), { bold: true })],
    }),
  )

  out.push(metaBox(c, width))
  out.push(new Paragraph({ spacing: { after: 120 }, children: [] }))

  out.push(...parasDeTexto(c.qualificacao))

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [run(c.titulo.toUpperCase(), { bold: true, size: SIZE_TITLE, color: NAVY })],
    }),
  )
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [run(c.subtitulo, { bold: true })],
    }),
  )

  out.push(...parasDeTexto(c.emFace))

  out.push(sectionBar('I – PRELIMINARMENTE'))
  for (const b of c.preliminares) {
    if (b.titulo) out.push(subheadPreliminar(b.titulo))
    out.push(...parasDeTexto(b.corpo))
  }

  out.push(sectionBar('II – QUADRO SINÓPTICO'))
  out.push(captionBar('RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO', width))
  if (c.quadro.length) out.push(tabelaDuasColunas(c.quadro, width))

  out.push(sectionBar('III – SÍNTESE DO CONTEXTO FÁTICO'))
  out.push(...parasDeTexto(c.sinteseAntes))
  // Timeline SVG→PNG omitida de propósito (não quebra o documento)
  out.push(...parasDeTexto(c.sinteseDepois))

  out.push(sectionBar('IV – DAS PROVAS JUNTADAS AOS AUTOS'))
  for (const p of c.provas) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.BOTH,
        spacing: { after: 80, line: 276 },
        indent: { left: 180 },
        children: [run(`✓  ${limparMarkdownResidual(p)}`)],
      }),
    )
  }
  out.push(...parasDeTexto(c.provasFecho))

  out.push(sectionBar('V – FUNDAMENTAÇÃO JURÍDICA'))
  out.push(...parasDeTexto(c.fundamentacao))

  out.push(sectionBar('VI – PEDIDO / REQUERIMENTOS'))
  out.push(
    paraJustificado('Diante do exposto, requer:', { indent: false }),
  )
  for (const ped of c.pedidos) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.BOTH,
        spacing: { after: 120, line: 276 },
        children: [run(limparMarkdownResidual(ped))],
      }),
    )
  }

  out.push(...parasDeTexto(c.fechamentoExtra))
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 280 },
      children: [run(`${c.localData}.`)],
    }),
  )

  for (const a of c.assinaturas) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        children: [run('_______________________________')],
      }),
    )
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(a.nome, { bold: true })],
      }),
    )
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [run(a.oab, { size: SIZE_SM })],
      }),
    )
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [run('ANEXO – PLANILHA DE CÁLCULO', { bold: true, size: 22 })],
    }),
  )
  out.push(captionBar('PLANILHA DE CÁLCULO', width))
  if (c.planilha.rows.length) {
    out.push(
      tabelaDuasColunas(c.planilha.rows, width, { highlightTotal: true }),
    )
  }
  if (c.planilha.nota) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [run(c.planilha.nota, { italics: true, size: 19, color: '555555' })],
      }),
    )
  }

  const dataTxt = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160 },
      children: [
        run(`Documento gerado em ${dataTxt} pela plataforma Marple`, {
          size: 16,
          color: '888888',
        }),
      ],
    }),
  )

  return out
}

export async function montarDocxSmRural(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  sexoParteAutora?: string | null
}): Promise<Buffer | null> {
  const conteudo = extrairConteudoSmRural(opts)
  if (!conteudo) return null

  const margins = margensDocxTwips()
  const width = usableWidthTwips(margins)
  const children = buildBody(conteudo, width)

  const headerChildren: Paragraph[] = []
  const logoSrc = opts.adv.banner_url || opts.adv.logo_url
  if (logoSrc) {
    const img = await fetchImageBytes(String(logoSrc))
    if (img) {
      headerChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: img.data,
              transformation: {
                width: opts.adv.banner_url ? 420 : 70,
                height: 42,
              },
              type: img.type,
            }),
          ],
        }),
      )
    }
  }

  const nomeEscritorio = String(
    opts.adv.office_name || opts.adv.name || 'Advocacia',
  )
  const oabUf = String(opts.adv.oab_uf || opts.adv.estado || '').toUpperCase()
  const oabNum = String(opts.adv.oab_number || '')

  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        run(nomeEscritorio.toUpperCase(), {
          bold: true,
          size: 22,
          color: NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [run(`OAB/${oabUf} nº ${oabNum}`, { size: 18 })],
    }),
  )
  if (opts.adv.email) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          run(String(opts.adv.email), { size: 16, color: '1D4ED8' }),
        ],
      }),
    )
  }
  headerChildren.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: NAVY, space: 1 },
      },
      spacing: { after: 120 },
      children: [],
    }),
  )

  const rodape = textoRodapeSm(opts.adv)
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
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: '999999',
                    space: 8,
                  },
                },
                alignment: AlignmentType.LEFT,
                children: [
                  run(`${rodape}  ·  `, { size: 16, color: '555555' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT,
                    size: 16,
                    color: '555555',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
