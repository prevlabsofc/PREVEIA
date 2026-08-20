import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const runtime = 'nodejs'

// O convite é consultado com a service role porque quem abre o link ainda não
// está autenticado e não passa pelas policies de RLS de office_invites.
export async function GET(req: Request) {
  try {
    const codigo = (new URL(req.url).searchParams.get('codigo') || '').trim()
    if (!codigo || codigo.length > 64) return Response.json({ valido: false })

    const { data: invite } = await supabaseAdmin
      .from('office_invites')
      .select('*')
      .eq('code', codigo)
      .maybeSingle()

    if (!invite || invite.used) return Response.json({ valido: false })
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return Response.json({ valido: false })
    }

    return Response.json({ valido: true, escritorio: await nomeDoEscritorio(invite.office_id) })
  } catch {
    return Response.json({ valido: false })
  }
}

async function nomeDoEscritorio(officeId: string | null): Promise<string | null> {
  if (!officeId) return null

  // office_id aponta para o advogado dono do escritório (id === office_id).
  const { data: dono } = await supabaseAdmin
    .from('lawyers')
    .select('name, office_name')
    .eq('id', officeId)
    .maybeSingle()

  if (dono) return dono.office_name?.trim() || dono.name?.trim() || null

  const { data: fallback } = await supabaseAdmin
    .from('lawyers')
    .select('name, office_name')
    .eq('office_id', officeId)
    .eq('office_role', 'owner')
    .limit(1)
    .maybeSingle()

  return fallback?.office_name?.trim() || fallback?.name?.trim() || null
}
