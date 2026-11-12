import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildClientInsertPayload } from '@/lib/clients-schema'
import { juntarEnderecoLegado } from '@/lib/formatar-endereco'
import { registrarContato } from '@/lib/registrar-contato'

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

export type ClientNote = {
  id: string
  client_id: string
  lawyer_id: string
  texto: string
  created_at: string
  autor_nome: string
}

type LinhaRaw = {
  id: string
  client_id: string
  lawyer_id: string
  texto: string
  created_at: string
  lawyers?: { name?: string | null } | { name?: string | null }[] | null
}

function nomeDoJoin(lawyers: LinhaRaw['lawyers']): string {
  if (!lawyers) return 'Advogado'
  const row = Array.isArray(lawyers) ? lawyers[0] : lawyers
  const nome = row?.name?.trim()
  return nome || 'Advogado'
}

/** Lista anotações do cliente, mais recente no topo. */
export async function listarAnotacoesCliente(
  clientId: string,
  opts: { db?: Db } = {}
): Promise<{ ok: boolean; notes: ClientNote[]; erro?: string }> {
  try {
    const db = opts.db ?? clienteNavegador()
    const { data, error } = await db
      .from('client_notes')
      .select('id, client_id, lawyer_id, texto, created_at, lawyers(name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      return { ok: false, notes: [], erro: error.message }
    }

    const notes: ClientNote[] = ((data as LinhaRaw[]) || []).map((n) => ({
      id: n.id,
      client_id: n.client_id,
      lawyer_id: n.lawyer_id,
      texto: n.texto,
      created_at: n.created_at,
      autor_nome: nomeDoJoin(n.lawyers),
    }))
    return { ok: true, notes }
  } catch (err) {
    return { ok: false, notes: [], erro: String(err) }
  }
}

/** Insere anotação (sempre INSERT — nunca sobrescreve). */
export async function adicionarAnotacaoCliente(
  clientId: string,
  texto: string,
  opts: { db?: Db; lawyerId?: string } = {}
): Promise<{ ok: boolean; note?: ClientNote; erro?: string }> {
  const limpo = texto.trim()
  if (!limpo) return { ok: false, erro: 'Escreva a anotação antes de salvar.' }

  try {
    const db = opts.db ?? clienteNavegador()
    let lawyerId = opts.lawyerId
    if (!lawyerId) {
      const { data: { user } } = await db.auth.getUser()
      if (!user) return { ok: false, erro: 'Sessão expirada. Faça login novamente.' }
      lawyerId = user.id
    }

    const { data, error } = await db
      .from('client_notes')
      .insert({
        client_id: clientId,
        lawyer_id: lawyerId,
        texto: limpo,
      })
      .select('id, client_id, lawyer_id, texto, created_at, lawyers(name)')
      .maybeSingle()

    if (error || !data) {
      return { ok: false, erro: error?.message || 'Não foi possível salvar a anotação.' }
    }

    void registrarContato(clientId, { db })

    const row = data as LinhaRaw
    return {
      ok: true,
      note: {
        id: row.id,
        client_id: row.client_id,
        lawyer_id: row.lawyer_id,
        texto: row.texto,
        created_at: row.created_at,
        autor_nome: nomeDoJoin(row.lawyers),
      },
    }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

/**
 * Exclui anotação. RLS garante: só o autor ou owner (admin) do escritório.
 * A UI também esconde o botão para quem não pode.
 */
export async function excluirAnotacaoCliente(
  noteId: string,
  opts: { db?: Db } = {}
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const db = opts.db ?? clienteNavegador()
    const { error } = await db.from('client_notes').delete().eq('id', noteId)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: String(err) }
  }
}

/** Autor da nota ou owner do escritório (admin). */
export function podeExcluirAnotacao(
  note: { lawyer_id: string },
  userId: string | null | undefined,
  officeRole: string | null | undefined
): boolean {
  if (!userId) return false
  if (note.lawyer_id === userId) return true
  return officeRole === 'owner'
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim()
}

