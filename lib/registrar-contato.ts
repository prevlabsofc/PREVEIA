import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Nomes canônicos das colunas de CRM em `clients`.
 * Migração: supabase/migrations/20260727_clients_crm_last_contact_assigned_lawyer.sql
 */
export const COLUNA_ULTIMO_CONTATO = 'last_contact_at'
export const COLUNA_RESPONSAVEL = 'assigned_lawyer_id'

/** Limiar padrão (dias) para alerta de cliente sem contato. */
export const DIAS_ALERTA_SEM_CONTATO_PADRAO = 30

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>

let dbNavegador: Db | null = null

function clienteNavegador(): Db {
  if (!dbNavegador) {
    dbNavegador = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return dbNavegador
}

export interface RegistrarContatoOpts {
  /** Client Supabase a usar. Em rotas de API, passe o client do servidor. */
  db?: Db
  /** Momento da interação. Padrão: agora. */
  quando?: Date | string
}

/**
 * Marca que houve uma interação com o cliente — nota, petição gerada, mensagem,
 * checklist. Ponto único de escrita automática de "Último Contato Realizado":
 * features novas que criam interação devem chamar isto em vez de dar UPDATE
 * direto na coluna.
 *
 * A condição de monotonicidade vai na própria cláusula WHERE do UPDATE, então é
 * atômica: um evento antigo que chegue atrasado nunca sobrescreve um contato
 * mais recente, inclusive um que o usuário tenha preenchido à mão.
 *
 * Nunca lança — é registro secundário e não pode derrubar o fluxo principal.
 * Retorna false quando nada foi gravado (erro ou data mais antiga que a atual).
 */
export async function registrarContato(
  clientId?: string | null,
  opts: RegistrarContatoOpts = {}
): Promise<boolean> {
  if (!clientId) return false

  const momento = opts.quando ? new Date(opts.quando) : new Date()
  if (Number.isNaN(momento.getTime())) return false
  const iso = momento.toISOString()

  try {
    const db = opts.db ?? clienteNavegador()
    const { error } = await db
      .from('clients')
      .update({ [COLUNA_ULTIMO_CONTATO]: iso })
      .eq('id', clientId)
      .or(`${COLUNA_ULTIMO_CONTATO}.is.null,${COLUNA_ULTIMO_CONTATO}.lt."${iso}"`)
    return !error
  } catch {
    return false
  }
}

/**
 * Define o último contato manualmente, a partir da ficha do cliente. Diferente
 * do registro automático, aqui o valor pode retroceder: o usuário está
 * corrigindo o histórico e a correção tem precedência. Aceita null para limpar.
 */
export async function definirUltimoContato(
  clientId: string,
  quando: string | null,
  opts: { db?: Db } = {}
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const db = opts.db ?? clienteNavegador()
    const { error } = await db
      .from('clients')
      .update({ [COLUNA_ULTIMO_CONTATO]: quando })
      .eq('id', clientId)
    if (error) return { ok: false, erro: 'Não foi possível salvar o último contato. Tente novamente.' }
    return { ok: true }
  } catch {
    return { ok: false, erro: 'Não foi possível salvar o último contato. Tente novamente.' }
  }
}

/** Define o responsável pelo atendimento. `null` deixa o cliente sem responsável. */
export async function definirResponsavel(
  clientId: string,
  lawyerId: string | null,
  opts: { db?: Db } = {}
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const db = opts.db ?? clienteNavegador()
    const { error } = await db
      .from('clients')
      .update({ [COLUNA_RESPONSAVEL]: lawyerId })
      .eq('id', clientId)
    if (error) return { ok: false, erro: 'Não foi possível salvar o responsável. Tente novamente.' }
    return { ok: true }
  } catch {
    return { ok: false, erro: 'Não foi possível salvar o responsável. Tente novamente.' }
  }
}
