import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type FeedItem = {
  tribunal?: string
  tipo?: string
  numero?: string
  assunto: string
  ementa: string
  relevancia?: number
  data_julgamento?: string | null
  url_original?: string | null
  chave_externa?: string | null
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function autorizar(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.replace(/^Bearer\s+/i, '').trim()
  const header = req.headers.get('x-cron-secret') || ''
  // Vercel Cron envia Authorization: Bearer <CRON_SECRET> quando configurado.
  return bearer === secret || header === secret
}

function chaveDe(item: FeedItem): string {
  if (item.chave_externa) return item.chave_externa
  const base = [
    (item.tribunal || '').trim().toUpperCase(),
    (item.numero || '').trim(),
    (item.assunto || '').trim().toLowerCase(),
  ].join('|')
  return createHash('sha256').update(base || item.ementa.slice(0, 200)).digest('hex').slice(0, 40)
}

async function carregarFeed(): Promise<FeedItem[]> {
  const feedUrl = process.env.JURISPRUDENCIA_FEED_URL
  if (!feedUrl) return []
  const res = await fetch(feedUrl, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Feed HTTP ${res.status}`)
  const data = await res.json()
  const lista = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
  return lista.filter((x: FeedItem) => x?.assunto && x?.ementa) as FeedItem[]
}

async function sincronizar() {
  const supabase = admin()
  const agora = new Date().toISOString()
  const itens = await carregarFeed()
  let inseridos = 0
  let atualizados = 0
  let ignorados = 0

  for (const item of itens) {
    const chave = chaveDe(item)
    const payload = {
      tribunal: item.tribunal || 'STJ',
      tipo: item.tipo || '',
      numero: item.numero || '',
      assunto: item.assunto,
      ementa: item.ementa,
      relevancia: item.relevancia ?? 5,
      data_julgamento: item.data_julgamento || null,
      origem: 'automatico' as const,
      url_original: item.url_original || null,
      importado_em: agora,
      chave_externa: chave,
    }

    const { data: existente } = await supabase
      .from('jurisprudencias')
      .select('id')
      .eq('chave_externa', chave)
      .maybeSingle()

    if (existente?.id) {
      const { error } = await supabase
        .from('jurisprudencias')
        .update({
          ementa: payload.ementa,
          url_original: payload.url_original,
          importado_em: agora,
          origem: 'automatico',
          relevancia: payload.relevancia,
          data_julgamento: payload.data_julgamento,
        })
        .eq('id', existente.id)
      if (error) ignorados++
      else atualizados++
    } else {
      const { error } = await supabase.from('jurisprudencias').insert(payload)
      if (error) {
        // Concorrência / unique: tenta update
        if (error.code === '23505') {
          await supabase
            .from('jurisprudencias')
            .update({ importado_em: agora, origem: 'automatico', url_original: payload.url_original })
            .eq('chave_externa', chave)
          atualizados++
        } else ignorados++
      } else inseridos++
    }
  }

  return {
    ok: true,
    feed_configurado: Boolean(process.env.JURISPRUDENCIA_FEED_URL),
    total_feed: itens.length,
    inseridos,
    atualizados,
    ignorados,
    sincronizado_em: agora,
  }
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json(
      { error: 'CRON_SECRET não configurado no ambiente' },
      { status: 503 }
    )
  }
  if (!autorizar(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const result = await sincronizar()
    return Response.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
