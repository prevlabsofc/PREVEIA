'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, MessageSquareText, Plus, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { formatarDataBR } from '@/lib/formatar-data'
import {
  adicionarAnotacaoCliente,
  excluirAnotacaoCliente,
  listarAnotacoesCliente,
  podeExcluirAnotacao,
  type ClientNote,
} from '@/lib/client-notes'
import type { MembroEquipe } from '@/lib/equipe'

interface Props {
  clientId: string
  membros: MembroEquipe[]
  isLight?: boolean
}

const campoStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(212,175,55,0.2)',
  borderRadius: 10,
  color: '#fff',
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  outline: 'none',
  resize: 'vertical' as const,
  minHeight: 88,
}

/**
 * Card de observações/histórico na ficha do cliente.
 * Append-only: adicionar e listar; exclusão só pelo autor ou admin (owner).
 */
export function ObservacoesHistoricoCliente({
  clientId,
  membros,
  isLight = false,
}: Props) {
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [officeRole, setOfficeRole] = useState<string | null>(null)
  const [escrevendo, setEscrevendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const corTexto = isLight ? '#1E1E1E' : '#fff'

  useEffect(() => {
    let ativo = true
    async function carregar() {
      setLoading(true)
      setErro('')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!ativo) return
      setUserId(user?.id ?? null)
      const eu = membros.find((m) => m.id === user?.id)
      setOfficeRole(eu?.office_role ?? null)

      const { ok, notes: lista, erro: msg } = await listarAnotacoesCliente(clientId)
      if (!ativo) return
      if (!ok) setErro(msg || 'Não foi possível carregar as anotações.')
      setNotes(lista)
      setLoading(false)
    }
    void carregar()
    return () => {
      ativo = false
    }
  }, [clientId, membros])

  function cancelar() {
    setEscrevendo(false)
    setTexto('')
    setErro('')
  }

  async function salvar() {
    setSalvando(true)
    setErro('')
    const { ok, note, erro: msg } = await adicionarAnotacaoCliente(clientId, texto)
    if (ok && note) {
      setNotes((prev) => [note, ...prev])
      cancelar()
    } else {
      setErro(msg || 'Não foi possível salvar a anotação.')
    }
    setSalvando(false)
  }

  async function excluir(note: ClientNote) {
    if (!podeExcluirAnotacao(note, userId, officeRole)) return
    setExcluindoId(note.id)
    setErro('')
    const { ok, erro: msg } = await excluirAnotacaoCliente(note.id)
    if (ok) setNotes((prev) => prev.filter((n) => n.id !== note.id))
    else setErro(msg || 'Não foi possível excluir a anotação.')
    setExcluindoId(null)
  }

  return (
    <GlassCard intensity={0.3} style={{ padding: 24, marginBottom: 20 }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-bold flex items-center gap-2" style={{ color: corTexto }}>
          <MessageSquareText size={18} color="#D4AF37" /> Observações e histórico
        </h3>
        {!escrevendo && (
          <button
            type="button"
            onClick={() => {
              setEscrevendo(true)
              setErro('')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors hover:bg-yellow-500/15"
            style={{ border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
          >
            <Plus size={13} /> Adicionar anotação
          </button>
        )}
      </div>

      {escrevendo && (
        <div className="mb-4">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Registre informações úteis para quem for atender este cliente depois..."
            style={campoStyle}
            spellCheck={true}
            autoFocus
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || !texto.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-50"
              style={{ background: '#D4AF37', color: '#111' }}
            >
              {salvando ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Salvando…
                </span>
              ) : (
                'Salvar'
              )}
            </button>
            <button
              type="button"
              onClick={cancelar}
              disabled={salvando}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ color: '#888', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs flex items-center gap-1.5" style={{ color: '#888' }}>
          <Loader2 size={12} className="animate-spin" /> Carregando anotações…
        </p>
      ) : notes.length === 0 ? (
        <p className="text-sm" style={{ color: '#777' }}>
          Nenhuma anotação ainda. Registre informações úteis para quem for atender este cliente depois.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => {
            const pode = podeExcluirAnotacao(n, userId, officeRole)
            return (
              <li
                key={n.id}
                className="pb-3"
                style={{ borderBottom: '1px solid rgba(212,175,55,0.12)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-[11px]" style={{ color: '#888' }}>
                    <span style={{ color: '#D4AF37' }}>{formatarDataBR(n.created_at)}</span>
                    {' · '}
                    <span>{n.autor_nome}</span>
                  </div>
                  {pode && (
                    <button
                      type="button"
                      title="Excluir anotação"
                      onClick={() => void excluir(n)}
                      disabled={excluindoId === n.id}
                      className="flex-shrink-0 p-1 rounded transition-colors hover:bg-red-500/10"
                      style={{ color: '#666' }}
                    >
                      {excluindoId === n.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: corTexto, lineHeight: 1.45 }}>
                  {n.texto}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {erro && (
        <p className="text-xs mt-3" style={{ color: '#EF4444' }}>
          {erro}
        </p>
      )}
    </GlassCard>
  )
}