/**
 * Ao gerar petição com "Observações sobre o cliente" preenchidas:
 * vincula ao cliente selecionado ou cria o cliente a partir do formulário
 * (nome manual) e faz INSERT em client_notes. Nunca sobrescreve anotações.
 * Usa o client admin (service role) — chamado só no servidor.
 */
export async function gravarObservacaoAoGerarPeticao(opts: {
  db: Db
  lawyerId: string
  clientId?: string | null
  formData: Record<string, unknown>
  observacoes: string
}): Promise<{ clientId: string | null; criada: boolean; anotacaoSalva: boolean }> {
  const texto = opts.observacoes.trim()
  if (!texto) {
    return { clientId: opts.clientId ?? null, criada: false, anotacaoSalva: false }
  }

  let clientId = opts.clientId?.trim() || null
  let criada = false

  if (!clientId) {
    const nome = str(opts.formData.nome)
    if (!nome) {
      return { clientId: null, criada: false, anotacaoSalva: false }
    }

    const cpf = str(opts.formData.cpf).replace(/\D/g, '')
    const rua = str(opts.formData.autor_logradouro || opts.formData.rua)
    const numero = str(opts.formData.autor_numero || opts.formData.numero)
    const bairro = str(opts.formData.autor_bairro || opts.formData.bairro)
    const cep = str(opts.formData.autor_cep || opts.formData.cep)
    const city = str(opts.formData.autor_municipio || opts.formData.municipio || opts.formData.city)
    const state = str(opts.formData.autor_uf || opts.formData.uf || opts.formData.state)
    const zoneRaw = str(opts.formData.autor_zona || opts.formData.zone || 'rural').toLowerCase()
    const zone = zoneRaw === 'urban' || zoneRaw === 'urbano' ? 'urban' : 'rural'
    const sexo = str(opts.formData.sexo_parte_autora || opts.formData.sexo) || null
    const profession = str(
      opts.formData.profession || opts.formData.profissao || opts.formData.atividade
    )
    const address = juntarEnderecoLegado({ rua, numero, bairro }) || ''

    const payload = buildClientInsertPayload({
      lawyerId: opts.lawyerId,
      name: nome,
      cpf: cpf || '',
      profession,
      zone,
      cep,
      address,
      rua: rua || undefined,
      numero: numero || undefined,
      bairro: bairro || undefined,
      city,
      state,
      sexo,
    })
    // Observações vão para client_notes, não para clients.notes.
    delete payload.notes

    let inserted: { id: string } | null = null
    const { data, error } = await opts.db
      .from('clients')
      .insert(payload)
      .select('id')
      .maybeSingle()

    if (error && /rua|numero|bairro|sexo/i.test(error.message)) {
      const retryPayload: Record<string, unknown> = { ...payload }
      if (/rua|numero|bairro/i.test(error.message)) {
        delete retryPayload.rua
        delete retryPayload.numero
        delete retryPayload.bairro
      }
      if (/sexo/i.test(error.message)) delete retryPayload.sexo
      const retry = await opts.db.from('clients').insert(retryPayload).select('id').maybeSingle()
      if (!retry.error && retry.data) inserted = retry.data as { id: string }
    } else if (!error && data) {
      inserted = data as { id: string }
    }

    if (!inserted?.id) {
      console.error('[client-notes] criar cliente ao gerar petição:', error?.message)
      return { clientId: null, criada: false, anotacaoSalva: false }
    }

    clientId = inserted.id
    criada = true
  }

  const { error: noteErr } = await opts.db.from('client_notes').insert({
    client_id: clientId,
    lawyer_id: opts.lawyerId,
    texto,
  })

  if (noteErr) {
    console.error('[client-notes] insert ao gerar petição:', noteErr.message)
    return { clientId, criada, anotacaoSalva: false }
  }

  await registrarContato(clientId, { db: opts.db })
  return { clientId, criada, anotacaoSalva: true }
}
