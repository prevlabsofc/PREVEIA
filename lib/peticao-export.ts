/** Helpers compartilhados para exportação de petições (PDF/DOCX). */

export type EstiloPeticao = 'moderno' | 'classico'

export type DadosAdvogadoPeticao = {
  name?: string | null
  office_name?: string | null
  oab_number?: string | null
  oab_uf?: string | null
  email?: string | null
  whatsapp?: string | null
  phone?: string | null
  cidade?: string | null
  estado?: string | null
  /** Fallback legado (advogados públicos usam city/state). */
  city?: string | null
  state?: string | null
  logo_url?: string | null
  banner_url?: string | null
  signature_url?: string | null
  cor_peticao?: string | null
  estilo_peticao?: string | null
}

/** Margens forenses: esquerda/superior 3cm, direita/inferior 2cm. */
export const MARGEM_PETICAO_CM = {
  left: 3,
  top: 3,
  right: 2,
  bottom: 2,
} as const

/** 1 cm em pontos PDF (1 in = 2.54 cm = 72 pt). */
export const CM_EM_PT = 72 / 2.54

export const MARGEM_PETICAO_PT = {
  left: MARGEM_PETICAO_CM.left * CM_EM_PT,
  top: MARGEM_PETICAO_CM.top * CM_EM_PT,
  right: MARGEM_PETICAO_CM.right * CM_EM_PT,
  bottom: MARGEM_PETICAO_CM.bottom * CM_EM_PT,
} as const

/** Largura A4 em px na tela de export (~96dpi): 210mm. */
export const A4_WIDTH_PX = 794
export const A4_HEIGHT_PX = Math.round((297 / 210) * A4_WIDTH_PX)

export function normalizarEstiloPeticao(v: unknown): EstiloPeticao {
  return v === 'classico' ? 'classico' : 'moderno'
}

/** Resolve cidade/UF do advogado sem renderizar "undefined/MA". */
export function resolverLocalAdvogado(adv: DadosAdvogadoPeticao | null | undefined): {
  cidade: string
  uf: string
  localFormatado: string
} {
  let cidade = String(adv?.cidade || adv?.city || '').trim()
  let uf = String(adv?.estado || adv?.state || adv?.oab_uf || '')
    .trim()
    .toUpperCase()

  // Fallback sede MA: se não houver cidade cadastrada, usa São Luís/MA
  if (!cidade) {
    if (!uf || uf === 'MA') {
      cidade = 'São Luís'
      uf = 'MA'
    }
  }

  if (cidade && uf) return { cidade, uf, localFormatado: `${cidade}/${uf}` }
  if (cidade) return { cidade, uf, localFormatado: cidade }
  if (uf) return { cidade: '', uf, localFormatado: `[Cidade]/${uf}` }
  return { cidade: 'São Luís', uf: 'MA', localFormatado: 'São Luís/MA' }
}

