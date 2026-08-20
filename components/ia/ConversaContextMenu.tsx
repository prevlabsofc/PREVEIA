'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Folder, FolderPlus, Briefcase, Trash2, ChevronRight, ChevronLeft, Check, Search, Ban,
} from 'lucide-react'
import { ScrollFade } from '@/components/ScrollFade'

export interface ClienteRef { id: string; name: string; cpf?: string | null }

interface Props {
  x: number
  y: number
  pastaAtual?: string | null
  clientIdAtual?: string | null
  pastas: string[]
  clientes: ClienteRef[]
  isLight: boolean
  onMoverPasta: (pasta: string | null) => void
  onCriarPasta: (nome: string) => void
  onAnexarCaso: (clientId: string | null) => void
  onExcluir: () => void
  onClose: () => void
}

const LARGURA = 244
const OURO = '#D4AF37'

export function ConversaContextMenu({
  x, y, pastaAtual, clientIdAtual, pastas, clientes, isLight,
  onMoverPasta, onCriarPasta, onAnexarCaso, onExcluir, onClose,
}: Props) {
  const [view, setView] = useState<'root' | 'pasta' | 'caso'>('root')
  const [novaPasta, setNovaPasta] = useState('')
  const [busca, setBusca] = useState('')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [pos, setPos] = useState({ x, y })
  const [montado, setMontado] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMontado(true), [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    })
  }, [x, y, view, montado])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const aoClicarFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', aoTeclar)
    document.addEventListener('mousedown', aoClicarFora)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.removeEventListener('mousedown', aoClicarFora)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const clienteAtual = clientes.find(c => c.id === clientIdAtual)

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const base = termo
      ? clientes.filter(c => c.name?.toLowerCase().includes(termo) || (c.cpf || '').includes(termo))
      : clientes
    return base.slice(0, 40)
  }, [clientes, busca])

  const fundo = isLight ? '#FFFFFF' : 'rgba(20,20,20,0.98)'
  const borda = isLight ? '1px solid #EDEDED' : '1px solid rgba(212,175,55,0.22)'
  const corTexto = isLight ? '#1E1E1E' : '#ddd'
  const corSuave = isLight ? '#888' : '#777'
  const separador = isLight ? '1px solid #F0F0F0' : '1px solid rgba(255,255,255,0.07)'

  const itemBase = 'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors duration-150 hover:bg-[rgba(212,175,55,0.1)]'

  function criarPasta() {
    const nome = novaPasta.trim()
    if (!nome) return
    onCriarPasta(nome)
    onMoverPasta(nome)
    setNovaPasta('')
    onClose()
  }

  const conteudo = (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[999] rounded-xl overflow-hidden"
      style={{
        left: pos.x,
        top: pos.y,
        width: LARGURA,
        background: fundo,
        border: borda,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        color: corTexto,
      }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {view === 'root' && (
        <>
          <button type="button" role="menuitem" className={itemBase} onClick={() => setView('pasta')}>
            <Folder size={13} color={OURO} className="flex-shrink-0"/>
            <span className="flex-1 min-w-0">
              <span className="block">Mover para pasta</span>
              {pastaAtual && <span className="block text-[10px] truncate" style={{ color: corSuave }}>{pastaAtual}</span>}
            </span>
            <ChevronRight size={13} color={corSuave} className="flex-shrink-0"/>
          </button>

          <button type="button" role="menuitem" className={itemBase} onClick={() => setView('caso')}>
            <Briefcase size={13} color={OURO} className="flex-shrink-0"/>
            <span className="flex-1 min-w-0">
              <span className="block">Anexar a um caso</span>
              {clienteAtual && <span className="block text-[10px] truncate" style={{ color: corSuave }}>{clienteAtual.name}</span>}
            </span>
            <ChevronRight size={13} color={corSuave} className="flex-shrink-0"/>
          </button>

          <div style={{ borderTop: separador }}/>

          {confirmandoExclusao ? (
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors duration-150 hover:bg-[rgba(239,68,68,0.14)]"
              style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}
              onClick={() => { onExcluir(); onClose() }}
            >
              <Trash2 size={13} className="flex-shrink-0"/>
              <span>Confirmar exclusão</span>
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors duration-150 hover:bg-[rgba(239,68,68,0.1)]"
              style={{ color: '#EF4444' }}
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 size={13} className="flex-shrink-0"/>
              <span>Excluir conversa</span>
            </button>
          )}
        </>
      )}

      {view === 'pasta' && (
        <>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-widest transition-colors duration-150 hover:bg-[rgba(212,175,55,0.08)]"
            style={{ color: corSuave, borderBottom: separador }}
            onClick={() => setView('root')}
          >
            <ChevronLeft size={12}/> MOVER PARA PASTA
          </button>

          <ScrollFade className="max-h-52 py-1 scroll-area-sm" fadeSize={24} chevron={false}>
            <button
              type="button"
              className={itemBase}
              onClick={() => { onMoverPasta(null); onClose() }}
            >
              <Ban size={13} color={corSuave} className="flex-shrink-0"/>
              <span className="flex-1">Sem pasta</span>
              {!pastaAtual && <Check size={13} color={OURO}/>}
            </button>

            {pastas.map(p => (
              <button
                key={p}
                type="button"
                className={itemBase}
                onClick={() => { onMoverPasta(p); onClose() }}
              >
                <Folder size={13} color={OURO} className="flex-shrink-0"/>
                <span className="flex-1 min-w-0 truncate">{p}</span>
                {pastaAtual === p && <Check size={13} color={OURO} className="flex-shrink-0"/>}
              </button>
            ))}
          </ScrollFade>

          <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderTop: separador }}>
            <FolderPlus size={13} color={OURO} className="flex-shrink-0"/>
            <input
              autoFocus
              value={novaPasta}
              onChange={e => setNovaPasta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarPasta() }}
              placeholder="Nova pasta..."
              className="flex-1 min-w-0 bg-transparent text-xs outline-none"
              style={{ color: corTexto }} spellCheck={true} />
            <button
              type="button"
              onClick={criarPasta}
              disabled={!novaPasta.trim()}
              className="flex-shrink-0 px-2 py-1 rounded-md text-[10px] font-bold disabled:opacity-40"
              style={{ background: 'rgba(212,175,55,0.15)', color: OURO }}
            >
              Criar
            </button>
          </div>
        </>
      )}

      {view === 'caso' && (
        <>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold tracking-widest transition-colors duration-150 hover:bg-[rgba(212,175,55,0.08)]"
            style={{ color: corSuave, borderBottom: separador }}
            onClick={() => setView('root')}
          >
            <ChevronLeft size={12}/> ANEXAR A UM CASO
          </button>

          <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: separador }}>
            <Search size={12} color={corSuave} className="flex-shrink-0"/>
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cliente..."
              className="flex-1 min-w-0 bg-transparent text-xs outline-none"
              style={{ color: corTexto }} spellCheck={true} />
          </div>

          <ScrollFade className="max-h-52 py-1 scroll-area-sm" fadeSize={24} chevron={false}>
            {clientIdAtual && (
              <button
                type="button"
                className={itemBase}
                onClick={() => { onAnexarCaso(null); onClose() }}
              >
                <Ban size={13} color={corSuave} className="flex-shrink-0"/>
                <span className="flex-1">Desvincular caso</span>
              </button>
            )}

            {clientesFiltrados.length === 0 ? (
              <div className="px-3 py-4 text-center text-[11px]" style={{ color: corSuave }}>
                {clientes.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
              </div>
            ) : clientesFiltrados.map(c => (
              <button
                key={c.id}
                type="button"
                className={itemBase}
                onClick={() => { onAnexarCaso(c.id); onClose() }}
              >
                <Briefcase size={13} color={OURO} className="flex-shrink-0"/>
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{c.name}</span>
                  {c.cpf && <span className="block text-[10px]" style={{ color: corSuave }}>{c.cpf}</span>}
                </span>
                {clientIdAtual === c.id && <Check size={13} color={OURO} className="flex-shrink-0"/>}
              </button>
            ))}
          </ScrollFade>
        </>
      )}
    </div>
  )

  if (!montado) return null
  return createPortal(conteudo, document.body)
}
