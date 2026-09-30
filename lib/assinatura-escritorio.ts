/**
 * Imagem da assinatura do advogado (bucket privado `signatures`), usada no
 * espaço entre "Cidade/UF, data." e o traço da assinatura (PDF e DOCX).
 *
 * Isomórfico: recebe um SupabaseClient autenticado como o próprio usuário
 * (browser client no cliente; `sessaoDaRequisicao` no servidor). O download
 * passa por RLS — cada usuário só lê a própria pasta `<uid>/`.
 * A imagem volta em base64/data-URL para não depender de CORS no html2canvas.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const SIGNATURES_BUCKET = 'signatures'
export const ASSINATURA_MAX_BYTES = 3 * 1024 * 1024
/** Espaço vertical reservado entre a linha local/data e o traço. */
export const ASSINATURA_ESPACO_CM = 2.5
export const ASSINATURA_MAX_ALTURA_CM = 2.2
export const ASSINATURA_MAX_LARGURA_CM = 7

const PX_POR_CM = 96 / 2.54

export type AssinaturaEscritorio = {
  bytes: Uint8Array
  /** Base64 puro (sem prefixo data:). */
  base64: string
  /** `data:image/png;base64,...` */
  dataUrl: string
  /** Dimensões de exibição a 96 dpi (altura ≤ 2,2 cm, largura ≤ 7 cm, proporção preservada). */
  widthPx: number
  heightPx: number
  widthCm: number
  heightCm: number
  /** Dimensões originais do PNG. */
  naturalWidthPx: number
  naturalHeightPx: number
}

/** Path no bucket a partir do valor salvo em `lawyers.signature_url` (path ou URL antiga do Storage). */
export function caminhoAssinaturaStorage(valor: string | null | undefined): string | null {
  const v = String(valor || '').trim()
  if (!v || v.startsWith('data:')) return null
  let path = v
  if (/^https?:\/\//i.test(v)) {
    const m = v.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/signatures\/([^?#]+)/)
    if (!m) return null
    path = decodeURIComponent(m[1])
  }
  path = path.replace(/^\/+/, '')
  if (!path || path.includes('..')) return null
  return path
}

/** Dimensões do PNG (IHDR) ou null se os bytes não forem PNG. */
export function dimensoesPng(bytes: Uint8Array): { w: number; h: number } | null {
  const isPng =
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  if (!isPng) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const w = dv.getUint32(16)
  const h = dv.getUint32(20)
  return w > 0 && h > 0 ? { w, h } : null
}

/** Encaixa a imagem em altura ≤ 2,2 cm e largura ≤ 7 cm, sem distorcer. */
export function dimensionarAssinatura(
  naturalW: number,
  naturalH: number,
): { widthPx: number; heightPx: number; widthCm: number; heightCm: number } {
  const ratio = naturalW / naturalH
  let hCm = ASSINATURA_MAX_ALTURA_CM
  let wCm = hCm * ratio
  if (wCm > ASSINATURA_MAX_LARGURA_CM) {
    wCm = ASSINATURA_MAX_LARGURA_CM
    hCm = wCm / ratio
  }
  return {
    widthPx: Math.max(1, Math.round(wCm * PX_POR_CM)),
    heightPx: Math.max(1, Math.round(hCm * PX_POR_CM)),
    widthCm: Math.round(wCm * 1000) / 1000,
    heightCm: Math.round(hCm * 1000) / 1000,
  }
}

function paraBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)))
  }
  return btoa(bin)
}

/** Valida PNG (magic number + limite de tamanho) e monta o objeto de assinatura. */
export function assinaturaDeBytesPng(bytes: Uint8Array): AssinaturaEscritorio | null {
  if (bytes.length > ASSINATURA_MAX_BYTES) return null
  const dim = dimensoesPng(bytes)
  if (!dim) return null
  const base64 = paraBase64(bytes)
  return {
    bytes,
    base64,
    dataUrl: `data:image/png;base64,${base64}`,
    ...dimensionarAssinatura(dim.w, dim.h),
    naturalWidthPx: dim.w,
    naturalHeightPx: dim.h,
  }
}

/**
 * Carrega a assinatura do advogado `lawyerId` (= `lawyers.id` = `auth.uid()`).
 * Passe `signatureUrl` quando já tiver a linha de `lawyers` em mãos para
 * evitar uma consulta. Retorna null se não houver assinatura, se o arquivo não
 * for PNG válido ou em qualquer falha (a petição segue com o espaço em branco).
 */
export async function carregarAssinaturaEscritorio(
  supabase: SupabaseClient,
  lawyerId: string,
  opts: { signatureUrl?: string | null } = {},
): Promise<AssinaturaEscritorio | null> {
  try {
    let valor = opts.signatureUrl
    if (valor === undefined) {
      const { data, error } = await supabase
        .from('lawyers')
        .select('signature_url')
        .eq('id', lawyerId)
        .maybeSingle()
      if (error) return null
      valor = (data?.signature_url as string | null) ?? null
    }
    const path = caminhoAssinaturaStorage(valor)
    if (!path) return null
    const { data: blob, error } = await supabase.storage.from(SIGNATURES_BUCKET).download(path)
    if (error || !blob) return null
    return assinaturaDeBytesPng(new Uint8Array(await blob.arrayBuffer()))
  } catch (err) {
    console.error('[assinatura-escritorio]', err)
    return null
  }
}