export function dataPorExtenso(data = new Date()): string {
  return data.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatarLocalData(
  adv: DadosAdvogadoPeticao | null | undefined,
  data = new Date(),
): string {
  const { localFormatado } = resolverLocalAdvogado(adv)
  const dataTxt = dataPorExtenso(data)
  return `${localFormatado}, ${dataTxt}`
}

/**
 * Corrige placeholders de cidade vazia gerados pela IA
 * (ex.: "/MA" ou local/data só com UF) usando a cidade do escritório.
 */
export function corrigirLocalNoTexto(
  text: string,
  adv: DadosAdvogadoPeticao | null | undefined,
): string {
  const { cidade, uf, localFormatado } = resolverLocalAdvogado(adv)
  if (!uf) return text
  let out = text
  const ufEsc = uf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Linha de local/data só com UF: "MA, 16 de julho de 2025" → "São Luís/MA, …" ou "[Cidade]/MA, …"
  out = out.replace(
    new RegExp(
      `(^|\\n)(\\*{0,2})${ufEsc},(\\s+\\d{1,2}\\s+de\\s+[A-Za-zçÇáéíóúãõâêôàü]+\\s+de\\s+\\d{4})`,
      'gi',
    ),
    `$1$2${localFormatado},$3`,
  )

  if (cidade) {
    // "/MA" solto (sem cidade antes da barra) → "São Luís/MA"
    // Evita tocar em "OAB/MA" ou "886/2016/MA".
    out = out.replace(
      new RegExp(`(^|[^A-Za-zÀ-ÿ0-9])\\/${ufEsc}\\b`, 'g'),
      `$1${localFormatado}`,
    )
  } else {
    // "/MA" solto → "[Cidade]/MA"
    out = out.replace(
      new RegExp(`(^|[^A-Za-zÀ-ÿ0-9\\]])\\/${ufEsc}\\b`, 'g'),
      `$1[Cidade]/${uf}`,
    )
  }

  return out
}

function stripHeading(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\*{1,2}/, '')
    .replace(/\*{1,2}$/, '')
    .replace(/^[IVXLC]+[.\-–—)\s:]+/i, '')
    .replace(/^\d+(\.\d+)*[.\-–—)\s]+/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isHeading(line: string): boolean {
  const t = line.trim()
  return (
    /^#{1,6}\s+\S/.test(t) ||
    /^\*{0,2}\d+(\.\d+)*\s+[A-ZÀ-Ÿ]/.test(t) ||
    /^\*{0,2}[IVXLC]+\s*[–—\-.:)]\s+\S/.test(t)
  )
}

function headingLevel(line: string): number {
  const hashes = line.match(/^(#{1,6})\s/)
  if (hashes) return hashes[1].length
  if (/^\*{0,2}\d+\.\d+/.test(line.trim())) return 3
  if (/^\*{0,2}\d+\s/.test(line.trim())) return 2
  return 2
}

/** Remove títulos pai duplicados imediatamente antes do primeiro subitem. */
export function deduplicarHierarquiaTitulos(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i]
    const next = lines[i + 1]

    if (
      isHeading(cur) &&
      next &&
      isHeading(next) &&
      stripHeading(cur) === stripHeading(next) &&
      stripHeading(cur).length > 3
    ) {
      if (headingLevel(cur) <= headingLevel(next)) {
        out.push(cur)
        i++
        continue
      }
      continue
    }

    out.push(cur)
  }

  const final: string[] = []
  for (let i = 0; i < out.length; i++) {
    const prev = final[final.length - 1]
    const cur = out[i]
    if (
      prev &&
      isHeading(prev) &&
      cur.trim() &&
      stripHeading(prev) === stripHeading(cur) &&
      stripHeading(prev).length > 3
    ) {
      continue
    }
    final.push(cur)
  }
  return final.join('\n')
}

function escaparHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Remove marcadores markdown residuais do texto já parseado. */
export function limparMarkdownResidual(s: string): string {
  return s
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

/** Marca o bloco final (pede deferimento + local + assinatura) para alinhamento. */
export function marcarBlocoFinal(text: string): string {
  const re =
    /\n(?:(?:Nestes termos|Termos em que)[,.]?\s*\n+)?(?:Pede deferimento\.?)/i
  const idx = text.search(re)
  if (idx === -1) {
    const alt = text.search(
      /\n\*{0,2}[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+/i,
    )
    if (alt === -1) return text
    return fecharClosingAte(text, alt)
  }
  return fecharClosingAte(text, idx)
}

function fecharClosingAte(text: string, idx: number): string {
  let end = text.length
  const after = text.slice(idx)
  const cut = after.search(
    /\n(?:>\s|Esta petição foi elaborada|\*{0,2}"A proteção)/i,
  )
  if (cut > 0) end = idx + cut
  return `${text.slice(0, idx)}\n\n<<<CLOSING>>>\n${text.slice(idx + 1, end)}\n<<<END_CLOSING>>>${text.slice(end)}`
}

const BOX_TITULO_RE =
  /(S[IÍ]NTESE|QUADRO\s+SIN[OÓ]PTICO|PROVAS\s+JUNTADAS|FUNDAMENTA[CÇ][AÃ]O|DOS?\s+PEDIDOS?|PRELIMINARMENTE|PLANILHA|FUMUS|PERICULUM)/i

export function parseMarkdownToHtml(
  text: string,
  opts: { estilo?: EstiloPeticao; adv?: DadosAdvogadoPeticao } = {},
): string {
  const estilo = normalizarEstiloPeticao(opts.estilo)
  let html = corrigirLocalNoTexto(text, opts.adv)
  html = deduplicarHierarquiaTitulos(html)
  html = marcarBlocoFinal(html)

  const tableRegex = new RegExp(
    '\\|(.+)\\|\\n\\|[' + '-' + ':' + '\\s' + '|' + ']+\\|\\n((?:\\|.+\\|\\n?)+)',
    'g',
  )
  html = html.replace(tableRegex, (_match, header, rows) => {
    const headers = header.split('|').map((h: string) => h.trim()).filter(Boolean)
    const rowLines = rows
      .trim()
      .split('\n')
      .map((r: string) => r.split('|').map((c: string) => c.trim()).filter(Boolean))
    let table =
      '<div class="doc-table-wrap keep-together"><table class="doc-table"><thead><tr>'
    headers.forEach((h: string) => {
      table += `<th>${escaparHtml(limparMarkdownResidual(h))}</th>`
    })
    table += '</tr></thead><tbody>'
    rowLines.forEach((cells: string[], i: number) => {
      table += `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">`
      cells.forEach((c) => {
        table += `<td>${escaparHtml(limparMarkdownResidual(c))}</td>`
      })
      table += '</tr>'
    })
    table += '</tbody></table></div>'
    return table
  })

  html = html.replace(
    /<<<CLOSING>>>\n?/g,
    '<div class="closing-block keep-together">',
  )
  html = html.replace(/<<<END_CLOSING>>>/g, '</div>')

  const titleClean = (t: string) => escaparHtml(limparMarkdownResidual(String(t)))

  html = html.replace(/^#### (.+)$/gm, (_m, t) => {
    return `<div class="sub-sub-title">${titleClean(t)}</div>`
  })
  html = html.replace(/^### (.+)$/gm, (_m, t) => {
    return `<div class="sub-title">${titleClean(t)}</div>`
  })
  html = html.replace(/^## (.+)$/gm, (_m, t) => {
    const raw = limparMarkdownResidual(String(t))
    const isBox = BOX_TITULO_RE.test(raw)
    const cls = estilo === 'classico' ? 'section-classic' : 'section-bar'
    const titleHtml = `<div class="${cls}${isBox ? ' doc-box-title' : ''}">${escaparHtml(raw)}</div>`
    if (isBox) return `<<<BOX_START>>>${titleHtml}`
    return titleHtml
  })
  html = html.replace(/^# (.+)$/gm, (_m, t) => {
    return `<div class="main-title">${titleClean(t)}</div>`
  })

  html = html.replace(
    /^(\*{0,2})(\d+\.\d+(?:\.\d+)*)\s+(.+?)(\*{0,2})$/gm,
    (_m, _a, num, title) => {
      const raw = `${num} ${limparMarkdownResidual(String(title))}`
      const keep = /fumus|periculum/i.test(raw) ? ' keep-together' : ''
      return `<div class="sub-title${keep}">${escaparHtml(raw)}</div>`
    },
  )
  // Títulos soltos "Fumus boni iuris" / "Periculum in mora"
  html = html.replace(
    /^(\*{0,2})(Fumus\s+boni\s+iuris(?:\s*[\/·–—-]\s*Periculum\s+in\s+mora)?|Periculum\s+in\s+mora)(\*{0,2})\s*$/gim,
    (_m, _a, title) =>
      `<div class="sub-title keep-together">${escaparHtml(limparMarkdownResidual(String(title)))}</div>`,
  )
  html = html.replace(
    /^(\*{0,2})(\d+)\.\s+([A-ZÀ-Ÿ].+?)(\*{0,2})$/gm,
    (_m, _a, num, title) => {
      const raw = `${num}. ${limparMarkdownResidual(String(title))}`
      const isBox = BOX_TITULO_RE.test(raw)
      const cls = estilo === 'classico' ? 'section-classic' : 'section-bar'
      const titleHtml = `<div class="${cls}${isBox ? ' doc-box-title' : ''}">${escaparHtml(raw)}</div>`
      return isBox ? `<<<BOX_START>>>${titleHtml}` : titleHtml
    },
  )

  html = html.replace(/<<<BOX_START>>>/g, '<div class="doc-box keep-together">')
  html = fecharBoxes(html)

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^---$/gm, '<hr class="divider"/>')
  html = html.replace(
    /^✓ (.+)$/gm,
    '<div class="proof-item"><span class="check">✓</span>$1</div>',
  )
  html = html.replace(/^>\s?(.+)$/gm, '<blockquote class="doc-quote">$1</blockquote>')

  html = html
    .split('\n\n')
    .map((p) => {
      if (p.startsWith('<') || p.includes('<div')) return p
      if (!p.trim()) return ''
      if (/<(?:div|table|hr|blockquote)/.test(p)) {
        return p
          .split('\n')
          .map((line) => {
            if (!line.trim()) return ''
            if (line.startsWith('<')) return line
            return `<p class="doc-para">${line}</p>`
          })
          .join('')
      }
      return `<p class="doc-para">${p.replace(/\n/g, '<br/>')}</p>`
    })
    .join('')

  return html
}

