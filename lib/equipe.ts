import type { SupabaseClient } from '@supabase/supabase-js'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>

export interface MembroEquipe {
  id: string
  name: string | null
  office_role?: string | null
}

export const ROTULO_SEM_RESPONSAVEL = 'Sem responsável'

/**
 * Membros do escritório do usuário, mesmo escopo usado em /equipe e /chat:
 * `lawyers.office_id` do próprio usuário. Conta sem escritório (advogado
 * individual) tem equipe de uma pessoa só.
 */
export async function carregarMembrosEscritorio(db: Db, userId: string): Promise<MembroEquipe[]> {
  const { data: eu } = await db
    .from('lawyers')
    .select('id, name, office_id, office_role')
    .eq('id', userId)
    .maybeSingle()
  if (!eu) return []

  if (!eu.office_id) {
    return [{ id: eu.id, name: eu.name, office_role: eu.office_role }]
  }

  const { data: time } = await db
    .from('lawyers')
    .select('id, name, office_role')
    .eq('office_id', eu.office_id)
    .order('name')

  const membros = (time as MembroEquipe[]) || []
  // O próprio usuário pode não constar caso office_id ainda não tenha sido
  // gravado no registro dele; sem isso ele não conseguiria se atribuir.
  if (!membros.some(m => m.id === eu.id)) {
    membros.unshift({ id: eu.id, name: eu.name, office_role: eu.office_role })
  }
  return membros
}

/**
 * Nomes de advogados que não estão na equipe atual. Cobre o responsável que
 * saiu do escritório: o vínculo continua válido no banco (a conta existe), mas
 * o id não aparece mais na listagem — sem isso a ficha mostraria um id solto.
 */
export async function carregarNomesForaDaEquipe(
  db: Db,
  ids: string[]
): Promise<Record<string, string>> {
  const unicos = Array.from(new Set(ids.filter(Boolean)))
  if (unicos.length === 0) return {}
  const { data } = await db.from('lawyers').select('id, name').in('id', unicos)
  const mapa: Record<string, string> = {}
  for (const l of (data as { id: string; name: string | null }[]) || []) {
    mapa[l.id] = l.name?.trim() || 'Membro sem nome'
  }
  return mapa
}

/**
 * Rótulo do responsável pelo atendimento. Trata os três estados possíveis:
 * sem responsável, membro atual da equipe e conta que não está mais na equipe.
 */
export function rotuloResponsavel(
  lawyerId: string | null | undefined,
  membros: MembroEquipe[],
  nomesExtras: Record<string, string> = {}
): { texto: string; foraDaEquipe: boolean; atribuido: boolean } {
  if (!lawyerId) return { texto: ROTULO_SEM_RESPONSAVEL, foraDaEquipe: false, atribuido: false }

  const membro = membros.find(m => m.id === lawyerId)
  if (membro) {
    return { texto: membro.name?.trim() || 'Membro sem nome', foraDaEquipe: false, atribuido: true }
  }

  const nome = nomesExtras[lawyerId]
  return {
    texto: nome ? `${nome} (fora da equipe)` : 'Responsável fora da equipe',
    foraDaEquipe: true,
    atribuido: true,
  }
}
