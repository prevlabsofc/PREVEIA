/**
 * Alertas ao cliente por tipo de movimento processual (DataJud).
 * Canal inicial: e-mail via Resend (não há WhatsApp Business API no projeto).
 */

import { createHash } from 'crypto'

export const TIPOS_ALERTA_MOVIMENTO = [
  {
    id: 'nova_decisao',
    label: 'Nova decisão',
    descricao: 'Decisão interlocutória ou julgamento publicado',
    palavras: [
      'decisão', 'decisao', 'julgamento', 'acordão', 'acordao', 'acórdão',
      'provido', 'improvido', 'parcialmente provido', 'negado provimento',
      'deferido', 'indeferido',
    ],
  },
  {
    id: 'audiencia_marcada',
    label: 'Audiência marcada',
    descricao: 'Designação ou redesignação de audiência',
    palavras: [
      'audiência', 'audiencia', 'designada audiência', 'redesignada audiência',
      'conciliatória', 'conciliatoria', 'instrução',
    ],
  },
  {
    id: 'sentenca_publicada',
    label: 'Sentença publicada',
    descricao: 'Sentença ou decisão final de mérito',
    palavras: [
      'sentença', 'sentenca', 'sentença publicada', 'julgado procedente',
      'julgado improcedente', 'extinto o processo com resolução',
    ],
  },
  {
    id: 'intimacao',
    label: 'Intimação',
    descricao: 'Intimação ou citação das partes',
    palavras: [
      'intimação', 'intimacao', 'intimado', 'citação', 'citacao', 'citado',
    ],
  },
  {
    id: 'despacho',
    label: 'Despacho',
    descricao: 'Despacho do juiz ou relator',
    palavras: ['despacho'],
  },
  {
    id: 'conclusos',
    label: 'Conclusos',
    descricao: 'Autos conclusos para decisão',
    palavras: ['conclusos', 'conclusão', 'conclusao'],
  },
  {
    id: 'recurso',
    label: 'Recurso',
    descricao: 'Interposição, recebimento ou julgamento de recurso',
    palavras: [
      'recurso', 'apelação', 'apelacao', 'agravo', 'embargos',
      'contrarrazões', 'contrarrazoes',
    ],
  },
  {
    id: 'arquivamento',
    label: 'Arquivamento',
    descricao: 'Arquivamento ou baixa definitiva',
    palavras: [
      'arquivado', 'arquivamento', 'baixa definitiva', 'baixado',
      'extinto o processo sem resolução',
    ],
  },
] as const

export type TipoAlertaMovimentoId = (typeof TIPOS_ALERTA_MOVIMENTO)[number]['id']

const IDS_VALIDOS = new Set<string>(TIPOS_ALERTA_MOVIMENTO.map((t) => t.id))

export function normalizarTiposAlerta(valor: unknown): TipoAlertaMovimentoId[] {
  if (!Array.isArray(valor)) return []
  const unicos = new Set<TipoAlertaMovimentoId>()
  for (const item of valor) {
    const id = String(item || '').trim()
    if (IDS_VALIDOS.has(id)) unicos.add(id as TipoAlertaMovimentoId)
  }
  return Array.from(unicos)
}

export function rotuloTipoAlerta(id: string): string {
  return TIPOS_ALERTA_MOVIMENTO.find((t) => t.id === id)?.label || id
}

/** Classifica o nome do movimento DataJud nos tipos selecionados pelo advogado. */
export function classificarMovimento(
  nomeMovimento: string,
  tiposSelecionados: TipoAlertaMovimentoId[],
): TipoAlertaMovimentoId | null {
  if (!nomeMovimento || tiposSelecionados.length === 0) return null
  const nome = nomeMovimento.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

  for (const tipo of TIPOS_ALERTA_MOVIMENTO) {
    if (!tiposSelecionados.includes(tipo.id)) continue
    for (const palavra of tipo.palavras) {
      const p = palavra.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      if (nome.includes(p)) return tipo.id
    }
  }
  return null
}