function fecharBoxes(html: string): string {
  const parts = html.split(/(<div class="doc-box keep-together">)/)
  if (parts.length === 1) return html
  let result = parts[0]
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] === '<div class="doc-box keep-together">') {
      const body = parts[i + 1] || ''
      const cut = body.search(
        /<div class="(?:section-bar|section-classic|main-title|closing-block|doc-box)/,
      )
      if (cut === -1) {
        result += `<div class="doc-box keep-together">${body}</div>`
      } else {
        result += `<div class="doc-box keep-together">${body.slice(0, cut)}</div>${body.slice(cut)}`
      }
      i++
    } else {
      result += parts[i]
    }
  }
  return result
}

export function cssPeticao(opts: {
  estilo: EstiloPeticao
  corPeticao: string
  /** Se true, aplica padding de margem no .pdf-page (preview). Export PDF usa margem do jsPDF. */
  comMargens?: boolean
}): string {
  const { estilo, corPeticao } = opts
  const moderno = estilo === 'moderno'
  const comMargens = opts.comMargens !== false
  const pad = comMargens
    ? `padding: ${MARGEM_PETICAO_CM.top}cm ${MARGEM_PETICAO_CM.right}cm ${MARGEM_PETICAO_CM.bottom}cm ${MARGEM_PETICAO_CM.left}cm;`
    : 'padding: 0;'

  return `
    .pdf-page {
      font-family: 'Times New Roman', Times, serif;
      color: #1a1a1a;
      ${pad}
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      height: auto;
      min-height: 0;
    }
    .pdf-banner { width: 100%; max-height: 72px; object-fit: contain; object-position: left center; margin-bottom: 10px; display: block; }
    .pdf-header { display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #0A2540; padding-bottom: 14px; margin-bottom: 24px; page-break-inside: avoid; break-inside: avoid; }
    .pdf-header .logo { height: 50px; max-width: 180px; object-fit: contain; }
    .pdf-header .logo-fallback { height: 44px; width: 44px; border-radius: 8px; background: linear-gradient(135deg, #D4AF37, #B8941F); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size: 11px; color:#000; }
    .pdf-header .office-info { text-align:right; }
    .pdf-header .office-name { font-weight:bold; font-size: 13px; color:#0A2540; text-transform:uppercase; }
    .pdf-header .office-sub { font-size: 10px; color:#555; margin-top:2px; }
    .pdf-header .office-mail { font-size: 10px; color:${moderno ? '#1d4ed8' : '#333'}; margin-top:1px; }
    .section-bar { background: linear-gradient(135deg, ${corPeticao}, ${corPeticao}cc); color: #fff; font-weight: bold; font-size: 13px; padding: 8px 14px; margin: 22px 0 14px; border-left: 5px solid #D4AF37; text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; }
    .section-classic { color: #000; font-weight: bold; font-size: 13px; padding: 4px 0; margin: 22px 0 10px; text-transform: uppercase; text-decoration: underline; letter-spacing: 0.3px; border: none; background: none; page-break-after: avoid; break-after: avoid; }
    .sub-title { font-weight: bold; font-size: 12px; text-decoration: underline; margin: 14px 0 6px 16px; color:${moderno ? '#0A2540' : '#000'}; page-break-after: avoid; break-after: avoid; }
    .sub-sub-title { font-weight: bold; font-size: 11px; margin: 10px 0 4px 28px; color:#000; page-break-after: avoid; break-after: avoid; }
    .main-title { text-align:center; font-weight:bold; font-size:15px; text-transform:uppercase; margin: 18px 0; color:${moderno ? '#0A2540' : '#000'}; page-break-after: avoid; break-after: avoid; }
    p, .doc-para {
      font-size: 12px;
      line-height: 1.65;
      text-align: justify;
      margin: 0 0 10px;
      orphans: 3;
      widows: 3;
      page-break-inside: auto;
      break-inside: auto;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }
    strong { color: ${moderno ? '#0A2540' : '#000'}; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
    table.doc-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; font-size: 11px; }
    table.doc-table th { background: ${moderno ? '#0A2540' : '#000'}; color: #fff; padding: 7px 10px; text-align:left; font-size:10px; text-transform:uppercase; }
    table.doc-table td { padding: 6px 10px; border-bottom: 1px solid #e5e5e5; }
    table.doc-table tr.even td { background: ${moderno ? '#f4f6f9' : '#f5f5f5'}; }
    .proof-item { display:flex; align-items:center; gap:8px; font-size:12px; padding:6px 10px; margin-bottom:4px; background:${moderno ? '#f8f8f8' : 'transparent'}; border-left: 3px solid ${moderno ? '#D4AF37' : '#000'}; page-break-inside: avoid; break-inside: avoid; }
    .proof-item .check { color:${moderno ? '#D4AF37' : '#000'}; font-weight:bold; }
    .doc-box { ${moderno
      ? 'border: 1px solid #c5d0e0; background: #f8fafc; padding: 12px 14px; margin: 16px 0; border-radius: 4px;'
      : 'border: 1px solid #000; background: transparent; padding: 10px 12px; margin: 16px 0;'}
      page-break-inside: avoid; break-inside: avoid;
    }
    .doc-box .section-bar, .doc-box .section-classic { margin-top: 0; }
    .doc-table-wrap { page-break-inside: avoid; break-inside: avoid; }
    .closing-block { text-align: right; margin-top: 36px; margin-left: auto; max-width: 58%; page-break-inside: avoid; break-inside: avoid; }
    .closing-block p { text-align: right; margin-bottom: 6px; }
    .closing-block strong { color: #000; }
    .doc-quote { font-size: 11px; color: #444; border-left: 2px solid #ccc; padding-left: 10px; margin: 12px 0; font-style: italic; text-align: left; }
    .pdf-footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ccc; display:flex; justify-content:space-between; font-size: 9px; color: #888; page-break-inside: avoid; break-inside: avoid; }
    .pdf-page-spacer { width: 100%; display: block; pointer-events: none; }
    .keep-together { page-break-inside: avoid; break-inside: avoid; }
  `
}

