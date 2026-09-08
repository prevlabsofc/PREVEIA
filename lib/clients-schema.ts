/**
 * Schema seguro de `public.clients` — colunas confirmadas via REST (produção).
 *
 * Existem: id, name, cpf, phone, email, whatsapp, created_at, lawyer_id,
 * address, city, state, zone, rg, birth_date, profession, notes, status,
 * ultimo_contato, cep
 *
 * NÃO existem (400): nome, telefone, tipo_beneficio, office_id, etapa_funil,
 * stage, arquivado, last_contact_at, assigned_lawyer_id
 *
 * `zone` = rural/urbano. Funil/arquivamento usam `status` até as migrações
 * CRM/funil serem aplicadas no projeto remoto.
 */

export const CLIENTS_SELECT_SAFE =
  'id, name, cpf, phone, email, whatsapp, created_at, lawyer_id, address, city, state, zone, rg, birth_date, profession, notes, status, ultimo_contato'

/** @deprecated use CLIENTS_SELECT_SAFE — mantido como alias. */
export const CLIENTS_SELECT_PT = CLIENTS_SELECT_SAFE

/** @deprecated use CLIENTS_SELECT_SAFE. */
export const CLIENTS_SELECT_EN = CLIENTS_SELECT_SAFE

export type ClienteNormalizado = Record<string, unknown> & {
  id: string
  name: string
  nome: string
  cpf: string
  phone: string
  telefone: string
  email: string
  stage: string
  etapa_funil: string
  status: 'active' | 'archived'
  arquivado: boolean
  address: string
  city: string
  state: string
  zone: string
  last_contact_at: string | null
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

/** Une aliases legados num objeto estável para a UI. */
export function normalizeCliente(row: Record<string, unknown> | null | undefined): ClienteNormalizado {
  const r = row ?? {}
  const arquivado =
    r.arquivado === true ||
    r.arquivado === 'true' ||
    r.status === 'archived'
  // Sem coluna de funil no remoto: UI usa default estável.
  const etapa = String(r.etapa_funil ?? r.stage ?? 'atendimento_triagem')
  const nome = String(r.name ?? r.nome ?? '')
  const telefone = String(r.phone ?? r.telefone ?? '')
  const zone = zonaUi(r.zone ?? r.zona_rural)

  return {
    ...r,
    id: String(r.id ?? ''),
    name: nome,
    nome,
    cpf: String(r.cpf ?? ''),
    phone: telefone,
    telefone,
    email: String(r.email ?? ''),
    stage: etapa,
    etapa_funil: etapa,
    status: arquivado ? 'archived' : 'active',
    arquivado,
    address: String(r.address ?? r.endereco ?? ''),
    city: String(r.city ?? r.cidade ?? ''),
    state: String(r.state ?? r.estado ?? ''),
    zone,
    last_contact_at: (r.ultimo_contato ?? r.last_contact_at ?? null) as string | null,
    tipo_beneficio:
      (r.tipo_beneficio as string | null) ??
      (zone === 'rural' ? 'rural' : zone === 'urban' ? 'urbano' : null),
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

/**
 * Carrega clientes do advogado com fallback de colunas.
 * Nunca propaga 400: em falha total devolve [].
 */
export async function fetchClientsByLawyer(
  supabase: Supa,
  lawyerId: string,
): Promise<ClienteNormalizado[]> {
  try {
    const tentativas = [CLIENTS_SELECT_SAFE, '*'] as const
    for (const cols of tentativas) {
      const { data, error } = await supabase
        .from('clients')
        .select(cols as string)
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })

      if (!error) {
        return ((data as unknown as Record<string, unknown>[]) || []).map(normalizeCliente)
      }
      console.error('[clients] select falhou:', cols, error.message)
    }
    return []
  } catch (err) {
    console.error('[clients] fetchClientsByLawyer catch:', err)
    return []
  }
}

/**
 * Payload de etapa do funil.
 * Remoto ainda não tem `etapa_funil`/`stage` — devolve objeto vazio para evitar 400.
 * Quando a migração for aplicada, troque para `{ etapa_funil: destino }`.
 */
export function updateEtapaFunilPayload(_destino: string): Record<string, never> {
  return {}
}

/** Payload de arquivamento via `status` (coluna real em produção). */
export function updateArquivadoPayload(arquivado: boolean): { status: 'active' | 'archived' } {
  return { status: arquivado ? 'archived' : 'active' }
}
