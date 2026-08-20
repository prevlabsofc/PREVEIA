import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  MARPLE_PANEL_ADMIN,
  MARPLE_PANEL_COOKIE,
  MARPLE_PANEL_SISTEMA,
} from '@/lib/auth/panel-preference'
import { resolveIsSuperAdmin } from '@/lib/auth/super-admin'

function withSessionCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c)
  }
  return to
}

function clearPanelCookie(res: NextResponse) {
  res.cookies.set(MARPLE_PANEL_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}

/**
 * Atualiza a sessão Supabase nos cookies.
 * Gate: /admin e /escolha só para super admin (role ou is_super_admin).
 * Não manda super_admin de /dashboard para /escolha.
 * Se o usuário já escolheu "Sistema" (cookie), impede bounce de volta a /escolha.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() revalida o JWT e renova cookies quando necessário.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const panel = request.cookies.get(MARPLE_PANEL_COOKIE)?.value
  const wantsReset = request.nextUrl.searchParams.has('reset')
  const isAdminPath = path === '/admin' || path.startsWith('/admin/')
  const isEscolhaPath = path === '/escolha'

  // /admin e /escolha: autenticado + super admin. Demais → /dashboard (ou /login).
  if (isAdminPath || isEscolhaPath) {
    if (!user) {
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      return withSessionCookies(supabaseResponse, clearPanelCookie(redirect))
    }

    const ok = await resolveIsSuperAdmin(supabase, user.id)
    if (!ok) {
      const redirect = NextResponse.redirect(new URL('/dashboard', request.url))
      return withSessionCookies(supabaseResponse, clearPanelCookie(redirect))
    }
  }

  // Já escolheu Sistema: não ficar preso em /escolha (defesa contra redirect legado).
  if (user && isEscolhaPath && panel === MARPLE_PANEL_SISTEMA && !wantsReset) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url))
    return withSessionCookies(supabaseResponse, redirect)
  }

  // Já escolheu Admin: /escolha → /admin (só chega aqui se for super admin).
  if (user && isEscolhaPath && panel === MARPLE_PANEL_ADMIN && !wantsReset) {
    const redirect = NextResponse.redirect(new URL('/admin', request.url))
    return withSessionCookies(supabaseResponse, redirect)
  }

  // Explicitamente: /dashboard nunca redireciona para /escolha por role.
  return supabaseResponse
}
