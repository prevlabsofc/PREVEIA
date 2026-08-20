'use client'

export type DestinoPublicacaoId = 'portal_cliente' | 'site_escritorio' | 'linkedin'

export const DESTINOS_PUBLICACAO: {
  id: DestinoPublicacaoId
  label: string
  descricao: (ctx: { oab?: string | null; siteUrl?: string | null; linkedinUrl?: string | null }) => string
  disponivel: (ctx: { oab?: string | null; siteUrl?: string | null; linkedinUrl?: string | null }) => boolean
}[] = [
  {
    id: 'portal_cliente',
    label: 'Perfil público Marple',
    descricao: ({ oab }) =>
      oab
        ? `Será publicado em: Perfil público (/advogado/${oab})`
        : 'Será publicado em: Perfil público do advogado (configure a OAB em Configurações)',
    disponivel: () => true,
  },
  {
    id: 'site_escritorio',
    label: 'Site do escritório',
    descricao: ({ siteUrl }) =>
      siteUrl
        ? `Será publicado em: Site do escritório (${siteUrl})`
        : 'Site do escritório (configure a URL em Configurações)',
    disponivel: ({ siteUrl }) => Boolean(siteUrl),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    descricao: ({ linkedinUrl }) =>
      linkedinUrl
        ? `Será publicado em: LinkedIn (${linkedinUrl})`
        : 'LinkedIn (configure a URL em Configurações)',
    disponivel: ({ linkedinUrl }) => Boolean(linkedinUrl),
  },
]

/** A11 — clarifica onde o artigo será publicado. */
export function DestinoPublicacao({
  value,
  onChange,
  oab,
  siteUrl,
  linkedinUrl,
  publicado,
}: {
  value: DestinoPublicacaoId
  onChange: (v: DestinoPublicacaoId) => void
  oab?: string | null
  siteUrl?: string | null
  linkedinUrl?: string | null
  publicado: boolean
}) {
  const ctx = { oab, siteUrl, linkedinUrl }
  const disponiveis = DESTINOS_PUBLICACAO.filter(d => d.disponivel(ctx))
  const unico = disponiveis.length === 1
  const atual = DESTINOS_PUBLICACAO.find(d => d.id === value) || DESTINOS_PUBLICACAO[0]

  if (!publicado) {
    return (
      <p className="text-[11px] mt-1" style={{ color: '#666' }}>
        Rascunho — só fica visível no dashboard até você publicar.
      </p>
    )
  }

  if (unico) {
    return (
      <p className="text-[11px] mt-1.5" style={{ color: '#D4AF37' }}>
        {disponiveis[0].descricao(ctx)}
      </p>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="block text-[10px] font-bold tracking-widest" style={{ color: 'rgba(212,175,55,0.7)' }}>
        DESTINO DA PUBLICAÇÃO
      </label>
      <div className="space-y-1.5">
        {disponiveis.map(d => {
          const ativo = value === d.id
          return (
            <label
              key={d.id}
              className="flex items-start gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
              style={{
                background: ativo ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${ativo ? 'rgba(212,175,55,0.35)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <input
                type="radio"
                name="destino_publicacao"
                checked={ativo}
                onChange={() => onChange(d.id)}
                className="mt-0.5"
              />
              <span className="text-xs" style={{ color: ativo ? '#D4AF37' : '#bbb' }}>
                <span className="font-bold block">{d.label}</span>
                <span style={{ color: '#888' }}>{d.descricao(ctx)}</span>
              </span>
            </label>
          )
        })}
      </div>
      {!disponiveis.some(d => d.id === value) && (
        <p className="text-[11px]" style={{ color: '#EF4444' }}>
          Destino selecionado indisponível. Escolha outro acima.
        </p>
      )}
      <p className="text-[11px]" style={{ color: '#888' }}>{atual.descricao(ctx)}</p>
    </div>
  )
}
