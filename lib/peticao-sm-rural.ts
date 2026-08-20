/**
 * Template visual fiel ao modelo Custódio Advogados para
 * Salário-Maternidade — Segurada Especial (salario-maternidade-rural).
 *
 * Espera marcadores <<<SM_RURAL_V2>>> no texto gerado pela IA.
 * Se ausentes, retorna null para o export genérico assumir.
 */

import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  corrigirLocalNoTexto,
  formatarLocalData,
  limparMarkdownResidual,
  resolverLocalAdvogado,
} from '@/lib/peticao-export'

export const AGENT_SM_RURAL = 'salario-maternidade-rural'

export type TimelineEstilo = 'horizontal' | 'vertical' | 'none'

export type TimelineEvento = {
  data: string
  titulo: string
  detalhe?: string
}

export type TimelineData = {
  nome: string
  atividade: string
  local: string
  estilo?: TimelineEstilo
  eventos: TimelineEvento[]
}

type QuadroRow = { campo: string; valor: string }
type Prioridades = { idoso: boolean; deficiente: boolean; menor: boolean }

function escapar(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const ANO_MIN = 1900
const ANO_MAX = () => Math.min(2100, new Date().getFullYear() + 1)

/**
 * Valida/normaliza datas BR para o PDF. Ano deve ter 4 dígitos e cair em
 * 1900..(ano atual+1, máx 2100). Valores absurdos → "A informar".
 * Textos sem dígitos (ex.: "Infância") passam intactos.
 */
export function sanitizarDataPeticao(
  valor: string,
  fallback = 'A informar',
): string {
  const raw = String(valor || '').trim()
  if (!raw) return fallback
  if (!/\d/.test(raw)) return raw

  const anoOk = (y: number) => y >= ANO_MIN && y <= ANO_MAX()

  const fmt = (d: number, m: number, y: number) => {
    if (!anoOk(y) || m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }

  const expandYear = (yStr: string): number => {
    const n = Number.parseInt(yStr, 10)
    if (yStr.length === 2) return n >= 50 ? 1900 + n : 2000 + n
    return n
  }

  // dd/mm/yyyy | dd-mm-yyyy | dd.mm.yyyy
  let m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    const out = fmt(
      Number.parseInt(m[1], 10),
      Number.parseInt(m[2], 10),
      expandYear(m[3]),
    )
    return out || fallback
  }

  // yyyy-mm-dd (ISO / input date)
  m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const out = fmt(
      Number.parseInt(m[3], 10),
      Number.parseInt(m[2], 10),
      Number.parseInt(m[1], 10),
    )
    return out || fallback
  }

  // Ano isolado (4 dígitos)
  m = raw.match(/^(\d{4})$/)
  if (m) {
    const y = Number.parseInt(m[1], 10)
    return anoOk(y) ? String(y) : fallback
  }

  // Substitui datas embutidas em texto maior
  const re = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g
  if (re.test(raw)) {
    return raw.replace(re, (piece) => sanitizarDataPeticao(piece, fallback))
  }

  // ISO embutido
  const reIso = /(\d{4})-(\d{2})-(\d{2})/g
  if (reIso.test(raw)) {
    return raw.replace(reIso, (piece) => sanitizarDataPeticao(piece, fallback))
  }

  return raw
}

/** Campos do quadro cujos valores são tipicamente datas. */
function campoEhData(campo: string): boolean {
  return /data|nascimento|requer|indefer|der\.?\s*adm|req\.?\s*adm/i.test(campo)
}

/**
 * Nome de arquivo PDF: peticao-salario-maternidade-francisca-lima-souza
 */
