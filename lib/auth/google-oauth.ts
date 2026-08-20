/**
 * Google OAuth via Supabase Auth.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO MANUAL (admin) — obrigatória antes do botão funcionar:
 *
 * 1. Google Cloud Console → APIs & Services → Credentials
 *    - Crie um OAuth 2.0 Client ID (tipo "Web application")
 *    - Authorized JavaScript origins: URL do app (ex.: https://seudominio.com
 *      e http://localhost:3000 em dev)
 *    - Authorized redirect URIs: URL de callback do Supabase
 *      (Auth → Providers → Google no painel, ou
 *      https://<project-ref>.supabase.co/auth/v1/callback)
 *
 * 2. Supabase Dashboard → Authentication → Providers → Google
 *    - Ative o provider
 *    - Cole o Client ID e o Client Secret do Google Cloud
 *    - NÃO coloque Client ID/Secret no código nem em variáveis NEXT_PUBLIC_
 *      (ficam só no painel Supabase / secrets do projeto)
 *
 * 3. Authentication → URL Configuration → Redirect URLs
 *    - Inclua: http://localhost:3000/dashboard
 *    - Inclua a URL de produção: https://seudominio.com/dashboard
 *    - Inclua /configuracoes se for usar vincular conta
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { fetchOwnLawyerProfile } from '@/lib/auth/lawyer-profile'

export const GOOGLE_OAUTH_ADMIN_HINT =
  'Login com Google ainda não está disponível. O administrador precisa configurar o provedor Google no painel do Supabase (Authentication → Providers → Google), com o Client ID e o Client Secret do Google Cloud.'

/** Mensagem amigável quando o provider não está habilitado / mal configurado. */
export function mensagemErroGoogleOAuth(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  const msg = (error?.message || '').toLowerCase()
  const code = (error?.code || '').toLowerCase()

  if (
    msg.includes('provider is not enabled') ||
    msg.includes('unsupported provider') ||
    msg.includes('validation_failed') ||
    (msg.includes('oauth') && msg.includes('not enabled')) ||
    code === 'validation_failed' ||
    code === 'provider_disabled'
  ) {
    return GOOGLE_OAUTH_ADMIN_HINT
  }

  if (msg.includes('redirect') && (msg.includes('not allowed') || msg.includes('whitelist') || msg.includes('allow'))) {
    return 'A URL de redirecionamento não está autorizada. Peça ao administrador para adicioná-la em Authentication → URL Configuration no Supabase.'
  }

  return error?.message?.trim() || 'Não foi possível iniciar o login com Google. Tente novamente.'
}

/**
 * Inicia OAuth Google e redireciona para /dashboard após o consentimento.
 * Nunca usa /admin nem /escolha como redirect OAuth — usuários normais e
 * contas novas vão ao dashboard/onboarding; só super admin acessa /escolha
 * (via login senha / postLoginPath) ou /admin (após escolha explícita).
 * O fluxo pós-login (perfil em `lawyers` → onboarding se necessário) é tratado
 * no layout do dashboard.
 */
export async function signInWithGoogle(supabase: SupabaseClient) {
  // Credenciais: Auth → Providers → Google no painel Supabase (não no .env do Next).
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Sempre /dashboard — nunca /admin.
      redirectTo: window.location.origin + '/dashboard',
    },
  })
}

/** Vincula a identidade Google à conta já autenticada. */
export async function linkGoogleAccount(supabase: SupabaseClient) {
  // Credenciais: Auth → Providers → Google no painel Supabase (admin).
  return supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/configuracoes?tab=seguranca',
    },
  })
}

/** Cria perfil mínimo em `lawyers` quando o usuário entra pela 1ª vez via Google. */
export async function ensureLawyerProfileForOAuth(
  supabase: SupabaseClient,
  user: User,
): Promise<{ created: boolean; lawyer: Record<string, any> | null }> {
  const { data: existing, error: fetchErr } = await fetchOwnLawyerProfile(supabase, user)

  if (existing) {
    return { created: false, lawyer: existing }
  }

  if (fetchErr) {
    console.error('lawyers query:', null, fetchErr)
  }

  const meta = user.user_metadata || {}
  const name =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (user.email ? user.email.split('@')[0] : 'Advogado')

  const rowBase = {
    id: user.id,
    name,
    email: user.email?.trim() || '',
    plan: 'trial',
    role: 'lawyer',
    trial_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    docs_limit: 5,
    docs_trial_used: 0,
    onboarding_done: false,
    office_id: user.id,
    office_role: 'owner',
  }

  // Nunca cria OAuth como super admin; tenta gravar a flag boolean se a coluna existir.
  let inserted: Record<string, any> | null = null
  let error: { message: string; code?: string } | null = null

  {
    const first = await supabase
      .from('lawyers')
      .insert({ ...rowBase, is_super_admin: false })
      .select('*')
      .single()
    inserted = first.data
    error = first.error
  }

  if (error && /is_super_admin/i.test(error.message || '')) {
    const retry = await supabase.from('lawyers').insert(rowBase).select('*').single()
    inserted = retry.data
    error = retry.error
  }

  if (error) {
    // Corrida: outro request pode ter criado o perfil
    const { data: again } = await fetchOwnLawyerProfile(supabase, user)
    if (again) return { created: false, lawyer: again }
    console.error('ensureLawyerProfileForOAuth:', error.message)
    console.error('lawyers query:', null, error)
    return { created: false, lawyer: null }
  }

  return { created: true, lawyer: inserted }
}
