'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid, Rows3, Columns3 } from 'lucide-react'

export type ViewMode = 'cards' | 'tabela' | 'kanban'

const STORAGE_KEY = 'marple_clientes_view'

const MODOS: { id: ViewMode; label: string; icone: typeof LayoutGrid }[] = [
  { id: 'cards', label: 'Cards', icone: LayoutGrid },
  { id: 'tabela', label: 'Tabela', icone: Rows3 },
  { id: 'kanban', label: 'Funil', icone: Columns3 },
]

function isViewMode(v: unknown): v is ViewMode {
  return v === 'cards' || v === 'tabela' || v === 'kanban'
}

/**
 * Preferência de visualização guardada em localStorage.
 *
 * É uma preferência de interface por dispositivo (o advogado pode querer o
 * funil no desktop e os cards no celular), não um dado do escritório. Guardar
 * em localStorage evita mais uma alteração de schema — o que importa enquanto
 * outros times mexem nas mesmas tabelas — e evita ida ao servidor a cada troca.
 * A leitura acontece só depois da montagem para não divergir do HTML do SSR.
 */
export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>('cards')

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY)
      if (isViewMode(salvo)) setMode(salvo)
    } catch {
      /* localStorage indisponível (modo privado): mantém o padrão. */
    }
  }, [])

  function alterar(m: ViewMode) {
    setMode(m)
    try {
      window.localStorage.setItem(STORAGE_KEY, m)
    } catch {
      /* preferência não persiste, mas a troca de visão continua funcionando. */
    }
  }

  return [mode, alterar]
}

export function ClientesViewSelector({
  mode,
  onChange,
  isLight = false,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
  isLight?: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label="Modo de visualização da carteira"
      className="inline-flex items-center gap-1 p-1 rounded-xl"
      style={{
        background: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isLight ? '#EDEDED' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {MODOS.map(({ id, label, icone: Icone }) => {
        const ativo = mode === id
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={ativo}
            title={`Visualizar em ${label}`}
            onClick={() => onChange(id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200"
            style={{
              background: ativo ? '#D4AF37' : 'transparent',
              color: ativo ? '#000' : isLight ? '#666' : '#888',
              border: `1px solid ${ativo ? '#D4AF37' : 'transparent'}`,
            }}
          >
            <Icone size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
