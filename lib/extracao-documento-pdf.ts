/** Extração estruturada de PDFs jurídicos longos via Claude (document block). */

export const EXTRACAO_PDF_AGENT_TYPE = 'extracao-pdf'

/** Limite seguro do PDF bruto (~24 MB) — base64 infla ~33% e o Claude limita o request a 32 MB. */
export const EXTRACAO_PDF_MAX_BYTES = 24 * 1024 * 1024

/**
 * Limite de páginas por request no Claude (contexto < 1M tokens).
 * Documentos densos podem falhar antes disso por contexto.
 */
export const EXTRACAO_PDF_MAX_PAGINAS = 100

/** sessionStorage: contexto formatado para pré-preencher /agentes */
export const EXTRACAO_PETICAO_KEY = 'marple_extracao_peticao'

/** sessionStorage: contexto para /newsletter */
export const EXTRACAO_NEWSLETTER_KEY = 'marple_extracao_newsletter'

export type ExtracaoParte = {
  nome: string
  papel: string
}

export type ExtracaoDatas = {
  distribuicao?: string | null
  julgamento?: string | null
  publicacao?: string | null
  outras?: { rotulo: string; data: string }[]
}

export type ExtracaoDocumentoPdf = {
  partes: ExtracaoParte[]
  numero_processo: string | null
  teses: string[]
  decisao: string | null
  datas: ExtracaoDatas
  resumo: string | null
}

export type DocExtracaoLista = {
  id: string
  title?: string | null
  client_id?: string | null
  client_name?: string | null
  file_url?: string | null
  created_at: string
  extracao_json?: ExtracaoDocumentoPdf | null
  agent_type?: string | null
}

export function normalizarExtracao(raw: unknown): ExtracaoDocumentoPdf | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  const partes: ExtracaoParte[] = Array.isArray(o.partes)
    ? o.partes
        .map((p) => {
          if (!p || typeof p !== 'object') return null
          const r = p as Record<string, unknown>
          const nome = String(r.nome || '').trim()
          const papel = String(r.papel || '').trim() || 'parte'
          if (!nome) return null
          return { nome, papel }
        })
        .filter((p): p is ExtracaoParte => Boolean(p))
    : []

  const teses = Array.isArray(o.teses)
    ? o.teses.map((t) => String(t || '').trim()).filter(Boolean)
    : []

  const datasRaw = (o.datas && typeof o.datas === 'object' ? o.datas : {}) as Record<string, unknown>
  const outras = Array.isArray(datasRaw.outras)
    ? datasRaw.outras
        .map((d) => {
          if (!d || typeof d !== 'object') return null
          const r = d as Record<string, unknown>
          const rotulo = String(r.rotulo || '').trim()
          const data = String(r.data || '').trim()
          if (!rotulo || !data) return null
          return { rotulo, data }
        })
        .filter((d): d is { rotulo: string; data: string } => Boolean(d))
    : []

  return {
    partes,
    numero_processo: o.numero_processo != null ? String(o.numero_processo).trim() || null : null,
    teses,
    decisao: o.decisao != null ? String(o.decisao).trim() || null : null,
    datas: {
      distribuicao: datasRaw.distribuicao != null ? String(datasRaw.distribuicao).trim() || null : null,
      julgamento: datasRaw.julgamento != null ? String(datasRaw.julgamento).trim() || null : null,
      publicacao: datasRaw.publicacao != null ? String(datasRaw.publicacao).trim() || null : null,
      outras,
    },
    resumo: o.resumo != null ? String(o.resumo).trim() || null : null,
  }
}

/** Texto longo para inserir na sessão de petição ou área de transferência. */
export function formatarExtracaoParaPeticao(e: ExtracaoDocumentoPdf): string {
  const linhas: string[] = ['EXTRAÇÃO DE DOCUMENTO PDF', '']
  if (e.numero_processo) linhas.push(`Processo: ${e.numero_processo}`)
  if (e.partes.length) {
    linhas.push('Partes:')
    for (const p of e.partes) linhas.push(`- ${p.papel}: ${p.nome}`)
  }
  if (e.teses.length) {
    linhas.push('', 'Teses:')
    e.teses.forEach((t, i) => linhas.push(`${i + 1}. ${t}`))
  }
  if (e.decisao) linhas.push('', `Decisão: ${e.decisao}`)
  const datas: string[] = []
  if (e.datas.distribuicao) datas.push(`Distribuição: ${e.datas.distribuicao}`)
  if (e.datas.julgamento) datas.push(`Julgamento: ${e.datas.julgamento}`)
  if (e.datas.publicacao) datas.push(`Publicação: ${e.datas.publicacao}`)
  for (const o of e.datas.outras || []) datas.push(`${o.rotulo}: ${o.data}`)
  if (datas.length) linhas.push('', 'Datas:', ...datas.map((d) => `- ${d}`))
  if (e.resumo) linhas.push('', 'Resumo:', e.resumo)
  return linhas.join('\n').trim()
}