export function slugArquivoPeticaoSm(nomeCliente: string): string {
  const slug = String(nomeCliente || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return `peticao-salario-maternidade-${slug || 'cliente'}`
}

function bloco(text: string, start: string, end: string): string {
  const a = text.indexOf(start)
  if (a === -1) return ''
  const b = text.indexOf(end, a + start.length)
  if (b === -1) return text.slice(a + start.length).trim()
  return text.slice(a + start.length, b).trim()
}

function parseMeta(raw: string): {
  tipoAcao: string
  juizoDigital: boolean
  prioridades: Prioridades
} {
  const tipoAcao =
    raw.match(/tipo_acao:\s*(.+)/i)?.[1]?.trim() ||
    'SALÁRIO MATERNIDADE - SEGURADO ESPECIAL'
  const juizoDigital = !/juizo_digital:\s*false/i.test(raw)
  return {
    tipoAcao,
    juizoDigital,
    prioridades: {
      idoso: /prioridade_idoso:\s*true/i.test(raw),
      deficiente: /prioridade_deficiente:\s*true/i.test(raw),
      menor: /prioridade_menor:\s*true/i.test(raw),
    },
  }
}

function parseQuadro(md: string): QuadroRow[] {
  const rows: QuadroRow[] = []
  for (const line of md.split('\n')) {
    const m = line.match(/^\|(.+)\|(.+)\|\s*$/)
    if (!m) continue
    const campo = limparMarkdownResidual(m[1].trim())
    let valor = limparMarkdownResidual(m[2].trim())
    if (!campo || /^[-:]+$/.test(campo) || /^campo$/i.test(campo)) continue
    if (/^valor$/i.test(valor)) continue
    const pareceData =
      campoEhData(campo) ||
      /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(valor) ||
      /^\d{4}-\d{2}-\d{2}/.test(valor)
    if (pareceData) valor = sanitizarDataPeticao(valor)
    rows.push({ campo, valor })
  }
  return rows
}

function parseProvas(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.replace(/^✓\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith('<') && !/^#{1,6}\s/.test(l))
}

function parsePedidos(raw: string): string[] {
  const items: string[] = []
  // Ordem: números romanos mais longos primeiro (viii antes de v, etc.)
  const re = /(?:^|\n)\s*((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s+/gi
  const matches: { num: string; bodyStart: number; start: number }[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    matches.push({
      num: match[1].toLowerCase(),
      start: match.index,
      bodyStart: match.index + match[0].length,
    })
  }
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].start : raw.length
    const body = raw.slice(matches[i].bodyStart, end).trim()
    if (body) items.push(`${matches[i].num}. ${body}`)
  }
  return items
}

function parseTimeline(raw: string): TimelineData | null {
  try {
    const json = JSON.parse(raw)
    if (!json || !Array.isArray(json.eventos)) return null
    const estiloRaw = String(json.estilo || 'horizontal').toLowerCase()
    const estilo: TimelineEstilo =
      estiloRaw === 'vertical' || estiloRaw === 'none' ? estiloRaw : 'horizontal'
    return {
      nome: String(json.nome || 'AUTORA'),
      atividade: String(json.atividade || 'Agricultora'),
      local: String(json.local || ''),
      estilo,
      eventos: json.eventos.map((e: TimelineEvento) => {
        const dataRaw = String(e?.data || '').trim()
        const data =
          !dataRaw
            ? '—'
            : !/\d/.test(dataRaw)
              ? dataRaw
              : sanitizarDataPeticao(dataRaw)
        return {
          data,
          titulo: String(e?.titulo || ''),
          detalhe: String(e?.detalhe || ''),
        }
      }),
    }
  } catch {
    return null
  }
}

/** Sugere eventos padrão a partir dos campos do formulário de SM. */
export function sugerirEventosTimeline(
  form: Record<string, string>,
): TimelineEvento[] {
  const evs: TimelineEvento[] = []
  const periodo = (form.periodo_segurado || '').trim()
  if (periodo) {
    evs.push({
      data: 'Infância / juventude',
      titulo: 'Início do labor rural',
      detalhe: periodo,
    })
  }
  if ((form.data_nascimento_crianca || '').trim()) {
    evs.push({
      data: sanitizarDataPeticao(form.data_nascimento_crianca.trim()),
      titulo: 'Nascimento do(a) filho(a)',
      detalhe: form.nome_crianca ? `Criança: ${form.nome_crianca}` : '',
    })
  }
  if ((form.data_requerimento || '').trim()) {
    evs.push({
      data: sanitizarDataPeticao(form.data_requerimento.trim()),
      titulo: 'Requerimento administrativo',
      detalhe: form.nb ? `NB ${form.nb}` : 'Pedido de salário-maternidade',
    })
  }
  if ((form.data_indeferimento || '').trim()) {
    evs.push({
      data: sanitizarDataPeticao(form.data_indeferimento.trim()),
      titulo: 'Indeferimento pelo INSS',
      detalhe: (form.motivo_inss || '').trim().slice(0, 80),
    })
  }
  evs.push({
    data: new Date().toLocaleDateString('pt-BR'),
    titulo: 'Ajuizamento da ação',
    detalhe: 'Petição inicial — JEF',
  })
  return evs.length
    ? evs
    : [
        { data: '—', titulo: 'Evento 1', detalhe: '' },
        { data: '—', titulo: 'Evento 2', detalhe: '' },
      ]
}

export function montarTimelineDataPadrao(
  form: Record<string, string>,
  estilo: TimelineEstilo = 'horizontal',
): TimelineData {
  const cidade = (form.cidade || '').trim()
  const uf = (form.estado || form.uf || '').trim()
  let local = [cidade, uf].filter(Boolean).join('/')
  if (!local && (form.endereco || '').trim()) {
    // Extrai "Cidade/UF" do final do endereço formatado, se houver
    const m = form.endereco.match(/([A-Za-zÀ-ú\s]+)\s*\/\s*([A-Z]{2})\s*$/)
    if (m) local = `${m[1].trim()}/${m[2]}`
  }
  return {
    nome: (form.nome || 'AUTORA').trim() || 'AUTORA',
    atividade: (form.atividade || form.ocupacao || 'Agricultora').trim() || 'Agricultora',
    local,
    estilo,
    eventos: sugerirEventosTimeline(form),
  }
}

/** Substitui (ou anexa) o bloco <<<TIMELINE>>> no texto gerado pela IA. */
export function injetarTimelineNoTexto(text: string, data: TimelineData): string {
  const json = JSON.stringify(
    {
      nome: data.nome,
      atividade: data.atividade,
      local: data.local,
      estilo: data.estilo || 'horizontal',
      eventos: data.eventos,
    },
    null,
    2,
  )
  const blocoTl = `<<<TIMELINE>>>\n${json}\n<<<END_TIMELINE>>>`
  if (/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/.test(text)) {
    return text.replace(/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/, blocoTl)
  }
  if (text.includes('<<<III_SINTESE_DEPOIS>>>')) {
    return text.replace('<<<III_SINTESE_DEPOIS>>>', `${blocoTl}\n\n<<<III_SINTESE_DEPOIS>>>`)
  }
  return `${text.trim()}\n\n${blocoTl}\n`
}

function normalizarEspacos(s: string): string {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim()
}

function parasHtml(raw: string, extraClass = ''): string {
  const cls = extraClass ? `sm-para ${extraClass}` : 'sm-para'
  return raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const limpo = normalizarEspacos(limparMarkdownResidual(p))
      const comDatas = limpo
        .replace(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g, (piece) =>
          sanitizarDataPeticao(piece),
        )
        .replace(/(\d{4})-(\d{2})-(\d{2})/g, (piece) => sanitizarDataPeticao(piece))
      const inner = escapar(comDatas).replace(/\n/g, '<br/>')
      return `<p class="${cls}">${inner}</p>`
    })
    .join('')
}

