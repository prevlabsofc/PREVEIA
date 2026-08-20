'use client'

/**
 * Recorte por membro do escritório. O valor `'todos'` significa "todo o
 * escritório" — as consultas continuam limitadas aos advogados do mesmo
 * `office_id`, o filtro só estreita o recorte já carregado.
 */

export interface MembroResumo {
  id: string
  name: string
}

export const TODOS_OS_MEMBROS = 'todos'

export function MembroFiltro({
  membros,
  value,
  onChange,
  isLight,
}: {
  membros: MembroResumo[]
  value: string
  onChange: (valor: string) => void
  isLight?: boolean
}) {
  if (membros.length <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] font-bold tracking-widest" style={{ color: isLight ? '#5E5E5E' : '#666' }}>
        MEMBRO
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-glass px-3 text-xs"
        style={{ height: 38, minWidth: 190 }}
      >
        <option value={TODOS_OS_MEMBROS} style={{ background: '#111' }}>Todo o escritório</option>
        {membros.map(m => (
          <option key={m.id} value={m.id} style={{ background: '#111' }}>{m.name}</option>
        ))}
      </select>
    </div>
  )
}

export function MembroFiltroAviso({
  membros,
  value,
  onChange,
  className = 'mb-4',
}: {
  membros: MembroResumo[]
  value: string
  onChange: (valor: string) => void
  className?: string
}) {
  if (value === TODOS_OS_MEMBROS) return null

  return (
    <div
      className={`${className} flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs`}
      style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37' }}
    >
      Exibindo apenas dados de <strong>{membros.find(m => m.id === value)?.name}</strong>
      <button
        type="button"
        onClick={() => onChange(TODOS_OS_MEMBROS)}
        className="ml-auto underline underline-offset-2"
      >
        Limpar filtro
      </button>
    </div>
  )
}
