/**
 * Módulos do menu do escritório.
 * Persistidos em `lawyers.modulos_ativos` (dono do office) — null = todos ativos.
 */

export type ModuloId =
  | 'dashboard'
  | 'documentos'
  | 'clientes'
  | 'equipe'
  | 'chat'
  | 'agentes'
  | 'ferramentas'
  | 'processos'
  | 'honorarios'
  | 'prazos'
  | 'assinatura'
  | 'jurisprudencia'
  | 'blog'
  | 'newsletter'
  | 'jurisdicao'
  | 'configuracoes'
  | 'suporte'
  | 'ia'
  | 'analise-previdenciaria'

export type ModulosAtivos = Partial<Record<ModuloId, boolean>>

export interface DefinicaoModulo {
  id: ModuloId
  href: string
  label: string
  /** Não pode ser desligado — acesso essencial ao produto. */
  locked: boolean
  /** Motivo exibido na UI quando locked. */
  motivoLocked?: string
  secao: 'PRINCIPAL' | 'GESTÃO' | 'SISTEMA' | 'TOPO'
}

/**
 * Catálogo alinhado ao nav de `app/(dashboard)/layout.tsx`
 * (+ rotas de topo / páginas irmãs usadas no produto).
 */
export const MODULOS_CATALOGO: DefinicaoModulo[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Início',
    locked: true,
    motivoLocked: 'Ponto de entrada do sistema',
    secao: 'PRINCIPAL',
  },
  { id: 'documentos', href: '/documentos', label: 'Documentos', locked: false, secao: 'PRINCIPAL' },
  { id: 'clientes', href: '/clientes', label: 'Clientes', locked: false, secao: 'PRINCIPAL' },
  { id: 'equipe', href: '/equipe', label: 'Minha Equipe', locked: false, secao: 'GESTÃO' },
  { id: 'chat', href: '/chat', label: 'Chat Interno', locked: false, secao: 'GESTÃO' },
  { id: 'agentes', href: '/agentes', label: 'Agentes IA', locked: false, secao: 'SISTEMA' },
  {
    id: 'analise-previdenciaria',
    href: '/analise-previdenciaria',
    label: 'Análise Previdenciária',
    locked: false,
    secao: 'SISTEMA',
  },
  { id: 'ia', href: '/ia', label: 'IA Geral', locked: false, secao: 'TOPO' },
  { id: 'ferramentas', href: '/ferramentas', label: 'Ferramentas', locked: false, secao: 'SISTEMA' },
  { id: 'processos', href: '/processos', label: 'Processos', locked: false, secao: 'SISTEMA' },
  { id: 'honorarios', href: '/honorarios', label: 'Honorários', locked: false, secao: 'SISTEMA' },
  { id: 'prazos', href: '/prazos', label: 'Prazos', locked: false, secao: 'SISTEMA' },
  {
    id: 'assinatura',
    href: '/assinatura',
    label: 'Planos & Preços',
    locked: true,
    motivoLocked: 'Cobrança e upgrade do plano',
    secao: 'SISTEMA',
  },
  { id: 'jurisprudencia', href: '/jurisprudencia', label: 'Jurisprudência', locked: false, secao: 'SISTEMA' },
  { id: 'blog', href: '/blog', label: 'Blog Jurídico', locked: false, secao: 'SISTEMA' },
  { id: 'newsletter', href: '/newsletter', label: 'Newsletter', locked: false, secao: 'SISTEMA' },
  { id: 'jurisdicao', href: '/jurisdicao', label: 'Jurisdição', locked: false, secao: 'SISTEMA' },
  {
    id: 'configuracoes',
    href: '/configuracoes',
    label: 'Configurações',
    locked: true,
    motivoLocked: 'Necessário para reativar módulos',
    secao: 'SISTEMA',
  },
  {
    id: 'suporte',
    href: '/suporte',
    label: 'Suporte',
    locked: true,
    motivoLocked: 'Canal de ajuda sempre disponível',
    secao: 'SISTEMA',
  },
]

const HREF_PARA_ID: Record<string, ModuloId> = Object.fromEntries(
  MODULOS_CATALOGO.map((m) => [m.href, m.id])
) as Record<string, ModuloId>

export function moduloIdPorHref(href: string): ModuloId | null {
  const path = href.split('?')[0].replace(/\/$/, '') || '/'
  if (HREF_PARA_ID[path]) return HREF_PARA_ID[path]
  // Prefixo: /clientes/xyz → clientes
  const found = MODULOS_CATALOGO.find(
    (m) => path === m.href || path.startsWith(m.href + '/')
  )
  return found?.id ?? null
}

/** null/undefined = todos ativos (compatível com bases antigas). */
export function isModuloAtivo(config: ModulosAtivos | null | undefined, id: ModuloId): boolean {
  const def = MODULOS_CATALOGO.find((m) => m.id === id)
  if (def?.locked) return true
  if (config == null) return true
  if (!(id in config)) return true
  return config[id] !== false
}

export function filtrarPorModulos<T extends { href: string }>(
  items: T[],
  config: ModulosAtivos | null | undefined
): T[] {
  return items.filter((item) => {
    const id = moduloIdPorHref(item.href)
    if (!id) return true
    return isModuloAtivo(config, id)
  })
}

export function podeGerenciarModulos(lawyer: {
  office_role?: string | null
  cargo?: string | null
  role?: string | null
  office_id?: string | null
}): boolean {
  if (lawyer.role === 'super_admin') return true
  if (lawyer.office_role === 'owner') return true
  if (lawyer.cargo === 'socio') return true
  // Advogado solo (sem escritório compartilhado)
  if (!lawyer.office_id) return true
  return false
}

export function configPadraoTodosAtivos(): ModulosAtivos {
  const out: ModulosAtivos = {}
  for (const m of MODULOS_CATALOGO) {
    out[m.id] = true
  }
  return out
}

export function normalizarConfig(raw: unknown): ModulosAtivos | null {
  if (raw == null) return null
  // [] ou outros arrays no JSONB são inválidos — trate como "todos ativos"
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: ModulosAtivos = {}
  for (const m of MODULOS_CATALOGO) {
    const v = (raw as Record<string, unknown>)[m.id]
    if (m.locked) {
      out[m.id] = true
      continue
    }
    if (typeof v === 'boolean') out[m.id] = v
    else out[m.id] = true
  }
  return out
}