/** SVG da linha do tempo horizontal — pontos numerados (modelo Custódio). */
export function renderTimelineSvg(data: TimelineData): string {
  const w = 720
  const h = 260
  const padX = 48
  const lineY = 130
  const events = data.eventos.length
    ? data.eventos
    : [{ data: '—', titulo: 'Sem eventos', detalhe: '' }]
  const n = events.length
  const usable = w - padX * 2
  const step = n > 1 ? usable / (n - 1) : 0

  const title = `LINHA DO TEMPO — ${data.nome.toUpperCase()} | ${data.atividade}${data.local ? ` • ${data.local}` : ''}`

  let nodes = ''
  events.forEach((ev, i) => {
    const x = padX + i * step
    const above = i % 2 === 0
    const cy = lineY
    const textY = above ? lineY - 52 : lineY + 38
    const detailY = above ? lineY - 34 : lineY + 56
    const dataY = above ? lineY - 70 : lineY + 74

    nodes += `
      <circle cx="${x}" cy="${cy}" r="14" fill="#0A2540" stroke="#D4AF37" stroke-width="2"/>
      <text x="${x}" y="${cy + 5}" text-anchor="middle" fill="#fff" font-size="11" font-family="Arial,sans-serif" font-weight="700">${i + 1}</text>
      <text x="${x}" y="${dataY}" text-anchor="middle" fill="#555" font-size="10" font-family="Arial,sans-serif">${escapar(ev.data)}</text>
      <text x="${x}" y="${textY}" text-anchor="middle" fill="#0A2540" font-size="11" font-family="Arial,sans-serif" font-weight="700">${escapar(ev.titulo)}</text>
      ${ev.detalhe ? `<text x="${x}" y="${detailY}" text-anchor="middle" fill="#666" font-size="9" font-family="Arial,sans-serif">${escapar(ev.detalhe)}</text>` : ''}
    `
  })

  return `
    <div class="sm-timeline keep-together">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="${escapar(title)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#EEF1F5" stroke="#D0D7E2"/>
        <text x="16" y="28" fill="#0A2540" font-size="12" font-family="Arial,sans-serif" font-weight="700">${escapar(title)}</text>
        <line x1="${padX}" y1="${lineY}" x2="${w - padX}" y2="${lineY}" stroke="#0A2540" stroke-width="2.5"/>
        ${nodes}
      </svg>
    </div>
  `
}

/** Lista cronológica vertical (mais simples de renderizar no PDF). */
export function renderTimelineVertical(data: TimelineData): string {
  const title = `LINHA DO TEMPO — ${data.nome.toUpperCase()} | ${data.atividade}${data.local ? ` • ${data.local}` : ''}`
  const items = (data.eventos.length ? data.eventos : [{ data: '—', titulo: 'Sem eventos', detalhe: '' }])
    .map(
      (ev, i) => `
      <tr>
        <td class="sm-tl-num">${i + 1}</td>
        <td class="sm-tl-data">${escapar(ev.data)}</td>
        <td class="sm-tl-body">
          <div class="sm-tl-titulo">${escapar(ev.titulo)}</div>
          ${ev.detalhe ? `<div class="sm-tl-detalhe">${escapar(ev.detalhe)}</div>` : ''}
        </td>
      </tr>`,
    )
    .join('')

  return `
    <div class="sm-timeline sm-timeline-vertical keep-together">
      <div class="sm-tl-title">${escapar(title)}</div>
      <table class="sm-tl-table" cellpadding="0" cellspacing="0">
        <tbody>${items}</tbody>
      </table>
    </div>
  `
}

/** Escolhe o HTML da timeline conforme o estilo configurado. */
export function renderTimelineHtml(data: TimelineData | null): string {
  if (!data) return ''
  const estilo = data.estilo || 'horizontal'
  if (estilo === 'none') return ''
  if (!data.eventos?.length) return ''
  if (estilo === 'vertical') return renderTimelineVertical(data)
  return renderTimelineSvg(data)
}