export function chaveDedupAlerta(opts: {
  processoId: string
  tipo: string
  movimentoNome: string
  movimentoData: string | null
}): string {
  const base = [
    opts.processoId,
    opts.tipo,
    opts.movimentoNome.trim().toLowerCase(),
    opts.movimentoData || 'sem-data',
  ].join('|')
  return createHash('sha256').update(base).digest('hex').slice(0, 48)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function montarEmailAlertaCliente(opts: {
  nomeCliente: string
  escritorio: string
  numeroProcesso: string
  tipoAlerta: string
  movimentoNome: string
  movimentoData: string | null
}): { subject: string; html: string; text: string } {
  const nome = opts.nomeCliente.trim() || 'Cliente'
  const escritorio = opts.escritorio.trim() || 'Seu escritório de advocacia'
  const tipoLabel = rotuloTipoAlerta(opts.tipoAlerta)
  const dataFmt = opts.movimentoData
    ? new Date(opts.movimentoData).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  const subject = `Atualização do seu processo — ${tipoLabel}`
  const text = [
    `Olá, ${nome}.`,
    '',
    `${escritorio} informa uma novidade no processo ${opts.numeroProcesso}:`,
    '',
    `${tipoLabel}`,
    opts.movimentoNome,
    dataFmt ? `Data: ${dataFmt}` : '',
    '',
    'Se tiver dúvidas, fale com o escritório responsável pelo seu caso.',
    '',
    '— Mensagem automática via Marple',
  ]
    .filter((l) => l !== '')
    .join('\n')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: Georgia, serif; background: #0A0A0A; color: #fff; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 32px; font-weight: bold; margin: 0;">
        <span style="color: #fff;">Mar</span><span style="color: #D4AF37;">ple</span>
      </h1>
      <p style="color: #888; font-size: 12px; letter-spacing: 3px; margin: 4px 0 0;">ATUALIZAÇÃO DO SEU PROCESSO</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; padding: 32px;">
      <h2 style="color: #D4AF37; font-size: 20px; margin: 0 0 16px;">Olá, ${escapeHtml(nome)}</h2>
      <p style="color: #ccc; line-height: 1.7; margin: 0 0 16px;">
        <strong style="color:#fff;">${escapeHtml(escritorio)}</strong> informa uma novidade no seu processo
        <strong style="color:#fff;">${escapeHtml(opts.numeroProcesso)}</strong>.
      </p>
      <div style="background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="color: #D4AF37; font-weight: bold; margin: 0 0 8px; font-size: 13px;">${escapeHtml(tipoLabel)}</p>
        <p style="color: #ccc; margin: 0; line-height: 1.6; font-size: 14px;">${escapeHtml(opts.movimentoNome)}</p>
        ${dataFmt ? `<p style="color: #888; margin: 12px 0 0; font-size: 12px;">Data: ${escapeHtml(dataFmt)}</p>` : ''}
      </div>
      <p style="color: #aaa; line-height: 1.6; margin: 0; font-size: 14px;">
        Se tiver dúvidas, fale com o escritório responsável pelo seu caso.
      </p>
    </div>
    <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
      © ${new Date().getFullYear()} Marple · Mensagem automática a pedido do escritório.
    </p>
  </div>
</body>
</html>`

  return { subject, html, text }
}

export async function enviarEmailAlertaCliente(opts: {
  to: string
  nomeCliente: string
  escritorio: string
  numeroProcesso: string
  tipoAlerta: string
  movimentoNome: string
  movimentoData: string | null
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[alertas-movimentos] RESEND_API_KEY ausente — e-mail não enviado')
    return false
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const { subject, html, text } = montarEmailAlertaCliente(opts)

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@marple.com.br',
      to: opts.to,
      subject,
      html,
      text,
    })
    return true
  } catch (e) {
    console.warn('[alertas-movimentos] falha Resend', e instanceof Error ? e.message : e)
    return false
  }
}
