import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@/lib/supabase/server'
import { resolveIsSuperAdmin } from '@/lib/auth/super-admin'

/**
 * Barreira server-side: /admin só para super admin.
 * Complementa o proxy e a checagem client-side da página.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const ok = await resolveIsSuperAdmin(supabase, user.id)
  if (!ok) {
    redirect('/dashboard')
  }

  return <div className="admin-panel">{children}</div>
}
