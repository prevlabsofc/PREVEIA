import { createClient } from '@supabase/supabase-js'
import {
  hashTokenDocumento,
  tokenDocumentoValido,
} from '@/lib/documento-acesso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const ERRO = { error: 'link_indisponivel' as const }

/**
 * GET público — recupera documento pelo token (sem login).
 * Usa service role + hash; nunca lista outros documentos.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await ctx.params
    if (!tokenDocumentoValido(token)) {
      return Response.json(ERRO, { status: 404 })
    }

    const hash = hashTokenDocumento(token)
    const { data, error } = await admin()
      .from('documents')
      .select(
        'id, title, content, agent_type, client_name, created_at, access_token_created_at, lawyer_snapshot, status',
      )
      .eq('access_token_hash', hash)
      .maybeSingle()

    if (error || !data) {
      return Response.json(ERRO, { status: 404 })
    }

    return Response.json(
      {
        title: data.title || 'Documento',
        content: data.content || '',
        agent_type: data.agent_type,
        client_name: data.client_name,
        created_at: data.created_at,
        access_token_created_at: data.access_token_created_at,
        lawyer_snapshot: data.lawyer_snapshot || null,
        status: data.status,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(ERRO, { status: 404 })
  }
}
