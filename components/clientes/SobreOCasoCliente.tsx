'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Check, Info, Loader2, NotebookPen } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { registrarContato } from '@/lib/registrar-contato'

interface Props {
  clientId: string
  valorInicial?: string | null
  isLight?: boolean
  onAtualizar?: (patch: { notes: string }) => void
}

const PLACEHOLDER =
  'Ex.: Trabalhadora rural, 2 filhos, salário-maternidade indeferido por falta de carência. Parto em março/2024.'

const LINHA_PX = 22
const MIN_LINHAS = 3
const MAX_LINHAS = 10

function ajustarAltura(el: HTMLTextAreaElement | null) {
  if (!el) return
  const min = LINHA_PX * MIN_LINHAS
  const max = LINHA_PX * MAX_LINHAS
  el.style.height = 'auto'
  el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`
}

/**
 * Descrição curta do caso atual — editável inline com autosave em clients.notes.
 * Apenas consulta interna: NÃO entra na petição gerada pela IA.
 */
export function SobreOCasoCliente({
  clientId,
  valorInicial = '',
  isLight = false,
  onAtualizar,
}: Props) {
  const [texto, setTexto] = useState(valorInicial || '')
  const [status, setStatus] = useState<'idle' | 'salvando' | 'salvo' | 'erro'>('idle')
  const [erro, setErro] = useState('')
  const ultimoSalvo = useRef(valorInicial || '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const corTexto = isLight ? '#1E1E1E' : '#fff'
  const corMuted = isLight ? '#5E5E5E' : '#888'

  useEffect(() => {
    setTexto(valorInicial || '')
    ultimoSalvo.current = valorInicial || ''
    requestAnimationFrame(() => ajustarAltura(areaRef.current))
  }, [clientId, valorInicial])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function persistir(valor: string) {
    if (valor === ultimoSalvo.current) {
      setStatus('idle')
      return
    }
    setStatus('salvando')
    setErro('')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase
      .from('clients')
      .update({ notes: valor })
      .eq('id', clientId)

    if (error) {
      setStatus('erro')
      setErro(error.message || 'Não foi possível salvar.')
      return
    }

    ultimoSalvo.current = valor
    onAtualizar?.({ notes: valor })
    void registrarContato(clientId)
    setStatus('salvo')
    setTimeout(() => setStatus((s) => (s === 'salvo' ? 'idle' : s)), 1800)
  }

  function onChange(valor: string) {
    setTexto(valor)
    requestAnimationFrame(() => ajustarAltura(areaRef.current))
    if (timer.current) clearTimeout(timer.current)
    setStatus('salvando')
    timer.current = setTimeout(() => {
      void persistir(valor)
    }, 700)
  }

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="font-bold flex items-center gap-2" style={{ color: corTexto }}>
          <NotebookPen size={18} color="#D4AF37" /> Sobre o caso
        </h3>
        <span className="text-[11px] flex items-center gap-1" style={{ color: corMuted }}>
          {status === 'salvando' && (
            <>
              <Loader2 size={11} className="animate-spin" /> Salvando…
            </>
          )}
          {status === 'salvo' && (
            <>
              <Check size={11} color="#22C55E" /> Salvo
            </>
          )}
          {status === 'erro' && <span style={{ color: '#EF4444' }}>Erro ao salvar</span>}
        </span>
      </div>

      <p className="text-xs mb-3 flex items-start gap-1.5" style={{ color: corMuted }}>
        <Info size={12} className="flex-shrink-0 mt-0.5" color="#D4AF37" />
        <span>
          Contexto rápido para consulta interna —{' '}
          <strong style={{ color: isLight ? '#8B6914' : '#D4AF37' }}>não entra na petição</strong>{' '}
          gerada pela IA.
        </span>
      </p>

      <textarea
        ref={areaRef}
        value={texto}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={MIN_LINHAS}
        spellCheck={true}
        aria-label="Sobre o caso"
        className="w-full text-sm leading-relaxed"
        style={{
          background: isLight ? '#F8F8F8' : 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 10,
          color: corTexto,
          padding: '12px 14px',
          outline: 'none',
          resize: 'none',
          minHeight: LINHA_PX * MIN_LINHAS,
          maxHeight: LINHA_PX * MAX_LINHAS,
          overflowY: 'auto',
          lineHeight: `${LINHA_PX}px`,
        }}
      />
      {erro && (
        <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
          {erro}
        </p>
      )}
    </GlassCard>
  )
}
