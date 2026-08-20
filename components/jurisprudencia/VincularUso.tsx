'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Link2, Trash2 } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Cliente = { id: string; name: string }
type Uso = {
  id: string
  client_id: string | null
  nota: string | null
  created_at: string
  clients?: { name: string } | null
}

export function VincularUso({
  jurisprudenciaId,
  lawyerId,
}: {
  jurisprudenciaId: string
  lawyerId: string | null
}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [usos, setUsos] = useState<Uso[]>([])
  const [clientId, setClientId] = useState('')
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [officeId, setOfficeId] = useState<string | null>(null)

  async function carregar() {
    if (!lawyerId) return
    const [{ data: cli }, { data: usosData }, { data: me }] = await Promise.all([
      supabase.from('clients').select('id, name').eq('lawyer_id', lawyerId).order('name').limit(200),
      supabase
        .from('jurisprudencia_uso')
        .select('id, client_id, nota, created_at, clients(name)')
        .eq('jurisprudencia_id', jurisprudenciaId)
        .order('created_at', { ascending: false }),
      supabase.from('lawyers').select('office_id').eq('id', lawyerId).maybeSingle(),
    ])
    setClientes((cli as Cliente[]) || [])
    setUsos((usosData as unknown as Uso[]) || [])
    setOfficeId((me?.office_id as string) || null)
  }

  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jurisprudenciaId, lawyerId])

  async function vincular() {
    if (!lawyerId || !clientId) return
    setSalvando(true)
    await supabase.from('jurisprudencia_uso').insert({
      jurisprudencia_id: jurisprudenciaId,
      lawyer_id: lawyerId,
      office_id: officeId,
      client_id: clientId,
      nota: nota.trim() || null,
    })
    setClientId('')
    setNota('')
    await carregar()
    setSalvando(false)
  }

  async function remover(id: string) {
    await supabase.from('jurisprudencia_uso').delete().eq('id', id)
    setUsos(prev => prev.filter(u => u.id !== id))
  }

  return (
    <div className="space-y-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="text-[10px] font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.7)' }}>
        VINCULAR A CASO / CLIENTE
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          className="flex-1 px-3 rounded-xl text-xs outline-none"
          style={{ height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        >
          <option value="" style={{ background: '#111' }}>Selecionar cliente…</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id} style={{ background: '#111' }}>{c.name}</option>
          ))}
        </select>
        <input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Nota (opcional)"
          className="flex-1 px-3 rounded-xl text-xs outline-none"
          style={{ height: 40, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} spellCheck={true} />
        <button
          type="button"
          onClick={vincular}
          disabled={!clientId || salvando || !lawyerId}
          className="flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold disabled:opacity-40"
          style={{ height: 40, background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Vincular
        </button>
      </div>
      {usos.length > 0 && (
        <ul className="space-y-1.5">
          {usos.map(u => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="min-w-0">
                <div style={{ color: '#ddd' }}>{u.clients?.name || 'Cliente removido'}</div>
                {u.nota && <div style={{ color: '#666' }}>{u.nota}</div>}
                <div style={{ color: '#444', fontSize: 10 }}>
                  {new Date(u.created_at).toLocaleString('pt-BR')}
                </div>
              </div>
              <button type="button" onClick={() => remover(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: '#EF4444' }}>
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
