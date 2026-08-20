'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Loader2, MessageSquare, MoreHorizontal, Folder, FolderPlus, ChevronDown, ChevronRight,
  Briefcase, ListFilter, Trash2, Pencil, X, Check,
} from 'lucide-react'
import { ConversaContextMenu, type ClienteRef } from './ConversaContextMenu'
import { ScrollFade } from '@/components/ScrollFade'

export interface ConversaItem {
  id: string
  title: string
  updated_at: string
  pasta?: string | null
  client_id?: string | null
}

export interface PatchConversa {
  pasta?: string | null
  client_id?: string | null
}

interface Props {
  conversas: ConversaItem[]
  clientes: ClienteRef[]
  activeId: string | null
  loading: boolean
  isLight: boolean
  onSelecionar: (id: string) => void
  onExcluir: (id: string) => void
  onAtualizar: (id: string, patch: PatchConversa) => void
  onRenomearPasta: (antiga: string, nova: string) => void
}

const SEM_PASTA = '__sem_pasta__'
const STORAGE_KEY = 'marple:ia:pastas'
const OURO = '#D4AF37'
const LARGURA_MENU = 244

export function HistoricoConversas({
  conversas, clientes, activeId, loading, isLight,
  onSelecionar, onExcluir, onAtualizar, onRenomearPasta,
}: Props) {
  const [pastasCustom, setPastasCustom] = useState<string[]>([])
  const [storageCarregado, setStorageCarregado] = useState(false)
  const [filtro, setFiltro] = useState<string | null>(null)
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [recolhidas, setRecolhidas] = useState<string[]>([])
  const [criandoPasta, setCriandoPasta] = useState(false)
  const [nomeNovaPasta, setNomeNovaPasta] = useState('')
  const [renomeando, setRenomeando] = useState<string | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null)

  const timerPressao = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressaoLonga = useRef(false)

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(STORAGE_KEY)
      if (bruto) {
        const arr = JSON.parse(bruto)
        if (Array.isArray(arr)) setPastasCustom(arr.filter((p: unknown) => typeof p === 'string' && p.trim()))
      }
    } catch { /* localStorage indisponível */ }
    setStorageCarregado(true)
  }, [])

  useEffect(() => {
    if (!storageCarregado) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pastasCustom)) } catch { /* ignora */ }
  }, [pastasCustom, storageCarregado])

  useEffect(() => () => { if (timerPressao.current) clearTimeout(timerPressao.current) }, [])

  const pastas = useMemo(() => {
    const set = new Set<string>()
    conversas.forEach(c => { const p = c.pasta?.trim(); if (p) set.add(p) })
    pastasCustom.forEach(p => { if (p.trim()) set.add(p.trim()) })
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [conversas, pastasCustom])

  const clientePorId = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes])

  const filtradas = useMemo(() => {
    if (filtro === null) return conversas
    if (filtro === SEM_PASTA) return conversas.filter(c => !c.pasta?.trim())
    return conversas.filter(c => c.pasta?.trim() === filtro)
  }, [conversas, filtro])

  const grupos = useMemo(() => {
    const porPasta = new Map<string, ConversaItem[]>()
    pastas.forEach(p => porPasta.set(p, []))
    const semPasta: ConversaItem[] = []
    conversas.forEach(c => {
      const p = c.pasta?.trim()
      if (p) porPasta.get(p)?.push(c)
      else semPasta.push(c)
    })
    return [
      ...pastas.map(p => ({ chave: p, nome: p, itens: porPasta.get(p) || [], ehPasta: true })),
      { chave: SEM_PASTA, nome: 'Sem pasta', itens: semPasta, ehPasta: false },
    ].filter(g => g.ehPasta || g.itens.length > 0)
  }, [conversas, pastas])

  const conversaDoMenu = menu ? conversas.find(c => c.id === menu.id) : undefined

  const fecharMenu = useCallback(() => setMenu(null), [])

  const abrirMenuEm = useCallback((x: number, y: number, id: string) => setMenu({ x, y, id }), [])

  function abrirMenuBotao(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    e.preventDefault()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    abrirMenuEm(r.right - LARGURA_MENU, r.bottom + 6, id)
  }

  function abrirMenuContexto(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    abrirMenuEm(e.clientX, e.clientY, id)
  }

  function iniciarPressao(e: React.TouchEvent, id: string) {
    const toque = e.touches[0]
    if (!toque) return
    const { clientX, clientY } = toque
    pressaoLonga.current = false
    timerPressao.current = setTimeout(() => {
      pressaoLonga.current = true
      abrirMenuEm(clientX, clientY, id)
    }, 500)
  }

  function cancelarPressao() {
    if (timerPressao.current) {
      clearTimeout(timerPressao.current)
      timerPressao.current = null
    }
  }

  function selecionar(id: string) {
    if (pressaoLonga.current) {
      pressaoLonga.current = false
      return
    }
    onSelecionar(id)
  }

  function criarPasta() {
    const nome = nomeNovaPasta.trim()
    if (!nome) return
    setPastasCustom(prev => (prev.includes(nome) ? prev : [...prev, nome]))
    setNomeNovaPasta('')
    setCriandoPasta(false)
  }

  function registrarPasta(nome: string) {
    const limpo = nome.trim()
    if (!limpo) return
    setPastasCustom(prev => (prev.includes(limpo) ? prev : [...prev, limpo]))
  }

  function aplicarRenome() {
    const antiga = renomeando
    const nova = nomeEditado.trim()
    if (antiga && nova && nova !== antiga) {
      onRenomearPasta(antiga, nova)
      setPastasCustom(prev => {
        const restantes = prev.filter(p => p !== antiga)
        return restantes.includes(nova) ? restantes : [...restantes, nova]
      })
      if (filtro === antiga) setFiltro(nova)
      setRecolhidas(prev => prev.map(p => (p === antiga ? nova : p)))
    }
    setRenomeando(null)
    setNomeEditado('')
  }

  function removerPastaVazia(nome: string) {
    setPastasCustom(prev => prev.filter(p => p !== nome))
    if (filtro === nome) setFiltro(null)
  }

  const corTitulo = isLight ? '#1E1E1E' : '#fff'
  const corSuave = isLight ? '#888' : '#666'
  const rotuloFiltro = filtro === null ? 'Todas' : filtro === SEM_PASTA ? 'Sem pasta' : filtro

  function linhaConversa(c: ConversaItem, dentroDeGrupo: boolean) {
    const ativa = activeId === c.id
    const cliente = c.client_id ? clientePorId.get(c.client_id) : undefined
    return (
      <div
        key={c.id}
        onClick={() => selecionar(c.id)}
        onContextMenu={e => abrirMenuContexto(e, c.id)}
        onTouchStart={e => iniciarPressao(e, c.id)}
        onTouchEnd={cancelarPressao}
        onTouchMove={cancelarPressao}
        onTouchCancel={cancelarPressao}
        className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-200 group hover:bg-[rgba(212,175,55,0.05)] hover:border-[rgba(212,175,55,0.25)] ${dentroDeGrupo ? 'ml-2' : ''}`}
        style={{
          background: ativa ? 'rgba(212,175,55,0.12)' : 'transparent',
          border: ativa ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
          WebkitTouchCallout: 'none',
        }}
      >
        <MessageSquare size={13} color={ativa ? OURO : '#666'} className="flex-shrink-0"/>
        <div className="flex-1 min-w-0">
          <div className="text-xs truncate" style={{ color: ativa ? corTitulo : '#999' }}>{c.title}</div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] text-gray-600 flex-shrink-0">
              {new Date(c.updated_at).toLocaleDateString('pt-BR')}
            </span>
            {cliente && (
              <span className="flex items-center gap-0.5 min-w-0" style={{ color: OURO }} title={`Caso: ${cliente.name}`}>
                <Briefcase size={8} className="flex-shrink-0"/>
                <span className="text-[9px] truncate">{cliente.name}</span>
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Excluir conversa"
          onClick={e => { e.stopPropagation(); onExcluir(c.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: '#EF4444' }}
        >
          <Trash2 size={13}/>
        </button>
        <button
          type="button"
          aria-label="Mais opções"
          onClick={e => abrirMenuBotao(e, c.id)}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: menu?.id === c.id ? OURO : '#888' }}
        >
          <MoreHorizontal size={14}/>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full">
      <div className="flex items-center justify-between mb-2 px-1 gap-1 flex-shrink-0">
        <div className="text-[10px] font-bold tracking-widest truncate" style={{ color: '#555' }}>HISTÓRICO SALVO</div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            aria-label="Nova pasta"
            title="Nova pasta"
            onClick={() => { setCriandoPasta(v => !v); setFiltroAberto(false) }}
            className="p-1 rounded-md transition-colors hover:bg-[rgba(212,175,55,0.1)]"
            style={{ color: criandoPasta ? OURO : '#777' }}
          >
            <FolderPlus size={13}/>
          </button>
          <button
            type="button"
            aria-label="Filtrar por pasta"
            title={`Filtro: ${rotuloFiltro}`}
            onClick={() => { setFiltroAberto(v => !v); setCriandoPasta(false) }}
            className="p-1 rounded-md transition-colors hover:bg-[rgba(212,175,55,0.1)]"
            style={{ color: filtro !== null || filtroAberto ? OURO : '#777' }}
          >
            <ListFilter size={13}/>
          </button>
        </div>
      </div>

      {criandoPasta && (
        <div
          className="flex items-center gap-1.5 mb-2 px-2 py-1.5 rounded-lg flex-shrink-0"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}
        >
          <Folder size={12} color={OURO} className="flex-shrink-0"/>
          <input
            autoFocus
            value={nomeNovaPasta}
            onChange={e => setNomeNovaPasta(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') criarPasta()
              if (e.key === 'Escape') { setCriandoPasta(false); setNomeNovaPasta('') }
            }}
            placeholder="Ex.: Petições em Andamento"
            className="flex-1 min-w-0 bg-transparent text-[11px] outline-none"
            style={{ color: isLight ? '#1E1E1E' : '#ddd' }} spellCheck={true} />
          <button type="button" onClick={criarPasta} aria-label="Criar pasta" className="flex-shrink-0" style={{ color: OURO }}>
            <Check size={13}/>
          </button>
        </div>
      )}

      {filtroAberto && (
        <ScrollFade
          className="p-1 max-h-40 scroll-area-sm"
          wrapperClassName="mb-2 flex-shrink-0"
          wrapperStyle={{ background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.15)' }}
          radius={8}
          fadeSize={22}
          chevron={false}
        >
          {[{ valor: null as string | null, rotulo: 'Todas' }, ...pastas.map(p => ({ valor: p, rotulo: p })), { valor: SEM_PASTA as string | null, rotulo: 'Sem pasta' }].map(op => (
            <button
              key={op.valor ?? 'todas'}
              type="button"
              onClick={() => { setFiltro(op.valor); setFiltroAberto(false) }}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] text-left transition-colors hover:bg-[rgba(212,175,55,0.08)]"
              style={{ color: filtro === op.valor ? OURO : (isLight ? '#666' : '#999') }}
            >
              <span className="flex-1 min-w-0 truncate">{op.rotulo}</span>
              {filtro === op.valor && <Check size={11} className="flex-shrink-0"/>}
            </button>
          ))}
        </ScrollFade>
      )}

      {/*
        Wrapper em coluna flex + overflow hidden; a lista usa flex-1/min-h-0
        (não h-full solto) para o overflow-y:auto cobrir a altura inteira até o
        rodapé — evita zona morta sob o degradê/chevron do ScrollFade.
      */}
      <ScrollFade
        className="flex-1 min-h-0 pr-0.5 scroll-area-sm"
        wrapperClassName="flex flex-1 flex-col min-h-0 overflow-hidden"
        fadeSize={36}
      >
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" color={OURO}/></div>
      ) : conversas.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-600">Nenhuma conversa ainda</div>
      ) : filtro !== null ? (
        filtradas.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-600">Nenhuma conversa nesta pasta</div>
        ) : (
          <div className="space-y-1">{filtradas.map(c => linhaConversa(c, false))}</div>
        )
      ) : pastas.length === 0 ? (
        <div className="space-y-1">{conversas.map(c => linhaConversa(c, false))}</div>
      ) : (
        <div className="space-y-2">
          {grupos.map(grupo => {
            const recolhido = recolhidas.includes(grupo.chave)
            const editando = renomeando === grupo.chave
            return (
              <div key={grupo.chave}>
                <div className="flex items-center gap-1 px-1 py-1 rounded-md group/pasta transition-colors hover:bg-[rgba(212,175,55,0.05)]">
                  <button
                    type="button"
                    onClick={() => setRecolhidas(prev => (recolhido ? prev.filter(p => p !== grupo.chave) : [...prev, grupo.chave]))}
                    className="flex items-center gap-1 flex-1 min-w-0 text-left"
                    aria-expanded={!recolhido}
                  >
                    {recolhido ? <ChevronRight size={11} color={corSuave} className="flex-shrink-0"/> : <ChevronDown size={11} color={corSuave} className="flex-shrink-0"/>}
                    {grupo.ehPasta && <Folder size={11} color={OURO} className="flex-shrink-0"/>}
                    {editando ? (
                      <input
                        autoFocus
                        value={nomeEditado}
                        onChange={e => setNomeEditado(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={aplicarRenome}
                        onKeyDown={e => {
                          if (e.key === 'Enter') aplicarRenome()
                          if (e.key === 'Escape') { setRenomeando(null); setNomeEditado('') }
                        }}
                        className="flex-1 min-w-0 bg-transparent text-[10px] font-bold tracking-wide outline-none"
                        style={{ color: OURO }} spellCheck={true} />
                    ) : (
                      <span
                        className="flex-1 min-w-0 truncate text-[10px] font-bold tracking-wide"
                        style={{ color: grupo.ehPasta ? OURO : corSuave }}
                        title={grupo.nome}
                      >
                        {grupo.nome.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[9px] flex-shrink-0" style={{ color: '#555' }}>{grupo.itens.length}</span>
                  </button>

                  {grupo.ehPasta && !editando && (
                    <>
                      <button
                        type="button"
                        aria-label="Renomear pasta"
                        onClick={() => { setRenomeando(grupo.chave); setNomeEditado(grupo.nome) }}
                        className="opacity-0 group-hover/pasta:opacity-100 transition-opacity flex-shrink-0"
                        style={{ color: '#888' }}
                      >
                        <Pencil size={10}/>
                      </button>
                      {grupo.itens.length === 0 && (
                        <button
                          type="button"
                          aria-label="Remover pasta vazia"
                          onClick={() => removerPastaVazia(grupo.nome)}
                          className="opacity-0 group-hover/pasta:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: '#EF4444' }}
                        >
                          <X size={10}/>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {!recolhido && (
                  grupo.itens.length === 0 ? (
                    <div className="ml-2 px-2 py-2 text-[10px]" style={{ color: '#555' }}>Pasta vazia</div>
                  ) : (
                    <div className="space-y-1 mt-0.5">{grupo.itens.map(c => linhaConversa(c, true))}</div>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
      </ScrollFade>

      {menu && conversaDoMenu && (
        <ConversaContextMenu
          x={menu.x}
          y={menu.y}
          pastaAtual={conversaDoMenu.pasta}
          clientIdAtual={conversaDoMenu.client_id}
          pastas={pastas}
          clientes={clientes}
          isLight={isLight}
          onMoverPasta={pasta => onAtualizar(menu.id, { pasta })}
          onCriarPasta={registrarPasta}
          onAnexarCaso={client_id => onAtualizar(menu.id, { client_id })}
          onExcluir={() => onExcluir(menu.id)}
          onClose={fecharMenu}
        />
      )}
    </div>
  )
}
