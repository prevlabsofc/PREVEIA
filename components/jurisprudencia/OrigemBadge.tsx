'use client'

type Origem = 'manual' | 'automatico' | string | null | undefined

function formatarData(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR')
}

/**
 * A8 — badge de origem.
 * Manual: "Importado em [data]" | Automático: "Buscado em [data]"
 * Prefere `importado_em`; cai em `created_at` se o carimbo de sync ainda não existir.
 */
export function OrigemBadge({
  origem,
  importadoEm,
  createdAt,
}: {
  origem: Origem
  importadoEm?: string | null
  createdAt?: string | null
}) {
  const auto = origem === 'automatico'
  const data = formatarData(importadoEm || createdAt)
  const rotuloBase = auto ? 'Buscado' : 'Importado'
  const texto = data ? `${rotuloBase} em ${data}` : rotuloBase

  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{
        background: auto ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.06)',
        color: auto ? '#3B82F6' : '#888',
        border: `1px solid ${auto ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
      }}
      title={auto ? 'Obtida pelo sync diário automático' : 'Cadastrada manualmente ou via CSV'}
    >
      {texto}
    </span>
  )
}
