import { createClient } from '@supabase/supabase-js'
import { carregarMembrosEscritorio } from '@/lib/equipe'
import { monitorarProcessos } from '@/lib/monitorar-processos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function autorizarCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.replace(/^Bearer\s+/i, '').trim()
  const header = req.headers.get('x-cron-secret') || ''
  return bearer === secret || header === secret
}

/** Cron Vercel: varre todos os processos com alertas configurados. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json(
      { error: 'CRON_SECRET não configurado no ambiente' },
      { status: 503 },
    )
  }
  if (!autorizarCron(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await monitorarProcessos()
    return Response.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro'
    return Response.json({ error: msg }, { status: 500 })
  }
}

/**
 * Verificação manual pelo advogado autenticado (escopo do escritório).
 * Body opcional: { processoId?: string } — se omitido, varre todos do escritório.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const membros = await carregarMembrosEscritorio(supabase, user.id)
  const lawyerIds = membros.map((m) => m.id)
  if (lawyerIds.length === 0) lawyerIds.push(user.id)

  try {
    const result = await monitorarProcessos({ lawyerIds })
    return Response.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro'
    return Response.json({ error: msg }, { status: 500 })
  }
}
