import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Busca o perfil em `lawyers` do usuário autenticado.
 * Usa maybeSingle (evita PGRST116 de .single() com 0 ou >1 rows).
 * Fallback por e-mail quando o id bate no auth mas a linha ainda não sincronizou.
 */
export async function fetchOwnLawyerProfile(
  supabase: SupabaseClient,
  user: Pick<User, 'id' | 'email'>,
): Promise<{ data: Record<string, unknown> | null; error: { message: string; code?: string } | null }> {
  const byId = await supabase.from('lawyers').select('*').eq('id', user.id).maybeSingle()

  if (byId.data) {
    return { data: byId.data as Record<string, unknown>, error: null }
  }

  if (byId.error && byId.error.code !== 'PGRST116') {
    console.error('lawyers query (by id):', byId.error.message, byId.error)
  }

  const email = user.email?.trim()
  if (!email) {
    return {
      data: null,
      error: byId.error ? { message: byId.error.message, code: byId.error.code } : null,
    }
  }

  const byEmail = await supabase.from('lawyers').select('*').ilike('email', email).maybeSingle()

  if (byEmail.data) {
    console.warn('lawyers query: perfil encontrado por e-mail, não por id', {
      authId: user.id,
      lawyerId: (byEmail.data as { id?: string }).id,
    })
    return { data: byEmail.data as Record<string, unknown>, error: null }
  }

  if (byEmail.error && byEmail.error.code !== 'PGRST116') {
    console.error('lawyers query (by email):', byEmail.error.message, byEmail.error)
  }

  return {
    data: null,
    error:
      byId.error || byEmail.error
        ? { message: (byId.error || byEmail.error)!.message, code: (byId.error || byEmail.error)?.code }
        : null,
  }
}
