'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Link2, Loader2, Plus } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Uso = {
  id: string
  nota: string | null
  created_at: string
  client_id: string | null
  clients?: { name: string } | null
}

/** A7 — painel de usos da jurisprudência em clientes/casos do escritório. */
export function UsoEmProcessos({ jurisprudenciaId }: { jurisprudenciaId: string }) {
  const [usos, setUsos] = useState<Uso[]>([])
  const [clientes, setClientes] = useState<{ id: string; name: string }[]>([])
  const [clienteId, setClienteId] = useState('')
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: u }, { data: c }, { data: lawyer }] = await Promise.all([
      supabase
        .from('jurisprudencia_uso')
        .select('id, nota, created_at, client_id, clients(name)')
        .eq('jurisprudencia_id', jurisprudenciaId)
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('lawyer_id', user.id).order('name').limit(200),
      supabase.from('lawyers').select('office_id').eq('id', user.id).maybeSingle(),
    ])
    void lawyer
    setUsos((u as unknown as Uso[]) || [])
    setClientes(c || [])
    setLoading(false)
  }

  useEffect(() => { void carregar() }, [jurisprudenciaId])

  async function vincular() {
    if (!clienteId) return
    setSalvando(true)
    setErro(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSalvando(false); setErro('Sessão expirada.'); return }
    const { data: lawyer } = await supabase.from('lawyers').select('office_id').eq('id', user.id).maybeSingle()
    const { error } = await supabase.from('jurisprudencia_uso').insert({
      jurisprudencia_id: jurisprudenciaId,
      lawyer_id: user.id,
      office_id: lawyer?.office_id || null,
      client_id: clienteId,
      nota: nota.trim() || null,
    })
    setSalvando(false)
    if (error) {
      console.error('[jurisprudencia_uso]', error)
      setErro(
        error.message?.includes('does not exist') || error.code === '42P01'
          ? 'Tabela jurisprudencia_uso ausente — aplique a migration da Leva A.'
          : 'Não foi possível vincular. Tente novamente.'
      )
      return
    }
    setClienteId('')
    setNota('')
    await carregar()
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.7)' }}>
        USO EM CLIENTES / CASOS
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs" style={{ color: '#666' }}>
          <Loader2 size={12} className="animate-spin" /> Carregando vínculos…
        </div>
      ) : usos.length === 0 ? (
        <p className="text-[11px]" style={{ color: '#555' }}>Ainda não vinculada a nenhum cliente.</p>
      ) : (
        <ul className="space-y-1.5">
          {usos.map(u => (
            <li
              key={u.id}
              className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Link2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#D4AF37' }} />
              <div className="min-w-0">
                <div style={{ color: '#ddd' }}>{u.clients?.name || 'Cliente removido'}</div>
                {u.nota && <div style={{ color: '#666' }}>{u.nota}</div>}
                <div className="text-[10px]" style={{ color: '#555' }}>
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={clienteId}
          onChange={e => setClienteId(e.target.value)}
          className="flex-1 px-3 rounded-lg text-xs outline-none"
          style={{ height: 36, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        >
          <option value="" style={{ background: '#111' }}>Vincular a um cliente…</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.name}</option>
          ))}
        </select>
        <input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Nota (opcional)"
          className="flex-1 px-3 rounded-lg text-xs outline-none"
          style={{ height: 36, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} spellCheck={true} />
        <button
          type="button"
          onClick={vincular}
          disabled={!clienteId || salvando}
          className="flex items-center justify-center gap-1 px-3 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ height: 36, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          {salvando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Vincular
        </button>
      </div>
      {erro && (
        <p className="text-[11px]" style={{ color: '#EF4444' }}>{erro}</p>
      )}
    </div>
  )
}
