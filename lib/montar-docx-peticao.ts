/**
 * Ponto único de montagem DOCX de petição.
 * SM Rural → template estruturado; demais → parágrafos editáveis genéricos.
 */

import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
  UnderlineType,
} from 'docx'
import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  limparMarkdownResidual,
  marcarBlocoFinal,
  margensDocxTwips,
  prepararTextoPeticao,
} from '@/lib/peticao-export'
import {
  AGENT_SM_RURAL,
  isSmRuralStructured,
  textoRodapeSm,
} from '@/lib/peticao-sm-rural'
import { montarDocxSmRural } from '@/lib/peticao-sm-rural-docx'

const FONT = 'Times New Roman'

async function montarDocxGenerico(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  estilo: EstiloPeticao
}): Promise<Buffer> {
  const prepared = prepararTextoPeticao(opts.text, opts.adv)
  const marked = marcarBlocoFinal(prepared)
  const [antes, resto] = marked.split('<<<CLOSING>>>')
  const [closingRaw = '', depois = ''] = (resto || '').split('<<<END_CLOSING>>>')

  const nomeEscritorio = String(opts.adv.office_name || opts.adv.name || 'Advogado')
  const oabUf = String(opts.adv.oab_uf || opts.adv.estado || '').toUpperCase()
  const oabNum = String(opts.adv.oab_number || '')

  const headerChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: nomeEscritorio.toUpperCase(),
          bold: true,
          font: FONT,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `OAB/${oabUf} nº ${oabNum}`,
          font: FONT,
          size: 18,
        }),
      ],
    }),
  ]

  const toParas = (
    block: string,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH,
  ) =>
    block.split('\n').map((line) => {
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
      const bold = isSection || isSub || /\*\*.+\*\*/.test(line)
      return new Paragraph({
        alignment: align,
        spacing: { after: isSection ? 200 : 120, line: 276 },
        indent: isSub
          ? { left: 0, firstLine: 0 }
          : isSection
            ? { firstLine: 0 }
            : { firstLine: Math.round(1.25 * 567) },
        children: [
          new TextRun({
            text: clean,
            font: FONT,
            size: isSection ? 24 : 22,
            bold: Boolean(bold),
            underline:
              opts.estilo === 'classico' && isSection
                ? { type: UnderlineType.SINGLE }
                : undefined,
          }),
        ],
      })
    })

  const margins = margensDocxTwips()
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
                children: [
                  new TextRun({
                    text: `${rodape}  ·  `,
                    font: FONT,
                    size: 16,
                    color: '555555',
                  }),
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
        children: [
          ...toParas(antes || ''),
          ...toParas(closingRaw, AlignmentType.RIGHT),
          ...toParas(depois),
        ],
      },
    ],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}

export async function montarDocxPeticao(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  estilo?: EstiloPeticao
  agentType?: string | null
  sexoParteAutora?: string | null
}): Promise<Buffer> {
  const useSm =
    opts.agentType === AGENT_SM_RURAL || isSmRuralStructured(opts.text)

  if (useSm) {
    const dedicated = await montarDocxSmRural({
      text: opts.text,
      adv: opts.adv,
      sexoParteAutora: opts.sexoParteAutora,
    })
    if (dedicated) return dedicated
  }

  return montarDocxGenerico({
    text: opts.text,
    adv: opts.adv,
    estilo: opts.estilo || 'moderno',
  })
}
