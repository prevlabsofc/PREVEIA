/**
 * Persistência das cópias de modelo do advogado/escritório em `lawyer_templates`.
 * Os padrões do sistema ficam apenas em código (`padrao.ts`) e nunca são sobrescritos.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { MODELOS_PADRAO, getModeloPadrao } from './padrao'
import {
  type ModeloEscritorio,
  type ModeloListagem,
  type TipoModeloDocumento,
  idPadrao,
  isIdPadrao,
  extrairIdPadrao,
  isTipoModelo,
} from './tipos'

const COLS =
  'id, lawyer_id, nome, conteudo, tipo, origem_padrao_id, versao_padrao, created_at, updated_at'

function normalizeRow(row: Record<string, unknown>): ModeloEscritorio | null {
  if (!row?.id) return null
  const tipoRaw = String(row.tipo || 'peticao')
  const tipo: TipoModeloDocumento = isTipoModelo(tipoRaw) ? tipoRaw : 'peticao'
  return {
    id: String(row.id),
    lawyer_id: String(row.lawyer_id || ''),
    nome: String(row.nome || ''),
    tipo,
    conteudo: String(row.conteudo || ''),
    origem_padrao_id: row.origem_padrao_id ? String(row.origem_padrao_id) : null,
    versao_padrao:
      row.versao_padrao != null && row.versao_padrao !== ''
        ? Number(row.versao_padrao)
        : null,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || row.created_at || ''),
  }
}

export async function listarModelosEscritorio(
  supabase: SupabaseClient,
  lawyerId: string
): Promise<{ data: ModeloEscritorio[]; error: string | null; semColunasExtras: boolean }> {
  const { data, error } = await supabase
    .from('lawyer_templates')
    .select(COLS)
    .eq('lawyer_id', lawyerId)
    .order('updated_at', { ascending: false })

  if (!error) {
    return {
      data: ((data as Record<string, unknown>[]) || [])
        .map(normalizeRow)
        .filter((m): m is ModeloEscritorio => Boolean(m)),
      error: null,
      semColunasExtras: false,
    }
  }

  // Fallback se a migração origem_padrao_id ainda não foi aplicada
  const fb = await supabase
    .from('lawyer_templates')
    .select('id, lawyer_id, nome, conteudo, tipo, created_at, updated_at')
    .eq('lawyer_id', lawyerId)
    .order('updated_at', { ascending: false })

  if (fb.error) {
    return { data: [], error: fb.error.message, semColunasExtras: true }
  }

  return {
    data: ((fb.data as Record<string, unknown>[]) || [])
      .map((r) =>
        normalizeRow({
          ...r,
          origem_padrao_id: null,
          versao_padrao: null,
        })
      )
      .filter((m): m is ModeloEscritorio => Boolean(m)),
    error: null,
    semColunasExtras: true,
  }
}

export function listarModelosUnificados(
  copias: ModeloEscritorio[]
): ModeloListagem[] {
  const padroes: ModeloListagem[] = MODELOS_PADRAO.map((p) => ({
    id: idPadrao(p.id),
    nome: p.nome,
    tipo: p.tipo,
    descricao: p.descricao,
    conteudo: p.conteudo,
    origem: 'padrao',
    origem_padrao_id: p.id,
    versao: p.versao,
    atualizadoEm: null,
    protegido: true,
  }))

  const proprios: ModeloListagem[] = copias.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    conteudo: c.conteudo,
    origem: 'escritorio',
    origem_padrao_id: c.origem_padrao_id,
    versao: c.versao_padrao,
    atualizadoEm: c.updated_at,
    protegido: false,
  }))

  return [...padroes, ...proprios]
}

export async function obterModeloPorId(
  supabase: SupabaseClient,
  lawyerId: string,
  id: string
): Promise<ModeloListagem | null> {
  if (isIdPadrao(id)) {
    const pid = extrairIdPadrao(id)
    const p = pid ? getModeloPadrao(pid) : undefined
    if (!p) return null
    return {
      id: idPadrao(p.id),
      nome: p.nome,
      tipo: p.tipo,
      descricao: p.descricao,
      conteudo: p.conteudo,
      origem: 'padrao',
      origem_padrao_id: p.id,
      versao: p.versao,
      atualizadoEm: null,
      protegido: true,
    }
  }

  const { data, error } = await supabase
    .from('lawyer_templates')
    .select(COLS)
    .eq('id', id)
    .eq('lawyer_id', lawyerId)
    .maybeSingle()

  if (!error && data) {
    const n = normalizeRow(data as Record<string, unknown>)
    if (!n) return null
    return {
      id: n.id,
      nome: n.nome,
      tipo: n.tipo,
      conteudo: n.conteudo,
      origem: 'escritorio',
      origem_padrao_id: n.origem_padrao_id,
      versao: n.versao_padrao,
      atualizadoEm: n.updated_at,
      protegido: false,
    }
  }

  const fb = await supabase
    .from('lawyer_templates')
    .select('id, lawyer_id, nome, conteudo, tipo, created_at, updated_at')
    .eq('id', id)
    .eq('lawyer_id', lawyerId)
    .maybeSingle()

  if (fb.error || !fb.data) return null
  const n = normalizeRow({
    ...(fb.data as Record<string, unknown>),
    origem_padrao_id: null,
    versao_padrao: null,
  })
  if (!n) return null
  return {
    id: n.id,
    nome: n.nome,
    tipo: n.tipo,
    conteudo: n.conteudo,
    origem: 'escritorio',
    origem_padrao_id: null,
    versao: null,
    atualizadoEm: n.updated_at,
    protegido: false,
  }
}

export async function salvarCopiaModelo(
  supabase: SupabaseClient,
  opts: {
    lawyerId: string
    nome: string
    tipo: TipoModeloDocumento
    conteudo: string
    origemPadraoId?: string | null
    versaoPadrao?: number | null
    /** Se informado, atualiza a cópia existente (nunca um padrão). */
    idExistente?: string | null
  }
): Promise<{ data: ModeloEscritorio | null; error: string | null }> {
  const agora = new Date().toISOString()
  const payloadCompleto = {
    nome: opts.nome.trim(),
    tipo: opts.tipo,
    conteudo: opts.conteudo,
    origem_padrao_id: opts.origemPadraoId || null,
    versao_padrao: opts.versaoPadrao ?? null,
    updated_at: agora,
  }

  if (opts.idExistente && !isIdPadrao(opts.idExistente)) {
    const { data, error } = await supabase
      .from('lawyer_templates')
      .update(payloadCompleto)
      .eq('id', opts.idExistente)
      .eq('lawyer_id', opts.lawyerId)
      .select(COLS)
      .maybeSingle()

    if (!error && data) {
      return { data: normalizeRow(data as Record<string, unknown>), error: null }
    }

    // Fallback sem colunas extras
    const fb = await supabase
      .from('lawyer_templates')
      .update({
        nome: payloadCompleto.nome,
        tipo: payloadCompleto.tipo,
        conteudo: payloadCompleto.conteudo,
        updated_at: agora,
      })
      .eq('id', opts.idExistente)
      .eq('lawyer_id', opts.lawyerId)
      .select('id, lawyer_id, nome, conteudo, tipo, created_at, updated_at')
      .maybeSingle()

    if (fb.error || !fb.data) {
      return { data: null, error: fb.error?.message || error?.message || 'Falha ao salvar' }
    }
    return {
      data: normalizeRow({
        ...(fb.data as Record<string, unknown>),
        origem_padrao_id: opts.origemPadraoId || null,
        versao_padrao: opts.versaoPadrao ?? null,
      }),
      error: null,
    }
  }

  const insertCompleto = {
    ...payloadCompleto,
    lawyer_id: opts.lawyerId,
    created_at: agora,
  }

  const { data, error } = await supabase
    .from('lawyer_templates')
    .insert(insertCompleto)
    .select(COLS)
    .maybeSingle()

  if (!error && data) {
    return { data: normalizeRow(data as Record<string, unknown>), error: null }
  }

  const fb = await supabase
    .from('lawyer_templates')
    .insert({
      lawyer_id: opts.lawyerId,
      nome: payloadCompleto.nome,
      tipo: payloadCompleto.tipo,
      conteudo: payloadCompleto.conteudo,
      created_at: agora,
      updated_at: agora,
    })
    .select('id, lawyer_id, nome, conteudo, tipo, created_at, updated_at')
    .maybeSingle()

  if (fb.error || !fb.data) {
    return { data: null, error: fb.error?.message || error?.message || 'Falha ao criar cópia' }
  }

  return {
    data: normalizeRow({
      ...(fb.data as Record<string, unknown>),
      origem_padrao_id: opts.origemPadraoId || null,
      versao_padrao: opts.versaoPadrao ?? null,
    }),
    error: null,
  }
}

export async function duplicarModelo(
  supabase: SupabaseClient,
  lawyerId: string,
  modelo: ModeloListagem,
  novoNome?: string
): Promise<{ data: ModeloEscritorio | null; error: string | null }> {
  const nome = novoNome?.trim() || `${modelo.nome} (cópia)`
  return salvarCopiaModelo(supabase, {
    lawyerId,
    nome,
    tipo: modelo.tipo,
    conteudo: modelo.conteudo,
    origemPadraoId: modelo.origem_padrao_id,
    versaoPadrao: modelo.versao,
  })
}

export async function excluirModeloEscritorio(
  supabase: SupabaseClient,
  lawyerId: string,
  id: string
): Promise<{ error: string | null }> {
  if (isIdPadrao(id)) return { error: 'Modelos padrão do sistema não podem ser excluídos.' }
  const { error } = await supabase
    .from('lawyer_templates')
    .delete()
    .eq('id', id)
    .eq('lawyer_id', lawyerId)
  return { error: error?.message || null }
}
