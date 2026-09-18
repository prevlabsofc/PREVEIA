/**
 * Schema canônico de `public.clients` (produção Supabase).
 *
 * Colunas EXATAS:
 * id, lawyer_id, name, cpf, rg, birth_date, phone, whatsapp, email,
 * profession, zone, cep, address, rua, numero, bairro, city, state, notes,
 * sexo, status, created_at, ultimo_contato, lembrete_enviado_em
 *
 * NÃO existem: nome, telefone, tipo_beneficio, etapa_funil, stage, arquivado,
 * last_contact_at, office_id, assigned_lawyer_id…
 */

export const CLIENTS_COLUMNS =
  'id, lawyer_id, name, cpf, rg, birth_date, phone, whatsapp, email, profession, zone, cep, address, rua, numero, bairro, city, state, notes, sexo, status, created_at, ultimo_contato, lembrete_enviado_em' as const

export const CLIENTS_SELECT_SAFE = CLIENTS_COLUMNS

/** @deprecated use CLIENTS_SELECT_SAFE */
export const CLIENTS_SELECT_PT = CLIENTS_SELECT_SAFE

/** @deprecated use CLIENTS_SELECT_SAFE */
export const CLIENTS_SELECT_EN = CLIENTS_SELECT_SAFE

/** Valores canônicos de `clients.status` (CHECK no banco). */
export const STATUS_ATIVO = 'active'
export const STATUS_ARQUIVADO = 'archived'

export type ClienteNormalizado = Record<string, unknown> & {
  id: string
  name: string
  nome: string
  cpf: string
  phone: string
  telefone: string
  email: string
  /** Alias de UI — funil não existe no banco; sempre default. */
  stage: string
  etapa_funil: string
  /** Espelha o banco: 'active' | 'archived'. */
  status: 'active' | 'archived'
  arquivado: boolean
  address: string
  rua: string
  numero: string
  bairro: string
  city: string
  state: string
  zone: string
  cep: string
  /** Sexo da parte autora: 'masculino' | 'feminino' | ''. */
  sexo: string
  last_contact_at: string | null
  ultimo_contato: string | null
  lembrete_enviado_em: string | null
  /** Sem coluna no banco — derivado de zone ou null. */
  tipo_beneficio: string | null
  lawyer_id?: string | null
  created_at?: string | null
}

function zonaUi(v: unknown): string {
  if (v === true || v === 'rural' || v === 'Rural') return 'rural'
  if (v === false || v === 'urban' || v === 'urbano' || v === 'Urbano') return 'urban'
  if (typeof v === 'string' && v.trim()) return v.trim().toLowerCase()
  return 'rural'
}

/** Normaliza qualquer valor legado para o CHECK do banco. */
export function normalizeStatusToDb(status: unknown): 'active' | 'archived' {
  const s = String(status ?? '').toLowerCase().trim()
  if (s === 'archived' || s === 'arquivado') return STATUS_ARQUIVADO
  // ativo, active, inativo, inactive, vazio ou qualquer outro → active
  return STATUS_ATIVO
}

export function isStatusArquivado(status: unknown): boolean {
  return normalizeStatusToDb(status) === STATUS_ARQUIVADO
}

export function isStatusAtivo(status: unknown): boolean {
  return normalizeStatusToDb(status) === STATUS_ATIVO
}

