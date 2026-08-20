import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function logAudit(action: string, resource?: string, details?: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: lawyer } = await supabase.from('lawyers').select('name').eq('id', user.id).single()
    await supabase.from('audit_logs').insert({
      lawyer_id: user.id,
      lawyer_name: lawyer?.name || '',
      action,
      resource,
      details,
    })
  } catch { /* silencia erro de log pra não quebrar o fluxo */ }
}