function cabecalhoSm(adv: DadosAdvogadoPeticao): string {
  const nome = String(adv.office_name || adv.name || 'Advocacia')
  const oabUf = String(adv.oab_uf || adv.estado || '').toUpperCase()
  const oabNum = String(adv.oab_number || '')
  const email = String(adv.email || '')
  const logoSrc = adv.logo_url ? String(adv.logo_url) : ''
  // data-URL não deve passar por escapar (quebraria base64); URLs http usam aspas seguras
  const logo =
    logoSrc && logoSrc.startsWith('data:')
      ? `<img src="${logoSrc}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`
      : logoSrc
        ? `<img src="${escapar(logoSrc)}" class="sm-logo" width="110" height="36" alt="Logo" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`
        : `<table cellpadding="0" cellspacing="0" style="width:36px;height:36px;background:#D4AF37;"><tr><td style="width:36px;height:36px;text-align:center;vertical-align:middle;font-weight:bold;font-size:11px;color:#000;">${escapar(nome.slice(0, 2).toUpperCase())}</td></tr></table>`

  const mailLine = email
    ? `<br/><span style="font-size:9px;color:#1d4ed8;line-height:1.4;">${escapar(email)}</span>`
    : ''
  return `
    <div class="sm-header">
      <table class="sm-header-table" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:130px;" />
          <col style="width:auto;" />
        </colgroup>
        <tr>
          <td width="130" valign="middle" align="left" style="width:130px;vertical-align:middle;text-align:left;padding:0;overflow:hidden;">${logo}</td>
          <td valign="middle" align="right" style="vertical-align:middle;text-align:right;padding:0 0 0 10px;overflow:hidden;">
            <p align="right" style="margin:0;padding:0;text-align:right;font-family:'Times New Roman',Times,serif;">
              <span style="font-weight:bold;font-size:11.5px;text-transform:uppercase;line-height:1.35;color:#0A2540;">${escapar(nome)}</span><br/>
              <span style="font-size:9px;color:#444;line-height:1.4;">OAB/${escapar(oabUf)} n° ${escapar(oabNum)}</span>${mailLine}
            </p>
          </td>
        </tr>
      </table>
      <div class="sm-header-line"></div>
    </div>
  `
}

function metaBoxHtml(
  tipoAcao: string,
  juizoDigital: boolean,
  p: Prioridades,
): string {
  const chk = (on: boolean) => (on ? '(X)' : '( )')
  const tipo =
    (tipoAcao || '').trim() || 'SALÁRIO MATERNIDADE - SEGURADO ESPECIAL'
  const digital =
    juizoDigital !== false
      ? '<div class="sm-meta-digital">JUÍZO 100% DIGITAL</div>'
      : ''
  // Tabela 2 colunas (vazio | caixa): html2canvas/jsPDF entendem melhor que
  // text-align:right + inline-block / float / position.
  return `
    <table class="sm-meta-row" cellpadding="0" cellspacing="0">
      <tr>
        <td class="sm-meta-spacer">&nbsp;</td>
        <td class="sm-meta-cell">
          <table class="sm-meta-box" cellpadding="0" cellspacing="0">
            <tr><td class="sm-meta-inner">
              <div class="sm-meta-tipo">${escapar(tipo)}</div>
              ${digital}
              <div class="sm-meta-prio">
                <div class="sm-meta-prio-title">Prioridade Legal na tramitação processual:</div>
                <div class="sm-meta-prio-item">${chk(p.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;</div>
                <div class="sm-meta-prio-item">${chk(p.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;</div>
                <div class="sm-meta-prio-item">${chk(p.menor)} Menor nos termos do ECA – Lei 8.069/1990;</div>
              </div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

function quadroHtml(rows: QuadroRow[]): string {
  const body = rows
    .map(
      (r, i) => `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td class="campo">${escapar(r.campo)}</td>
        <td class="valor">${escapar(r.valor)}</td>
      </tr>`,
    )
    .join('')
  return `
    <div class="sm-table-wrap keep-together">
      <div class="sm-table-caption">RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO</div>
      <table class="sm-quadro">
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}

function provasHtml(items: string[]): string {
  return `
    <div class="sm-provas keep-together">
      <table class="sm-provas-table" cellpadding="0" cellspacing="0" width="100%">
        ${items
          .map(
            (it, i) => `
          <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
            <td class="sm-check">✓</td>
            <td class="sm-prova-txt">${escapar(it)}</td>
          </tr>`,
          )
          .join('')}
      </table>
    </div>
  `
}

