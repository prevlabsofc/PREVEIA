'use client'

import type { Periodo } from '@/lib/metrics/serie-temporal'

const ROTULOS: Record<Periodo, string> = { semana: 'Semana', mes: 'Mês', ano: 'Ano' }

export function PeriodoToggle({
  value,
  onChange,
}: {
  value: Periodo
  onChange: (periodo: Periodo) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {(['semana', 'mes', 'ano'] as const).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
          style={{
            background: value === p ? 'rgba(212,175,55,0.15)' : 'transparent',
            color: value === p ? '#D4AF37' : '#666',
            border: value === p ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
          }}
        >
          {ROTULOS[p]}
        </button>
      ))}
    </div>
  )
}