/** Rascunho inicial para o composer da newsletter. */
export function formatarExtracaoParaNewsletter(e: ExtracaoDocumentoPdf): {
  assunto: string
  conteudo: string
  tese: string
} {
  const assunto = e.numero_processo
    ? `Destaque jurisprudencial — processo ${e.numero_processo}`
    : e.resumo
      ? e.resumo.slice(0, 80)
      : 'Destaque a partir de decisão judicial'
  const tese = [e.teses.join('; '), e.decisao, e.resumo].filter(Boolean).join('\n\n').slice(0, 2000)
  const conteudo = formatarExtracaoParaPeticao(e)
  return { assunto, conteudo, tese }
}

/** Prefill de campos comuns em /agentes a partir da extração. */
export function mapearExtracaoParaFormulario(
  e: ExtracaoDocumentoPdf,
  extras?: { clienteId?: string; clienteNome?: string; clienteCPF?: string }
): Record<string, string> {
  const autor = e.partes.find((p) => /autor|requerente|apelante|recorrente|impetrante/i.test(p.papel))
  const nome = extras?.clienteNome || autor?.nome || e.partes[0]?.nome || ''
  return {
    ...(extras?.clienteId ? { clienteId: extras.clienteId } : {}),
    ...(nome ? { nome } : {}),
    ...(extras?.clienteCPF ? { cpf: extras.clienteCPF } : {}),
    ...(e.numero_processo ? { numero_processo: e.numero_processo, nb: e.numero_processo } : {}),
    ...(e.resumo ? { observacoes: e.resumo } : {}),
    ...(e.decisao ? { motivo_inss: e.decisao.slice(0, 500) } : {}),
  }
}

export function salvarContextoPeticao(payload: {
  extracao: ExtracaoDocumentoPdf
  texto: string
  formPrefill: Record<string, string>
  clientId?: string | null
  clientName?: string | null
}) {
  try {
    sessionStorage.setItem(EXTRACAO_PETICAO_KEY, JSON.stringify(payload))
  } catch { /* private mode */ }
}

export function consumirContextoPeticao(): {
  extracao: ExtracaoDocumentoPdf
  texto: string
  formPrefill: Record<string, string>
  clientId?: string | null
  clientName?: string | null
} | null {
  try {
    const raw = sessionStorage.getItem(EXTRACAO_PETICAO_KEY)
    sessionStorage.removeItem(EXTRACAO_PETICAO_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const extracao = normalizarExtracao(parsed?.extracao)
    if (!extracao) return null
    return {
      extracao,
      texto: typeof parsed.texto === 'string' ? parsed.texto : formatarExtracaoParaPeticao(extracao),
      formPrefill: parsed.formPrefill && typeof parsed.formPrefill === 'object' ? parsed.formPrefill : {},
      clientId: parsed.clientId ?? null,
      clientName: parsed.clientName ?? null,
    }
  } catch {
    return null
  }
}

export function salvarContextoNewsletter(payload: {
  assunto: string
  conteudo: string
  tese: string
}) {
  try {
    sessionStorage.setItem(EXTRACAO_NEWSLETTER_KEY, JSON.stringify(payload))
  } catch { /* private mode */ }
}

export function consumirContextoNewsletter(): {
  assunto: string
  conteudo: string
  tese: string
} | null {
  try {
    const raw = sessionStorage.getItem(EXTRACAO_NEWSLETTER_KEY)
    sessionStorage.removeItem(EXTRACAO_NEWSLETTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      assunto: String(parsed.assunto || ''),
      conteudo: String(parsed.conteudo || ''),
      tese: String(parsed.tese || ''),
    }
  } catch {
    return null
  }
}