function pedidosHtml(items: string[], comIntro = true): string {
  if (!items.length) return ''
  const intro = comIntro
    ? `<p class="sm-para sm-pedidos-intro">Diante do exposto, requer:</p>`
    : ''
  // Cada item é uma TABLE com page-break-inside:avoid + data-pdf-keep
  // (html2canvas/fatiamento respeitam melhor que <li>)
  const rows = items
    .map((it) => {
      const m = it.match(/^((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s*([\s\S]*)$/i)
      const num = m ? m[1].toLowerCase() : ''
      const body = m ? m[2] : it
      return `
        <table class="sm-pedido-item" data-pdf-keep="1" cellpadding="0" cellspacing="0" width="100%" border="0"
          style="width:100%;border-collapse:collapse;margin:0 0 10px;page-break-inside:avoid;break-inside:avoid;">
          <tr>
            <td style="font-size:11.5px;line-height:1.6;text-align:justify;padding:0;vertical-align:top;">
              <span class="sm-rom">${escapar(num)}.</span> ${escapar(limparMarkdownResidual(body))}
            </td>
          </tr>
        </table>`
    })
    .join('')
  return `
    <div class="sm-pedidos">
      ${intro}
      ${rows}
    </div>
  `
}

function notaDocumentoGeradoHtml(): string {
  const dataTxt = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `
    <div class="sm-doc-fecho-wrap">
      <div class="sm-doc-gerado">Documento gerado em ${escapar(dataTxt)} pela plataforma Marple</div>
    </div>
  `
}

function planilhaHtml(_raw: string): string {
  // Compacta + sem page-break — prioriza ficar na mesma página da assinatura.
  return `
    <div class="sm-anexo" style="margin-top:10pt;padding-top:4pt;border-top:0.5pt solid #ccc;page-break-before:auto;break-before:auto;page-break-inside:avoid;break-inside:avoid;">
      <div class="sm-anexo-title" style="margin:4px 0 10px;font-size:13px;">ANEXO – PLANILHA DE CÁLCULO</div>
      <div class="sm-table-wrap" style="margin:6px 0 8px;">
        <div class="sm-table-caption" style="padding:6px 10px;">PLANILHA DE CÁLCULO</div>
        <table class="sm-planilha" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
          <colgroup>
            <col style="width:65%;" />
            <col style="width:35%;" />
          </colgroup>
          <tbody>
            <tr class="even"><td style="padding:5px 10px;color:#1a1a1a;">1º Mês de benefício</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="odd"><td style="padding:5px 10px;color:#1a1a1a;">2º Mês de benefício</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="even"><td style="padding:5px 10px;color:#1a1a1a;">3º Mês de benefício</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="odd"><td style="padding:5px 10px;color:#1a1a1a;">4º Mês de benefício</td><td align="right" style="padding:5px 10px;text-align:right;color:#1a1a1a;white-space:nowrap;">R$ 1.518,00</td></tr>
            <tr class="total"><td style="padding:5px 10px;background:#c8a951;font-weight:bold;color:#1a1a1a;">TOTAL</td><td align="right" style="padding:5px 10px;text-align:right;background:#c8a951;font-weight:bold;color:#1a1a1a;white-space:nowrap;">R$ 6.072,00</td></tr>
          </tbody>
        </table>
        <p class="sm-nota" style="margin-top:4px;">Referência do valor: quantia devida por fato gerador (cada nascimento) — salário mínimo vigente</p>
      </div>
    </div>
  `
}

function assinaturasHtml(adv: DadosAdvogadoPeticao, fechamentoRaw: string): string {
  const localData = formatarLocalData(adv)
  const oabLines = fechamentoRaw.match(
    /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm,
  )

  const cardHtml = (nome: string, oab: string) => `
    <td class="sm-sign-card">
      <div class="sm-sign-line"></div>
      <div class="sm-sign-name">${escapar(nome)}</div>
      <div class="sm-sign-oab">${escapar(oab)}</div>
    </td>`

  let cards = ''
  if (oabLines && oabLines.length) {
    cards = oabLines
      .slice(0, 2)
      .map((block) => {
        const [nome, oab] = block.split('\n')
        return cardHtml(nome.trim(), oab.trim())
      })
      .join('')
  } else {
    const nome = String(adv.name || 'Advogado(a)')
    const oabUf = String(adv.oab_uf || adv.estado || '').toUpperCase()
    const oabNum = String(adv.oab_number || '')
    cards = cardHtml(nome, `OAB/${oabUf} nº ${oabNum}`)
  }

  let body = fechamentoRaw
    .replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm, '')
    .replace(/^[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+.*/gim, '')
    .trim()

  return `
    <div class="sm-fechamento">
      ${parasHtml(body)}
      <p class="sm-local-data">${escapar(localData)}.</p>
      <table class="sm-sign-row" cellpadding="0" cellspacing="0" width="100%">
        <tr>${cards}</tr>
      </table>
    </div>
  `
}

/** Texto do rodapé para desenho nativo no jsPDF (não vai no HTML). */
export function textoRodapeSm(adv: DadosAdvogadoPeticao): string {
  const nome = String(adv.office_name || adv.name || 'Advocacia').trim()
  const { localFormatado } = resolverLocalAdvogado(adv)
  const left = nome.toUpperCase()
  return localFormatado ? `${left} | ${localFormatado}` : left
}

function sectionBar(title: string): string {
  return `<div class="sm-section-bar keep-together">${escapar(title)}</div>`
}

function subheadComBarra(title: string): string {
  // Tipografia bold apenas — sem barra lateral / fundo (diferente de sectionBar).
  return `<div class="sm-subhead keep-together">${escapar(title)}</div>`
}

export function isSmRuralStructured(text: string): boolean {
  return text.includes('<<<SM_RURAL_V2>>>')
}

export function cssSmRural(comMargens: boolean): string {
  // Preview: margens no HTML. Export PDF: margens via jsPDF — mas o conteúdo
  // ainda precisa de box-sizing e overflow controlados para não cortar texto.
  const pad = comMargens
    ? 'padding: 3cm 2cm 2cm 3cm;'
    : 'padding: 0; box-sizing: border-box;'
  return `
    .pdf-page.sm-rural {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      max-width: 794px;
      height: auto;
      min-height: 0;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      ${pad}
    }
    .sm-sheet {
      position: relative;
      min-height: 0;
      height: auto;
      width: 100%;
      box-sizing: border-box;
      page-break-inside: auto;
    }
    .sm-sheet-inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-sheet-main { vertical-align: top; padding: 0; width: 100%; }
    .sm-sheet-foot { vertical-align: bottom; padding: 16px 0 0; width: 100%; }
    .sm-body { width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden; }
    .sm-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* Evitar page-break-before no fluxo — causa páginas em branco com html2canvas */
    .page-break-before { page-break-before: auto; break-before: auto; }
    .keep-together { page-break-inside: auto; break-inside: auto; }

    /* —— Cabeçalho: TABLE logo | dados (sem flex) —— */
    .sm-header { margin-bottom: 18px; width: 100%; }
    .sm-header-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-header-logo { width: 24%; vertical-align: middle; text-align: left; padding: 0 8px 0 0; }
    .sm-header-info { width: 76%; vertical-align: middle; text-align: right; padding: 0; }
    .sm-logo { height: 36px; max-height: 36px; max-width: 120px; width: auto; display: block; }
    .sm-logo-fallback {
      height: 36px; width: 36px; border-collapse: collapse;
      background: #D4AF37;
    }
    .sm-logo-fallback td {
      height: 36px; width: 36px; text-align: center; vertical-align: middle;
      font-weight: bold; font-size: 11px; color: #000;
      background: #D4AF37;
    }
    .sm-office-name {
      font-weight: bold; font-size: 11.5px; color: #0A2540;
      text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.35;
    }
    .sm-office-sub { font-size: 9px; color: #444; margin-top: 2px; line-height: 1.4; }
    .sm-office-mail { font-size: 9px; color: #1d4ed8; margin-top: 1px; }
    .sm-header-line {
      border: none; border-top: 1.5px solid #0A2540;
      margin-top: 8px; width: 100%; height: 0;
    }
    .sm-page-top-line {
      border: none; border-top: 1px solid #999;
      width: 100%; height: 0; margin: 0 0 14px;
    }

    /* —— Rodapé: no fluxo do documento (sem fixed/absolute) —— */
    .sm-footer { margin-top: 0; page-break-inside: avoid; break-inside: avoid; width: 100%; }
    .sm-footer-line { border: none; border-top: 1px solid #999; width: 100%; height: 0; margin: 0 0 6px; }
    .sm-footer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-footer-left {
      text-align: left; font-weight: 600; font-size: 9px; color: #555; width: 70%;
    }
    .sm-footer-right {
      text-align: right; white-space: nowrap; font-size: 9px; color: #555; width: 30%;
    }

    .sm-endereco {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      text-align: justify;
      margin: 22px 0 20px;
      line-height: 1.55;
      page-break-after: avoid;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }

    /* —— Meta: tabela 2 cols + borda tracejada via border-style (sem float) —— */
    .sm-meta-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin: 0 0 14px; page-break-inside: avoid;
    }
    .sm-meta-spacer { width: 46%; padding: 0; }
    .sm-meta-cell { width: 54%; padding: 0; vertical-align: top; text-align: left; }
    table.sm-meta-box {
      width: 100%; border-collapse: collapse;
      border: 1.5px dashed #0A2540;
      background: #ffffff;
    }
    .sm-meta-inner {
      padding: 10px 12px;
      font-size: 9.5px;
      line-height: 1.5;
      text-align: left;
      vertical-align: top;
      color: #1a1a1a;
      overflow-wrap: anywhere;
      word-wrap: break-word;
      max-width: 100%;
    }
    .sm-meta-tipo {
      font-weight: bold; font-size: 10.5px; color: #0A2540;
      text-transform: uppercase; margin-bottom: 4px; line-height: 1.35;
      overflow-wrap: anywhere; word-wrap: break-word;
    }
    .sm-meta-digital {
      font-weight: bold; font-size: 10.5px; color: #0A2540; margin-bottom: 8px;
    }
    .sm-meta-prio {
      border-top: 1px dashed #999; padding-top: 6px; margin-top: 4px;
    }
    .sm-meta-prio-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5px;
      font-size: 9.5px;
    }
    .sm-meta-prio-item { margin: 2px 0; line-height: 1.4; }

    .sm-main-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; color: #0A2540; margin: 16px 0 4px;
      page-break-after: avoid;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: normal;
      hyphens: none;
    }
    .sm-sub-title {
      text-align: center; font-size: 12px; font-weight: bold;
      margin: 0 0 14px; page-break-after: avoid;
    }

    .sm-section-bar {
      background: #2d5f8a;
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      padding: 8px 14px;
      margin: 18px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      width: 100%;
      box-sizing: border-box;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .sm-subhead {
      font-weight: bold;
      font-size: 11.5px;
      color: #1a1a1a;
      margin: 10px 0 8px;
      padding: 0;
      background: none;
      border: none;
      page-break-after: avoid;
    }

    .sm-para {
      font-size: 11.5px;
      line-height: 1.65;
      text-align: justify;
      text-indent: 1.25cm;
      margin: 0 0 10px;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sm-para-qualif { text-indent: 1.25cm; }

    .sm-table-wrap { margin: 10px 0 16px; page-break-inside: avoid; width: 100%; box-sizing: border-box; }
    .sm-table-caption {
      background: #1a3a5c;
      color: #fff;
      font-weight: bold;
      font-size: 10.5px;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
    }
    table.sm-quadro, table.sm-planilha {
      width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed;
    }
    table.sm-quadro td, table.sm-planilha td {
      padding: 7px 10px; border-bottom: 1px solid #dde3ec; vertical-align: top;
    }
    table.sm-quadro tr.even td, table.sm-planilha tr.even td { background: #f5f5f5; }
    table.sm-quadro tr.odd td, table.sm-planilha tr.odd td { background: #ffffff; }
    table.sm-quadro td.campo { font-weight: bold; width: 42%; color: #1a1a1a; }
    table.sm-quadro td.valor { font-weight: normal; width: 58%; }
    table.sm-planilha td.num { text-align: right; white-space: nowrap; width: 35%; }
    table.sm-planilha tr.total td {
      background: #c8a951 !important;
      font-weight: bold;
      color: #1a1a1a;
    }
    .sm-nota {
      font-size: 9.5px; font-style: italic; color: #555;
      margin-top: 8px; text-align: center;
    }
    .sm-anexo-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; margin: 8px 0 16px; color: #0A2540;
      background: none; padding: 0;
    }

    .sm-timeline { margin: 14px 0 18px; page-break-inside: auto; }
    .sm-timeline svg { display: block; width: 100%; height: auto; }
    .sm-timeline-vertical { background: #EEF1F5; border: 1px solid #D0D7E2; padding: 12px 14px; }
    .sm-tl-title { font-weight: bold; font-size: 11.5px; color: #0A2540; margin-bottom: 10px; text-transform: uppercase; }
    .sm-tl-table { width: 100%; border-collapse: collapse; }
    .sm-tl-table td { padding: 8px 6px; vertical-align: top; border-bottom: 1px solid #d8dee8; }
    .sm-tl-num {
      font-weight: bold; color: #fff; background: #0A2540;
      text-align: center; width: 22px; height: 22px;
      line-height: 22px; font-size: 11px;
    }
    .sm-tl-data { width: 110px; font-size: 10.5px; color: #555; white-space: nowrap; }
    .sm-tl-titulo { font-weight: bold; font-size: 11.5px; color: #0A2540; }
    .sm-tl-detalhe { font-size: 10px; color: #666; margin-top: 2px; }

    .sm-provas { margin: 8px 0; }
    table.sm-provas-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.sm-provas-table tr.even td { background: #f5f5f5; }
    table.sm-provas-table tr.odd td { background: #fff; }
    table.sm-provas-table td { padding: 6px 10px; font-size: 11.5px; vertical-align: top; }
    table.sm-provas-table td.sm-check {
      color: #15803d; font-weight: bold; width: 22px; text-align: center;
    }
    table.sm-provas-table td.sm-prova-txt { width: auto; }

    .sm-pedidos-list { list-style: none; padding: 0; margin: 8px 0 0; }
    .sm-pedidos-list li,
    table.sm-pedido-item {
      font-size: 11.5px; line-height: 1.6; text-align: justify;
      margin: 0 0 10px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .sm-pedidos-intro { margin-bottom: 8px; }
    .sm-rom { font-weight: bold; margin-right: 4px; }

    .sm-fechamento { margin-top: 18px; }
    .sm-fecho-bloco { page-break-inside: auto; break-inside: auto; }
    .sm-local-data { text-align: right; font-size: 12px; margin: 14px 0 16px; font-weight: 500; }
    table.sm-sign-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin-top: 8px; page-break-inside: avoid;
    }
    td.sm-sign-card { text-align: center; vertical-align: top; padding: 0 12px; width: 50%; }
    .sm-sign-line { border-top: 1px solid #222; margin: 0 8px 8px; height: 0; }
    .sm-sign-name { font-weight: bold; font-size: 11.5px; text-transform: uppercase; }
    .sm-sign-oab { font-size: 10px; color: #333; margin-top: 2px; }

    .sm-doc-fecho-wrap {
      margin-top: 48pt;
      padding-top: 24pt;
      min-height: 72pt;
      width: 100%;
      box-sizing: border-box;
    }
    .sm-doc-gerado {
      text-align: center;
      font-size: 9px;
      color: #888;
      font-style: italic;
      border-top: 0.5pt solid #ddd;
      padding-top: 10pt;
      line-height: 1.4;
    }
  `
}

/**
 * Monta o HTML multipágina do modelo Custódio.
 * Retorna null se o texto não tiver a estrutura <<<SM_RURAL_V2>>>.
 */
export function montarHtmlSmRural(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  comMargens?: boolean
  estilo?: EstiloPeticao
}): string | null {
  const text = corrigirLocalNoTexto(opts.text, opts.adv)
  if (!isSmRuralStructured(text)) return null

  const meta = parseMeta(bloco(text, '<<<META>>>', '<<<END_META>>>'))
  const endereco = bloco(text, '<<<ENDERECO>>>', '<<<END_ENDERECO>>>')
  const qualificacao = bloco(text, '<<<QUALIFICACAO>>>', '<<<END_QUALIFICACAO>>>')
  const titulo = bloco(text, '<<<TITULO>>>', '<<<SUBTITULO>>>')
  const subtitulo = bloco(text, '<<<SUBTITULO>>>', '<<<END_TITULO>>>')
  const emFace = bloco(text, '<<<EM_FACE>>>', '<<<END_EM_FACE>>>')
  const preliminares = bloco(text, '<<<I_PRELIMINARES>>>', '<<<END_I>>>')
  const quadro = parseQuadro(bloco(text, '<<<II_QUADRO>>>', '<<<END_II>>>'))
  const sinteseAntes = bloco(text, '<<<III_SINTESE_ANTES>>>', '<<<END_III_ANTES>>>')
  const timeline = parseTimeline(bloco(text, '<<<TIMELINE>>>', '<<<END_TIMELINE>>>'))
  const sinteseDepois = bloco(text, '<<<III_SINTESE_DEPOIS>>>', '<<<END_III_DEPOIS>>>')
  const provas = parseProvas(bloco(text, '<<<IV_PROVAS>>>', '<<<END_IV>>>'))
  const provasFecho = bloco(text, '<<<IV_FECHO>>>', '<<<END_IV_FECHO>>>')
  const fund = bloco(text, '<<<V_FUNDAMENTACAO>>>', '<<<END_V>>>')
  const pedidosAll = parsePedidos(bloco(text, '<<<VI_PEDIDOS>>>', '<<<END_VI>>>'))
  const fechamento = bloco(text, '<<<FECHAMENTO>>>', '<<<END_FECHAMENTO>>>')
  const planilha = bloco(text, '<<<PLANILHA>>>', '<<<END_PLANILHA>>>')

  // Divide pedidos: i–vii no bloco principal; viii+ (honorários) junto das assinaturas
  const pedidosP4 = pedidosAll.filter((p) => !/^viii\./i.test(p.trim()))
  const pedidosP5 = pedidosAll.filter((p) => /^viii\./i.test(p.trim()))

  const prelimSub = preliminares.match(/DA GRATUIDADE[\s\S]*/i)?.[0] || preliminares
  const prelimTitleMatch = prelimSub.match(/^(DA GRATUIDADE[^:\n]*:?)/im)
  const prelimTitle = prelimTitleMatch?.[1] || 'DA GRATUIDADE DA JUSTIÇA:'
  const prelimBody = prelimSub.replace(/^(DA GRATUIDADE[^:\n]*:?)\s*/im, '')

  const assinaturas = assinaturasHtml(opts.adv, fechamento)

  const enderecoTexto = normalizarEspacos(
    limparMarkdownResidual(
      endereco ||
        'AO JUÍZO FEDERAL DA VARA DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DA COMARCA DE [CIDADE]/[UF]',
    ),
  )

  const timelineHtml = renderTimelineHtml(timeline)
  const temTimeline = Boolean(timelineHtml.trim())

  let tituloBruto = limparMarkdownResidual(
    titulo || 'AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE',
  )
  // Garante quebra antes de MATERNIDADE (evita corte no hífen pelo canvas)
  tituloBruto = tituloBruto.replace(/\s*SALÁRIO-MATERNIDADE\s*/gi, ' SALÁRIO-MATERNIDADE ')
  const tituloHtml = escapar(tituloBruto.trim())
    .replace(/SALÁRIO-MATERNIDADE/gi, 'SALÁRIO-<br/>MATERNIDADE')
    .replace(/SALÁRIO-\s*<br\/>\s*MATERNIDADE/gi, 'SALÁRIO-<br/>MATERNIDADE')

  // Remove menção órfã à timeline quando o usuário optou por não exibi-la
  let sinteseAntesLimpa = sinteseAntes || ''
  let sinteseDepoisLimpa = sinteseDepois || ''
  if (!temTimeline) {
    sinteseAntesLimpa = sinteseAntesLimpa
      .replace(/\s*A seguir,?\s+a linha do tempo[^\n.]*[.:]?\s*/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  // Fluxo CONTÍNUO (sem .sm-sheet com page-break): elimina páginas em branco
  // e rodapés no meio do texto. Rodapé é desenhado no jsPDF após a captura.
  const corpo = `
    ${cabecalhoSm(opts.adv)}
    <div class="sm-endereco">${escapar(enderecoTexto)}</div>
    ${metaBoxHtml(meta.tipoAcao, meta.juizoDigital, meta.prioridades)}
    ${parasHtml(qualificacao, 'sm-para-qualif')}
    <div class="sm-main-title">${tituloHtml}</div>
    <div class="sm-sub-title">${escapar(limparMarkdownResidual(subtitulo || '(SEGURADA ESPECIAL – AGRICULTORA)'))}</div>
    ${parasHtml(emFace)}
    ${sectionBar('I – PRELIMINARMENTE')}
    ${subheadComBarra(limparMarkdownResidual(prelimTitle))}
    ${parasHtml(prelimBody)}
    ${sectionBar('II – QUADRO SINÓPTICO')}
    ${quadroHtml(quadro)}
    ${sectionBar('III – SÍNTESE DO CONTEXTO FÁTICO')}
    ${parasHtml(sinteseAntesLimpa)}
    ${temTimeline ? timelineHtml : ''}
    ${parasHtml(sinteseDepoisLimpa)}
    ${sectionBar('IV – DAS PROVAS JUNTADAS AOS AUTOS')}
    ${provasHtml(provas)}
    ${parasHtml(provasFecho)}
    ${sectionBar('V – FUNDAMENTAÇÃO JURÍDICA')}
    ${parasHtml(fund)}
    ${sectionBar('VI – PEDIDO / REQUERIMENTOS')}
    ${pedidosHtml(pedidosP4.length ? pedidosP4 : pedidosAll, true)}
    ${pedidosP5.length ? pedidosHtml(pedidosP5, false) : ''}
    <div class="sm-fecho-bloco">
      ${assinaturas}
      ${planilhaHtml(planilha)}
    </div>
    ${notaDocumentoGeradoHtml()}
  `

  return `
    <style>${cssSmRural(opts.comMargens !== false)}</style>
    <div class="pdf-page sm-rural">
      ${corpo}
    </div>
  `
}
