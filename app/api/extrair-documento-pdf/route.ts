import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { carregarMembrosEscritorio } from '@/lib/equipe'
import { sessaoComAcesso } from '@/lib/permissions/sessao'
import {
  EXTRACAO_PDF_AGENT_TYPE,
  EXTRACAO_PDF_MAX_BYTES,
  EXTRACAO_PDF_MAX_PAGINAS,
  normalizarExtracao,
  type ExtracaoDocumentoPdf,
} from '@/lib/extracao-documento-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Pro/Enterprise: até 300s. Hobby: 60s — PDFs longos podem estourar no plano gratuito. */
export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PROMPT = `Você analisa um documento jurídico brasileiro em PDF (sentença, acórdão, petição, decisão administrativa ou similar).

Extraia APENAS informações presentes no documento. Não invente dados.

Responda APENAS com JSON válido (sem markdown), neste formato exato:
{
  "partes": [{"nome":"...","papel":"autor|réu|apelante|apelado|recorrente|recorrido|impetrante|impetrado|terceiro|outro"}],
  "numero_processo": "número CNJ ou administrativo, ou null",
  "teses": ["tese jurídica 1", "tese 2"],
  "decisao": "dispositivo / resultado da decisão, ou null se for só petição",
  "datas": {
    "distribuicao": "DD/MM/AAAA ou null",
    "julgamento": "DD/MM/AAAA ou null",
    "publicacao": "DD/MM/AAAA ou null",
    "outras": [{"rotulo":"...","data":"DD/MM/AAAA"}]
  },
  "resumo": "resumo objetivo em até 8 frases do que o documento trata e decide/pede"
}

Regras:
- Português brasileiro.
- teses: no máximo 8 itens, objetivos.
- Se um campo não existir, use null ou lista vazia.
- Foque nas partes processuais, número do processo, pedidos/teses e dispositivo.`

function extrairJsonBruto(texto: string): unknown | null {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(limpo)
  } catch { /* fallthrough */ }
  const m = limpo.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0].replace(/[\x00-\x1F\x7F]/g, ' '))
  } catch {
    return null
  }
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/provas/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

async function baixarPdfBytes(opts: {
  fileUrl?: string | null
  storagePath?: string | null
}): Promise<{ bytes: Buffer } | { error: string; status: number }> {
  let path = opts.storagePath?.trim() || null
  if (!path && opts.fileUrl) path = storagePathFromPublicUrl(opts.fileUrl)
  if (!path) {
    return { error: 'Caminho do PDF no armazenamento não encontrado. Reenvie o arquivo.', status: 400 }
  }
  const { data, error } = await supabaseAdmin.storage.from('provas').download(path)
  if (error || !data) {
    return { error: 'Não foi possível baixar o PDF do armazenamento.', status: 502 }
  }
  const bytes = Buffer.from(await data.arrayBuffer())
  return { bytes }
}

async function contarPaginas(buf: Buffer): Promise<number | null> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const parsed = await pdfParse(buf)
    return typeof parsed.numpages === 'number' ? parsed.numpages : null
  } catch {
    return null
  }
}

async function chamarClaude(base64: string): Promise<ExtracaoDocumentoPdf> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        },
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Resposta inválida da IA.')
  }
  const bruto = extrairJsonBruto(content.text)
  const normalizado = normalizarExtracao(bruto)
  if (!normalizado) {
    throw new Error('A IA não retornou um JSON estruturado válido.')
  }
  return normalizado
}

