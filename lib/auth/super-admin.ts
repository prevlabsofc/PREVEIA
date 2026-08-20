import type { SupabaseClient } from '@supabase/supabase-js'

export type SuperAdminFields = {
  role?: string | null
  is_super_admin?: boolean | null
} | null | undefined

/**
 * Identifica super admin por `lawyers.role` ou flag `is_super_admin`.
 * Super admins podem usar /dashboard (como advogado) e /admin;
 * /escolha é só o seletor pós-login — não deve bloquear o dashboard.
 */
export function isSuperAdmin(lawyer: SuperAdminFields): boolean {
  if (!lawyer) return false
  if (lawyer.role === 'super_admin') return true
  if (lawyer.is_super_admin === true) return true
  return false
}

/**
 * Resolve super admin no servidor (proxy / layout).
 * Prefere RPC `is_super_admin()`; fallback na linha de `lawyers`.
 */
export async function resolveIsSuperAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: rpcData, error: rpcErr } = await supabase.rpc('is_super_admin')
  if (!rpcErr && typeof rpcData === 'boolean') {
    return rpcData
  }

  const withFlag = await supabase
    .from('lawyers')
    .select('role, is_super_admin')
    .eq('id', userId)
    .maybeSingle()

  if (!withFlag.error) {
    return isSuperAdmin(withFlag.data)
  }

  // Coluna boolean pode não existir em ambientes antigos — só `role`.
  const roleOnly = await supabase
    .from('lawyers')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return isSuperAdmin(roleOnly.data)
}

/**
 * Após login: super admin escolhe painel em /escolha; demais vão ao sistema.
 * Nunca retorna `/admin` — admin só após escolha explícita do super admin.
 */
export function postLoginPath(lawyer: SuperAdminFields): '/escolha' | '/dashboard' {
  return isSuperAdmin(lawyer) ? '/escolha' : '/dashboard'
}
