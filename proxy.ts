import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/update-session'

/**
 * Proxy (Next.js 16 — substitui middleware.ts).
 * Renova sessão; bloqueia /admin e /escolha para quem não é super admin.
 * NÃO manda super_admin de /dashboard → /escolha.
 * Se cookie marple_panel=sistema e path=/escolha, redireciona para /dashboard.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Ignora estáticos e assets. Inclui /dashboard, /escolha, /admin, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
