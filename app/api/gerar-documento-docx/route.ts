import { carregarAssinaturaEscritorio } from '@/lib/assinatura-escritorio'
import { montarDocxPeticao } from '@/lib/montar-docx-peticao'
import { sessaoDaRequisicao } from '@/lib/permissions/sessao'
import {
  type DadosAdvogadoPeticao,
  normalizarEstiloPeticao,
} from '@/lib/peticao-export'
import {
  ERRO_GERACAO_INTERROMPIDA,
  isSmRuralStructured,
  validarCompletudeSmRural,
} from '@/lib/peticao-sm-rural'

export const runtime = 'nodejs'

const MAX_TIMELINE_PNG_BYTES = 8 * 1024 * 1024

/** PNG da timeline rasterizado no cliente (opcional). */
function lerTimelinePng(body: Record<string, unknown>) {
  const raw =
    typeof body.timelinePngBase64 === 'string' ? body.timelinePngBase64.trim() : ''
  if (!raw) return null
  const b64 = raw.replace(/^data:image\/png;base64,/i, '')
  const png = new Uint8Array(Buffer.from(b64, 'base64'))
  const isPng =
    png.length > 24 &&
    png[0] === 0x89 &&
    png[1] === 0x50 &&
    png[2] === 0x4e &&
    png[3] === 0x47
  if (!isPng || png.length > MAX_TIMELINE_PNG_BYTES) {
    console.error(
      '[gerar-documento-docx] timelinePngBase64 inválido ou grande demais; ignorado.',
      { bytes: png.length, isPng },
    )
    return null
  }
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined
  return {
    png,
    widthPx: num(body.timelineWidthPx),
    heightPx: num(body.timelineHeightPx),
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return Response.json(
        { error: 'Body JSON inválido. Envie text e dados do advogado.' },
        { status: 400 },
      )
    }

    const text = typeof body.text === 'string' ? body.text : ''
    if (!text.trim()) {
      return Response.json(
        { error: 'Texto da petição ausente.' },
        { status: 400 },
      )
    }

    const adv = (body.advogado || body.adv || {}) as DadosAdvogadoPeticao
    const estilo = normalizarEstiloPeticao(body.estilo)
    const agentType =
      typeof body.agentType === 'string' ? body.agentType : null
    const sexoParteAutora =
      typeof body.sexoParteAutora === 'string' ? body.sexoParteAutora : null
    const fileName =
      typeof body.fileName === 'string' && body.fileName.trim()
        ? body.fileName.trim().replace(/\.docx$/i, '')
        : 'peticao'

    if (agentType === 'salario-maternidade-rural' || isSmRuralStructured(text)) {
      const check = validarCompletudeSmRural(text)
      if (!check.ok) {
        return Response.json(
          { error: check.motivo || ERRO_GERACAO_INTERROMPIDA },
          { status: 422 },
        )
      }
    }

    const sessao = await sessaoDaRequisicao(request).catch(() => null)
    const assinatura = sessao
      ? await carregarAssinaturaEscritorio(sessao.supabase, sessao.user.id)
      : null

    const buffer = await montarDocxPeticao({
      text,
      adv,
      estilo,
      agentType,
      sexoParteAutora,
      timelinePng: lerTimelinePng(body),
      assinatura,
    })

    const safeName = fileName.replace(/[^\w\-À-ÿ]+/gi, '_').slice(0, 80)
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[gerar-documento-docx]', err)
    const msg = err instanceof Error ? err.message : ''
    return Response.json(
      {
        error:
          msg === ERRO_GERACAO_INTERROMPIDA
            ? ERRO_GERACAO_INTERROMPIDA
            : 'Não foi possível gerar o Word (.docx). Tente novamente.',
      },
      { status: 500 },
    )
  }
}