export function montarCabecalhoHtml(adv: DadosAdvogadoPeticao): string {
  const nomeEscritorio = String(adv.office_name || adv.name || 'Advogado')
  const oabUf = String(adv.oab_uf || adv.estado || '').toUpperCase()
  const oabNum = String(adv.oab_number || '')
  const email = String(adv.email || '')
  const phone = String(adv.whatsapp || adv.phone || '')
  const banner = adv.banner_url
    ? `<img src="${escaparHtml(String(adv.banner_url))}" class="pdf-banner" alt="Timbre"/>`
    : ''
  const fallbackLogo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/logo.png`
      : '/logo.png'
  const logo = adv.logo_url
    ? `<img src="${escaparHtml(String(adv.logo_url))}" class="logo" alt="Logo"/>`
    : `<img src="${fallbackLogo}" class="logo" alt="Marple"/>`

  return `
    ${banner}
    <div class="pdf-header keep-together">
      ${logo}
      <div class="office-info">
        <div class="office-name">${escaparHtml(nomeEscritorio)}</div>
        <div class="office-sub">OAB/${escaparHtml(oabUf)} nº ${escaparHtml(oabNum)}</div>
        ${email ? `<div class="office-mail">${escaparHtml(email)}</div>` : ''}
        ${phone ? `<div class="office-mail">${escaparHtml(phone)}</div>` : ''}
      </div>
    </div>
  `
}

export function montarHtmlPeticao(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  estilo: EstiloPeticao
  corPeticao?: string
  comMargens?: boolean
}): string {
  const estilo = normalizarEstiloPeticao(opts.estilo)
  const corPeticao = opts.corPeticao || String(opts.adv.cor_peticao || '#1d4ed8')
  const bodyHtml = parseMarkdownToHtml(opts.text, { estilo, adv: opts.adv })
  const nomeEscritorio = String(opts.adv.office_name || opts.adv.name || 'Advogado')

  return `
    <style>${cssPeticao({ estilo, corPeticao, comMargens: opts.comMargens })}</style>
    <div class="pdf-page">
      ${montarCabecalhoHtml(opts.adv)}
      <div class="pdf-body">${bodyHtml}</div>
      <div class="pdf-footer">
        <span>${escaparHtml(nomeEscritorio)}</span>
        <span>Gerado via Marple</span>
      </div>
    </div>
  `
}

/**
 * Empurra blocos que não cabem no espaço restante da página.
 * Também protege parágrafos curtos/médios e títulos contra corte mid-linha
 * no fatiamento de canvas (fallback). Preferir jsPDF.html autoPaging:'text'.
 */
export function aplicarQuebrasHibridas(
  root: HTMLElement,
  pageHeightPx: number,
): void {
  const maxKeep = pageHeightPx * 0.92

  const relTop = (el: HTMLElement) => {
    const er = el.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    return er.top - rr.top + root.scrollTop
  }

  const pushIfNeeded = (el: HTMLElement) => {
    const top = relTop(el)
    const h = el.offsetHeight
    if (h <= 0) return
    const posInPage = ((top % pageHeightPx) + pageHeightPx) % pageHeightPx
    const remaining = pageHeightPx - posInPage

    if (h <= maxKeep && h > remaining + 2) {
      const spacer = document.createElement('div')
      spacer.className = 'pdf-page-spacer'
      spacer.style.height = `${remaining}px`
      spacer.setAttribute('aria-hidden', 'true')
      el.parentNode?.insertBefore(spacer, el)
    }
  }

  const processKeep = (el: HTMLElement) => {
    const top = relTop(el)
    const h = el.offsetHeight
    if (h <= 0) return
    const posInPage = ((top % pageHeightPx) + pageHeightPx) % pageHeightPx
    const remaining = pageHeightPx - posInPage

    if (h <= maxKeep && h > remaining + 2) {
      pushIfNeeded(el)
      return
    }

    if (h > maxKeep) {
      const header = el.querySelector(
        '.section-bar, .section-classic, .doc-box-title',
      ) as HTMLElement | null
      if (!header) return
      const next = header.nextElementSibling as HTMLElement | null
      if (!next) return
      const group = document.createElement('div')
      group.className = 'keep-together'
      header.parentNode?.insertBefore(group, header)
      group.appendChild(header)
      group.appendChild(next)
      pushIfNeeded(group)
    }
  }

  const selector =
    '.doc-box.keep-together, .doc-table-wrap.keep-together, .closing-block.keep-together, .keep-together, .pdf-header'
  const initial = Array.from(root.querySelectorAll(selector)) as HTMLElement[]
  for (const el of initial) {
    processKeep(el)
  }

  // Parágrafos e títulos: evita corte horizontal mid-bloco quando cabem na página seguinte
  const blocks = Array.from(
    root.querySelectorAll(
      'p.doc-para, p, .section-bar, .section-classic, .sub-title, .sub-sub-title, .main-title, .proof-item',
    ),
  ) as HTMLElement[]
  for (const el of blocks) {
    if (el.closest('.keep-together, .doc-box, .closing-block')) continue
    const h = el.offsetHeight
    if (h <= 0 || h > maxKeep) continue
    pushIfNeeded(el)
  }
}

export function pageHeightPxForContainer(containerWidthPx: number): number {
  return (297 / 210) * containerWidthPx
}

/**
 * Remove páginas finais em branco geradas pelo jsPDF.html (autoPaging +
 * page-break CSS costumam deixar 1 folha vazia no fim).
 * Estima o máximo razoável a partir das folhas `.sm-sheet` ou da altura do DOM.
 */
export function trimPaginasFinaisEmBranco(
  pdf: { getNumberOfPages: () => number; deletePage: (n: number) => void },
  pageEl: HTMLElement,
): void {
  const total = pdf.getNumberOfPages()
  if (total <= 1) return

  const pageH = pageHeightPxForContainer(pageEl.clientWidth || A4_WIDTH_PX)
  // Conservador: subestima a área útil → estima mais páginas → evita apagar conteúdo real
  const usable = Math.max(350, pageH * 0.62)

  const sheets = Array.from(pageEl.querySelectorAll('.sm-sheet')) as HTMLElement[]
  let estimado: number
  if (sheets.length > 0) {
    estimado = 0
    for (const s of sheets) {
      const h = Math.max(s.offsetHeight, 1)
      // Folhas quase vazias (só topo+rodapé) não contam como página de conteúdo
      const body = s.querySelector('.sm-body') as HTMLElement | null
      const bodyText = (body?.innerText || '').replace(/\s+/g, ' ').trim()
      if (bodyText.length < 8 && h < usable * 0.25) continue
      estimado += Math.max(1, Math.ceil(h / usable))
    }
    estimado = Math.max(1, estimado)
  } else {
    const h = Math.max(pageEl.scrollHeight, pageEl.offsetHeight, 1)
    estimado = Math.max(1, Math.ceil(h / usable))
  }

  let n = pdf.getNumberOfPages()
  // Extras claros (2+ além da estimativa)
  while (n > estimado + 1 && n > 1) {
    pdf.deletePage(n)
    n--
  }

  // Caso clássico: exatamente 1 página a mais que a estimativa.
  n = pdf.getNumberOfPages()
  if (n === estimado + 1 && n > 1) {
    const last = sheets.length ? sheets[sheets.length - 1] : pageEl
    const lastH = last?.offsetHeight || pageEl.scrollHeight
    if (lastH > 0 && lastH <= usable * 0.92) {
      pdf.deletePage(n)
    }
  }
}

/** Altura útil do conteúdo (A4 menos margens) na mesma escala do container. */
export function contentHeightPxForContainer(containerWidthPx: number): number {
  const pageH = pageHeightPxForContainer(containerWidthPx)
  const pxPerCm = containerWidthPx / 21
  return (
    pageH -
    (MARGEM_PETICAO_CM.top + MARGEM_PETICAO_CM.bottom) * pxPerCm
  )
}

/** Prepara o texto bruto para exportação (cidade + hierarquia). */
export function prepararTextoPeticao(
  text: string,
  adv?: DadosAdvogadoPeticao | null,
): string {
  return deduplicarHierarquiaTitulos(corrigirLocalNoTexto(text, adv))
}

/** Margens DOCX em twips (1 cm ≈ 567 twips). */
export function margensDocxTwips() {
  const twip = 567
  return {
    top: Math.round(MARGEM_PETICAO_CM.top * twip),
    right: Math.round(MARGEM_PETICAO_CM.right * twip),
    bottom: Math.round(MARGEM_PETICAO_CM.bottom * twip),
    left: Math.round(MARGEM_PETICAO_CM.left * twip),
  }
}
