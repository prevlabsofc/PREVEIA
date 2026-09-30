'use client'

import { createBrowserClient } from '@supabase/ssr'
import { carregarAssinaturaEscritorio } from '@/lib/assinatura-escritorio'
import type { DadosAdvogadoPeticao } from '@/lib/peticao-export'

/**
 * Preenche `adv.assinatura` (data-URL dimensionada) para o HTML/PDF no navegador.
 * Já definida (inclusive null) → devolve como está. Falha ou sem login → null
 * (o espaço de 2,5 cm continua reservado, em branco).
 */
export async function comAssinaturaEscritorio(adv: DadosAdvogadoPeticao): Promise<DadosAdvogadoPeticao> {
  if (adv.assinatura !== undefined) return adv
  try {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ...adv, assinatura: null }
    const opts = adv.signature_url !== undefined ? { signatureUrl: adv.signature_url } : {}
    const a = await carregarAssinaturaEscritorio(supabase, user.id, opts)
    return {
      ...adv,
      assinatura: a ? { dataUrl: a.dataUrl, widthPx: a.widthPx, heightPx: a.heightPx } : null,
    }
  } catch (err) {
    console.error('[assinatura-pdf-cliente]', err)
    return { ...adv, assinatura: null }
  }
}