/** Une linha do banco num objeto estável para a UI. */
export function normalizeCliente(row: Record<string, unknown> | null | undefined): ClienteNormalizado {
  const r = row ?? {}
  const statusDb = normalizeStatusToDb(r.status)
  const arquivado = statusDb === STATUS_ARQUIVADO || r.arquivado === true || r.arquivado === 'true'
  const nome = String(r.name ?? '')
  const telefone = String(r.phone ?? '')
  const zone = zonaUi(r.zone)
  const ultimo = (r.ultimo_contato ?? null) as string | null
  const address = String(r.address ?? '')
  const ruaDb = String(r.rua ?? r.logradouro ?? '').trim()
  const numero = String(r.numero ?? '').trim()
  const bairro = String(r.bairro ?? '').trim()
  // Sem campos estruturados: usa address legado como rua
  const rua = ruaDb || (!numero && !bairro ? address : '')

  return {
    ...r,
    id: String(r.id ?? ''),
    name: nome,
    nome,
    cpf: String(r.cpf ?? ''),
    phone: telefone,
    telefone,
    email: String(r.email ?? ''),
    // Funil não existe no remoto — UI usa default sem gravar.
    stage: 'atendimento_triagem',
    etapa_funil: 'atendimento_triagem',
    status: arquivado ? STATUS_ARQUIVADO : STATUS_ATIVO,
    arquivado,
    address,
    rua,
    numero,
    bairro,
    city: String(r.city ?? ''),
    state: String(r.state ?? ''),
    zone,
    cep: String(r.cep ?? ''),
    sexo: String(r.sexo ?? r.genero ?? '').trim().toLowerCase(),
    last_contact_at: ultimo,
    ultimo_contato: ultimo,
    lembrete_enviado_em: (r.lembrete_enviado_em as string | null) ?? null,
    tipo_beneficio: null,
    lawyer_id: (r.lawyer_id as string | null) ?? null,
    created_at: (r.created_at as string | null) ?? null,
    whatsapp: String(r.whatsapp ?? telefone ?? ''),
    profession: String(r.profession ?? ''),
    notes: String(r.notes ?? ''),
    rg: String(r.rg ?? ''),
    birth_date: (r.birth_date as string | null) ?? null,
  }
}

type Supa = {
  from: (t: string) => any
}

export async function fetchClientsByLawyer(
  supabase: Supa,
  lawyerId: string,
): Promise<ClienteNormalizado[]> {
  try {
    const attempts = [
      CLIENTS_SELECT_SAFE,
      CLIENTS_COLUMNS.replace(/, sexo/, ''),
      CLIENTS_COLUMNS.replace(/, rua, numero, bairro/, '').replace(/, sexo/, ''),
      '*',
    ] as const
    for (const cols of attempts) {
      const { data, error } = await supabase
        .from('clients')
        .select(cols as string)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })

      if (!error) {
        return ((data as unknown as Record<string, unknown>[]) || []).map(normalizeCliente)
      }
      console.warn('[clients] select falhou com cols:', cols, error.message)
    }
    return []
  } catch (err) {
    console.error('[clients] fetchClientsByLawyer catch:', err)
    return []
  }
}

/** Sem coluna de etapa — no-op no banco. */
export function updateEtapaFunilPayload(_destino: string): Record<string, never> {
  return {}
}

/** Arquivamento via `status` (`active` | `archived`). */
export function updateArquivadoPayload(arquivado: boolean): { status: 'active' | 'archived' } {
  return { status: arquivado ? STATUS_ARQUIVADO : STATUS_ATIVO }
}

/** Payload de insert com somente colunas reais. */
export function buildClientInsertPayload(input: {
  lawyerId: string
  name: string
  cpf: string
  phone?: string
  whatsapp?: string
  email?: string
  profession?: string
  zone?: string
  cep?: string
  address?: string
  rua?: string
  numero?: string
  bairro?: string
  city?: string
  state?: string
  notes?: string
  rg?: string
  birth_date?: string | null
  sexo?: string | null
}): Record<string, unknown> {
  return {
    lawyer_id: input.lawyerId,
    name: input.name,
    cpf: input.cpf,
    rg: input.rg || null,
    birth_date: input.birth_date || null,
    phone: input.phone || '',
    whatsapp: input.whatsapp || input.phone || '',
    email: input.email || '',
    profession: input.profession || '',
    zone: input.zone || 'rural',
    cep: input.cep || '',
    address: input.address || '',
    rua: input.rua || '',
    numero: input.numero || '',
    bairro: input.bairro || '',
    city: input.city || '',
    state: input.state || '',
    notes: input.notes || '',
    sexo: input.sexo || null,
    status: STATUS_ATIVO,
  }
}