/**
 * Extrai dados de PDF jurídico já armazenado no Storage (ou aceita document_id).
 * Fluxo preferido: upload client → Storage → POST { document_id } — evita limite
 * de body ~4,5 MB da Vercel no Hobby.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip, 8, 60000)) {
      return Response.json(
        { error: 'Muitas requisições. Aguarde um minuto e tente novamente.' },
        { status: 429 }
      )
    }

    const contexto = await sessaoComAcesso(req)
    if (!contexto) {
      return Response.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
    }
    const { sessao, acesso } = contexto
    const userId = sessao.user.id

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'API de IA não configurada.' }, { status: 503 })
    }

    const body = await req.json().catch(() => ({}))
    const documentId = typeof body?.document_id === 'string' ? body.document_id.trim() : ''
    if (!documentId || !UUID.test(documentId)) {
      return Response.json(
        { error: 'Informe um document_id válido. Faça o upload do PDF antes da extração.' },
        { status: 400 }
      )
    }

    const membros = await carregarMembrosEscritorio(supabaseAdmin, userId)
    const idsEscritorio = membros.map((m) => m.id)
    if (!idsEscritorio.includes(userId)) idsEscritorio.push(userId)

    const { data: doc, error: docErr } = await supabaseAdmin
      .from('documents')
      .select('id, lawyer_id, client_id, file_url, mime_type, agent_type, title, form_data')
      .eq('id', documentId)
      .maybeSingle()

    if (docErr || !doc) {
      return Response.json({ error: 'Documento não encontrado.' }, { status: 404 })
    }
    if (!idsEscritorio.includes(doc.lawyer_id as string)) {
      return Response.json({ error: 'Sem permissão para este documento.' }, { status: 403 })
    }
    if (!acesso.acessoTotal && !acesso.legado && doc.lawyer_id !== userId) {
      return Response.json({ error: 'Sem permissão para extrair este documento.' }, { status: 403 })
    }

    const formData = (doc.form_data && typeof doc.form_data === 'object'
      ? doc.form_data
      : {}) as Record<string, unknown>
    const storagePathBody = typeof body?.storage_path === 'string' ? body.storage_path.trim() : ''
    const storagePathRaw =
      storagePathBody ||
      (typeof formData.storage_path === 'string' ? formData.storage_path : null)

    // Path deve começar com id de membro do escritório (mesmo padrão do bucket provas).
    let storagePath: string | null = storagePathRaw
    if (storagePath) {
      const donoPath = storagePath.split('/')[0]
      if (!idsEscritorio.includes(donoPath)) {
        return Response.json({ error: 'Caminho de armazenamento fora do escopo do escritório.' }, { status: 403 })
      }
    }

    if (!doc.file_url && !storagePath) {
      return Response.json(
        { error: 'Este documento não tem arquivo PDF vinculado. Reenvie o upload.' },
        { status: 400 }
      )
    }

    const download = await baixarPdfBytes({
      fileUrl: (doc.file_url as string) || null,
      storagePath,
    })
    if ('error' in download) {
      return Response.json({ error: download.error }, { status: download.status })
    }

    const { bytes } = download
    if (bytes.length === 0) {
      return Response.json({ error: 'O arquivo PDF está vazio.' }, { status: 400 })
    }
    if (bytes.length > EXTRACAO_PDF_MAX_BYTES) {
      return Response.json({
        error: `PDF muito grande (${(bytes.length / (1024 * 1024)).toFixed(1)} MB). Limite: ${EXTRACAO_PDF_MAX_BYTES / (1024 * 1024)} MB (Claude ~32 MB no request com base64). Divida o arquivo ou reduza a qualidade.`,
        limites: {
          max_bytes: EXTRACAO_PDF_MAX_BYTES,
          max_paginas: EXTRACAO_PDF_MAX_PAGINAS,
          nota: 'Upload via Storage evita o limite de body da Vercel (~4,5 MB no Hobby). Timeout serverless: até 300s (Pro) / 60s (Hobby). Claude: até ~100 páginas por request.',
        },
      }, { status: 413 })
    }

    const paginas = await contarPaginas(bytes)
    if (paginas != null && paginas > EXTRACAO_PDF_MAX_PAGINAS) {
      return Response.json({
        error: `PDF com ${paginas} páginas. O Claude processa no máximo ${EXTRACAO_PDF_MAX_PAGINAS} páginas por request. Divida o documento (ex.: dispositivo + fundamentação relevante) e tente novamente.`,
        paginas,
        max_paginas: EXTRACAO_PDF_MAX_PAGINAS,
      }, { status: 413 })
    }

    const base64 = bytes.toString('base64')
    let extracao: ExtracaoDocumentoPdf
    try {
      extracao = await chamarClaude(base64)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha na análise do PDF'
      const lower = msg.toLowerCase()
      if (lower.includes('too large') || lower.includes('32') || lower.includes('request_too_large')) {
        return Response.json({
          error: 'O PDF excedeu o tamanho aceito pela API Claude (~32 MB no request). Reduza o arquivo.',
        }, { status: 413 })
      }
      if (lower.includes('timeout') || lower.includes('timed out')) {
        return Response.json({
          error: 'A análise demorou demais (timeout). Tente um PDF menor ou com menos páginas.',
        }, { status: 504 })
      }
      return Response.json({ error: `Falha na extração: ${msg}` }, { status: 502 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('documents')
      .update({
        extracao_json: extracao,
        agent_type: doc.agent_type || EXTRACAO_PDF_AGENT_TYPE,
        content: extracao.resumo || `Extração PDF: ${doc.title || documentId}`,
        status: 'extracted',
      })
      .eq('id', documentId)

    if (updErr) {
      // Coluna ainda não migrada — devolve resultado sem persistir.
      if (/extracao_json/i.test(updErr.message)) {
        return Response.json({
          ok: true,
          document_id: documentId,
          extracao,
          persistido: false,
          aviso: 'Extração concluída, mas a coluna extracao_json ainda não existe no banco. Rode a migration 20260727_documents_extracao_json.sql.',
          paginas,
        })
      }
      return Response.json({
        ok: true,
        document_id: documentId,
        extracao,
        persistido: false,
        aviso: `Extração ok, mas falhou ao salvar: ${updErr.message}`,
        paginas,
      })
    }

    return Response.json({
      ok: true,
      document_id: documentId,
      extracao,
      persistido: true,
      paginas,
      limites: {
        max_bytes: EXTRACAO_PDF_MAX_BYTES,
        max_paginas: EXTRACAO_PDF_MAX_PAGINAS,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro interno na extração'
    return Response.json({ error: msg }, { status: 500 })
  }
}
