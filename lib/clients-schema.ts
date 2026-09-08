/**
 * Schema seguro de `public.clients` para produção.
 *
 * Em algumas bases as colunas canônicas são as PT-BR abaixo (sem `stage`/`status`).
 * Em bases legadas ainda existem equivalentes EN (`name`, `phone`, `stage`, …).
 * Sempre normalize o resultado para o formato EN esperado pela UI.
 */

export const CLIENTS_SELECT_SAFE =
  'id, nome, cpf, telefone, email, whatsapp, created_at, lawyer_id, tipo_beneficio, address, city, state, zone, rg, birth_date, last_contact_at, etapa_funil, arquivado, profession, notes, cep'

/** @deprecated use CLIENTS_SELECT_SAFE — mantido como alias. */
export const CLIENTS_SELECT_PT = CLIENTS_SELECT_SAFE

/** Fallback se a base ainda usar `name`/`phone` em vez de `nome`/`telefone`. */
export const CLIENTS_SELECT_EN =
  'id, name, cpf, phone, email, whatsapp, created_at, lawyer_id, tipo_beneficio, address, city, state, zone, rg, birth_date, last_contact_at, etapa_funil, arquivado, profession, notes, cep'

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

/** Une PT-BR e EN num objeto estável para a UI. */
export function normalizeCliente(row: Record<string, unknown> | null | undefined): ClienteNormalizado {
  const r = row ?? {}
  const arquivado =
    r.arquivado === true ||
    r.arquivado === 'true' ||
    r.status === 'archived'
  const etapa = String(r.etapa_funil ?? r.stage ?? 'atendimento_triagem')
  const nome = String(r.nome ?? r.name ?? '')
  const telefone = String(r.telefone ?? r.phone ?? '')

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
    address: String(r.endereco ?? r.address ?? ''),
    city: String(r.cidade ?? r.city ?? ''),
    state: String(r.estado ?? r.state ?? ''),
    zone: zonaUi(r.zona_rural ?? r.zone),
    last_contact_at: (r.ultimo_contato ?? r.last_contact_at ?? null) as string | null,
    tipo_beneficio: (r.tipo_beneficio as string | null) ?? null,
    lawyer_id: (r.lawyer_id as string | null) ?? null,
    created_at: (r.created_at as string | null) ?? null,
    whatsapp: String(r.whatsapp ?? telefone ?? ''),
    profession: String(r.profession ?? ''),
    notes: String(r.notes ?? ''),
    cep: String(r.cep ?? ''),
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
    const tentativas = [CLIENTS_SELECT_SAFE, CLIENTS_SELECT_EN, '*'] as const
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

/** Payload de etapa do funil — só `etapa_funil` (sem `stage`). */
export function updateEtapaFunilPayload(destino: string): { etapa_funil: string } {
  return { etapa_funil: destino }
}

/** Payload de arquivamento — só `arquivado` (sem `status`). */
export function updateArquivadoPayload(arquivado: boolean): { arquivado: boolean } {
  return { arquivado }
}
