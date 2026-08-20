import { createClient } from '@supabase/supabase-js'
import { COLUNA_ULTIMO_CONTATO, DIAS_ALERTA_SEM_CONTATO_PADRAO } from '@/lib/registrar-contato'
import { diasDesde } from '@/lib/formatar-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Não reenvia lembrete do mesmo cliente antes deste intervalo (dias). */
const COOLDOWN_DIAS = 7

const TIPO_LEMBRETE = 'lembrete_contato'

function autorizarCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  const bearer = auth.replace(/^Bearer\s+/i, '').trim()
  const header = req.headers.get('x-cron-secret') || ''
  return bearer === secret || header === secret
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Varre clientes sem contato recente e cria notificações (com `link` para a
 * ficha). Usa service role no cron; evita duplicatas pelo cooldown em
 * notificações do tipo lembrete_contato com o mesmo link.
 *
 * Escolha de cron (em vez de check on-demand no layout): o layout é arquivo
 * compartilhado e sensível a concorrência; já existe padrão Vercel Cron em
 * vercel.json (/api/monitorar-processos, /api/sync-jurisprudencias).
 */
export async function gerarLembretesSemContato(opts?: {
  lawyerIds?: string[]
}): Promise<{ verificados: number; criados: number; pulados: number }> {
  const db = adminClient()
  const agora = new Date()
  let verificados = 0
  let criados = 0
  let pulados = 0

  let lawyersQuery = db
    .from('lawyers')
    .select('id, name, dias_alerta_sem_contato')
  if (opts?.lawyerIds?.length) {
    lawyersQuery = lawyersQuery.in('id', opts.lawyerIds)
  }
  const { data: lawyers, error: lawErr } = await lawyersQuery
  if (lawErr || !lawyers?.length) {
    return { verificados, criados, pulados }
  }

  for (const law of lawyers) {
    const limiar =
      typeof law.dias_alerta_sem_contato === 'number' && law.dias_alerta_sem_contato > 0
        ? law.dias_alerta_sem_contato
        : DIAS_ALERTA_SEM_CONTATO_PADRAO

    const { data: clients } = await db
      .from('clients')
      .select(`id, name, lawyer_id, created_at, ${COLUNA_ULTIMO_CONTATO}`)
      .eq('lawyer_id', law.id)
      .neq('status', 'archived')

    for (const cli of clients || []) {
      verificados++
      const ref = (cli as Record<string, string | null>)[COLUNA_ULTIMO_CONTATO] || cli.created_at
      const dias = diasDesde(ref, agora)
      if (dias === null || dias < limiar) {
        pulados++
        continue
      }

      const link = `/clientes/${cli.id}`
      const desde = new Date(agora)
      desde.setDate(desde.getDate() - COOLDOWN_DIAS)

      const { data: existentes } = await db
        .from('notifications')
        .select('id')
        .eq('lawyer_id', law.id)
        .eq('type', TIPO_LEMBRETE)
        .eq('link', link)
        .gte('created_at', desde.toISOString())
        .limit(1)

      if (existentes && existentes.length > 0) {
        pulados++
        continue
      }

      const nome = (cli.name || 'Cliente').trim()
      const { error } = await db.from('notifications').insert({
        lawyer_id: law.id,
        title: `${nome}: ${dias} dias sem contato`,
        type: TIPO_LEMBRETE,
        link,
        status: 'done',
        progress: 100,
      })
      if (!error) criados++
      else pulados++
    }
  }

  return { verificados, criados, pulados }
}

/** Cron Vercel diário. */
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'service role ausente' }, { status: 503 })
  }

  try {
    const result = await gerarLembretesSemContato()
    return Response.json({ ok: true, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro'
    return Response.json({ error: msg }, { status: 500 })
  }
}
