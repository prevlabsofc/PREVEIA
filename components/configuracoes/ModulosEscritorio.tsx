'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Check, Loader2, Lock, LayoutGrid } from 'lucide-react'
import {
  MODULOS_CATALOGO,
  configPadraoTodosAtivos,
  normalizarConfig,
  podeGerenciarModulos,
  type ModuloId,
  type ModulosAtivos,
} from '@/lib/modulos-escritorio'

type LawyerMini = {
  id: string
  office_id?: string | null
  office_role?: string | null
  cargo?: string | null
  role?: string | null
}

export function ModulosEscritorio({ me, isLight }: { me: LawyerMini; isLight: boolean }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [config, setConfig] = useState<ModulosAtivos>(configPadraoTodosAtivos())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [erro, setErro] = useState('')
  const podeEditar = podeGerenciarModulos(me)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErro('')
      const { data: rpcData, error: rpcErr } = await supabase.rpc('modulos_ativos_do_escritorio')
      if (!rpcErr) {
        setConfig(normalizarConfig(rpcData) ?? configPadraoTodosAtivos())
        setLoading(false)
        return
      }
      // Fallback se a migração/RPC ainda não existir: lê do dono ou de si.
      let targetId = me.id
      if (me.office_id) {
        const { data: owner } = await supabase
          .from('lawyers')
          .select('id')
          .eq('office_id', me.office_id)
          .eq('office_role', 'owner')
          .maybeSingle()
        if (owner?.id) targetId = owner.id
        else targetId = me.office_id
      }
      const { data } = await supabase
        .from('lawyers')
        .select('modulos_ativos')
        .eq('id', targetId)
        .maybeSingle()
      setConfig(normalizarConfig(data?.modulos_ativos) ?? configPadraoTodosAtivos())
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id, me.office_id])

  function toggle(id: ModuloId) {
    if (!podeEditar) return
    const def = MODULOS_CATALOGO.find((m) => m.id === id)
    if (def?.locked) return
    setConfig((c) => ({ ...c, [id]: c[id] === false ? true : false }))
  }

  async function salvar() {
    if (!podeEditar) return
    setSaving(true)
    setErro('')
    const payload = { ...config }
    for (const m of MODULOS_CATALOGO) {
      if (m.locked) payload[m.id] = true
    }
    const { error: rpcErr } = await supabase.rpc('salvar_modulos_ativos', { p_modulos: payload })
    if (rpcErr) {
      // Fallback: grava na própria linha (dono/solo)
      const { error } = await supabase
        .from('lawyers')
        .update({ modulos_ativos: payload })
        .eq('id', me.id)
      if (error) {
        setErro(error.message || rpcErr.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setSaved(true)
    window.dispatchEvent(new CustomEvent('marple:modulos-atualizados', { detail: payload }))
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="animate-spin" style={{ color: '#D4AF37' }} />
      </div>
    )
  }

  const secoes = ['PRINCIPAL', 'GESTÃO', 'SISTEMA', 'TOPO'] as const

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        <LayoutGrid size={16} color="#D4AF37" className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold text-sm" style={{ color: isLight ? '#1E1E1E' : '#fff' }}>
            Módulos do Escritório
          </p>
          <p className="text-xs mt-1" style={{ color: isLight ? '#5E5E5E' : '#888' }}>
            Ative ou desative itens do menu conforme a área de atuação do escritório.
            Itens essenciais permanecem sempre disponíveis.
          </p>
        </div>
      </div>

      {!podeEditar && (
        <div
          className="px-3 py-2.5 rounded-xl text-xs"
          style={{
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.2)',
            color: isLight ? '#5E5E5E' : '#aaa',
          }}
        >
          Somente o sócio ou o dono do escritório pode alterar os módulos. Você vê o menu já filtrado.
        </div>
      )}

      {secoes.map((secao) => {
        const itens = MODULOS_CATALOGO.filter((m) => m.secao === secao)
        if (itens.length === 0) return null
        return (
          <div key={secao}>
            <div
              className="text-[9px] font-bold tracking-[0.2em] mb-2"
              style={{ color: '#555' }}
            >
              {secao === 'TOPO' ? 'BARRA SUPERIOR' : secao}
            </div>
            <div className="space-y-1.5">
              {itens.map((m) => {
                const ativo = m.locked || config[m.id] !== false
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                    style={{
                      background: isLight ? '#FAFAFA' : 'rgba(255,255,255,0.02)',
                      border: isLight ? '1px solid #EDEDED' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: isLight ? '#1E1E1E' : '#ddd' }}
                      >
                        {m.label}
                      </div>
                      {m.locked && (
                        <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: '#888' }}>
                          <Lock size={10} /> {m.motivoLocked}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ativo}
                      aria-label={`${m.label}: ${ativo ? 'ativo' : 'desativado'}`}
                      disabled={!podeEditar || m.locked}
                      onClick={() => toggle(m.id)}
                      className="relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-60"
                      style={{
                        background: ativo ? '#D4AF37' : isLight ? '#D1D5DB' : '#333',
                        cursor: !podeEditar || m.locked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
                        style={{
                          background: '#fff',
                          transform: ativo ? 'translateX(20px)' : 'translateX(0)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        }}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {erro && (
        <p className="text-sm" style={{ color: '#EF4444' }}>{erro}</p>
      )}

      {podeEditar && (
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="btn-gold flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm mt-2"
        >
          {saving ? (
            <><Loader2 size={15} className="animate-spin" /> Salvando...</>
          ) : saved ? (
            <><Check size={15} /> Salvo!</>
          ) : (
            'Salvar Módulos'
          )}
        </button>
      )}
    </div>
  )
}
