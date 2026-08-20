'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mensagemErroGoogleOAuth, signInWithGoogle } from '@/lib/auth/google-oauth'

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.3 5.3C39.2 37.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z" />
    </svg>
  )
}

type Props = {
  supabase: SupabaseClient
  onError: (message: string) => void
  /** Estilo claro (login) vs escuro (registro). */
  isLight?: boolean
  label?: string
  className?: string
}

/**
 * Botão "Entrar com Google".
 * Requer provider Google habilitado no painel Supabase (Auth → Providers → Google).
 */
export function GoogleSignInButton({
  supabase,
  onError,
  isLight = false,
  label = 'Entrar com Google',
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    onError('')
    try {
      const { error } = await signInWithGoogle(supabase)
      if (error) {
        onError(mensagemErroGoogleOAuth(error))
        setLoading(false)
      }
      // Sucesso: o browser redireciona para o Google; loading permanece.
    } catch (e) {
      onError(mensagemErroGoogleOAuth({ message: e instanceof Error ? e.message : String(e) }))
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`w-full rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all ${className}`}
      style={{
        height: 52,
        background: isLight ? '#fff' : 'rgba(255,255,255,0.04)',
        border: isLight ? '1px solid #E0E0E0' : '1px solid rgba(255,255,255,0.12)',
        color: isLight ? '#1E1E1E' : '#eee',
      }}
      aria-label={label}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" /> Conectando...
        </>
      ) : (
        <>
          <GoogleIcon />
          {label}
        </>
      )}
    </button>
  )
}

export { GoogleIcon }
