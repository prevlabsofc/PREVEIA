/**
 * Varredura de processos monitorados via DataJud + envio de alertas ao cliente.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { consultarProcesso, formatarNumeroProcesso } from '@/lib/datajud'
import {
  classificarMovimento,
  chaveDedupAlerta,
  enviarEmailAlertaCliente,
  normalizarTiposAlerta,
  rotuloTipoAlerta,
  type TipoAlertaMovimentoId,
} from '@/lib/alertas-movimentos'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>

export function adminSupabase(): Db {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type ProcessoMonitorado = {
  id: string
  lawyer_id: string
  numero: string
  tribunal: string | null
  cliente: string | null
  cliente_id: string | null
  alertas_movimentos: unknown
  alertas_desde: string | null
}

type ClienteRow = {
  id: string
  name: string | null
  email: string | null
  lawyer_id: string
}

type LawyerRow = {
  id: string
  name: string | null
  office_name: string | null
}

export type ResultadoMonitoramento = {
  ok: true
  verificados: number
  alertas_enviados: number
  sem_email: number
  ja_enviados: number
  erros_consulta: number
  seed_baseline: number
}

function movimentoAposBaseline(
  dataHora: string | null,
  alertasDesde: string | null,
): boolean {
  if (!alertasDesde) return true
  if (!dataHora) return true
  return new Date(dataHora).getTime() >= new Date(alertasDesde).getTime()
}

async function notificarAdvogadoSemEmail(
  db: Db,
  lawyerId: string,
  numero: string,
  clienteNome: string | null,
) {
  const titulo = clienteNome
    ? `Não foi possível avisar ${clienteNome}: cadastre o e-mail do cliente (processo ${numero}).`
    : `Não foi possível avisar o cliente do processo ${numero}: cadastre o e-mail.`
  console.warn('[monitorar-processos]', titulo)
  await db.from('notifications').insert({
    lawyer_id: lawyerId,
    title: titulo,
    type: 'warning',
    link: '/processos',
  })
}

async function processarUm(
  db: Db,
  proc: ProcessoMonitorado,
  clientes: Map<string, ClienteRow>,
  lawyers: Map<string, LawyerRow>,
  stats: ResultadoMonitoramento,
): Promise<void> {
  const tipos = normalizarTiposAlerta(proc.alertas_movimentos)
  if (tipos.length === 0) return

  const resultado = await consultarProcesso(proc.numero, { limiteMovimentos: 50 })
  await db
    .from('processos')
    .update({ ultima_consulta_movimentos_em: new Date().toISOString() })
    .eq('id', proc.id)

  if (!resultado.ok) {
    stats.erros_consulta++
    console.warn(
      `[monitorar-processos] consulta falhou ${proc.numero}: ${resultado.mensagem}`,
    )
    return
  }

  stats.verificados++
  const processoDj = resultado.processos[0]
  if (!processoDj) return

  const cliente = proc.cliente_id ? clientes.get(proc.cliente_id) : null
  const lawyer = lawyers.get(proc.lawyer_id)
  const escritorio =
    lawyer?.office_name?.trim() ||
    lawyer?.name?.trim() ||
    'Seu escritório de advocacia'
  const numeroFmt =
    processoDj.numeroFormatado || formatarNumeroProcesso(proc.numero)

  // Primeira passagem (sem histórico de envios): semeia dedup sem e-mail,
  // para não alertar movimentos já existentes no DataJud.
  const { count: enviosAnteriores } = await db
    .from('processos_alertas_enviados')
    .select('id', { count: 'exact', head: true })
    .eq('processo_id', proc.id)

  let apenasSeed = !enviosAnteriores || enviosAnteriores === 0
  if (!proc.alertas_desde) {
    const agora = new Date().toISOString()
    await db.from('processos').update({ alertas_desde: agora }).eq('id', proc.id)
    proc.alertas_desde = agora
  }
  if (apenasSeed) stats.seed_baseline++

  for (const mov of processoDj.movimentos) {
    const tipo = classificarMovimento(mov.nome, tipos)
    if (!tipo) continue
    if (!movimentoAposBaseline(mov.dataHora, proc.alertas_desde)) continue

    const chave = chaveDedupAlerta({
      processoId: proc.id,
      tipo,
      movimentoNome: mov.nome,
      movimentoData: mov.dataHora,
    })

    const { data: existente } = await db
      .from('processos_alertas_enviados')
      .select('id')
      .eq('chave_dedup', chave)
      .maybeSingle()

    if (existente?.id) {
      stats.ja_enviados++
      continue
    }

    if (apenasSeed) {
      await db.from('processos_alertas_enviados').insert({
        processo_id: proc.id,
        lawyer_id: proc.lawyer_id,
        cliente_id: proc.cliente_id,
        tipo_alerta: tipo,
        movimento_nome: mov.nome,
        movimento_data: mov.dataHora,
        chave_dedup: chave,
        canal: 'email',
        status: 'baseline',
        detalhe: 'Registrado na configuração inicial — sem envio',
      })
      continue
    }

    const email = cliente?.email?.trim() || null
    if (!email) {
      stats.sem_email++
      await notificarAdvogadoSemEmail(
        db,
        proc.lawyer_id,
        numeroFmt,
        cliente?.name || proc.cliente,
      )
      await db.from('processos_alertas_enviados').insert({
        processo_id: proc.id,
        lawyer_id: proc.lawyer_id,
        cliente_id: proc.cliente_id,
        tipo_alerta: tipo,
        movimento_nome: mov.nome,
        movimento_data: mov.dataHora,
        chave_dedup: chave,
        canal: 'email',
        status: 'sem_email',
        detalhe: 'Cliente sem e-mail — aviso ao advogado',
      })
      continue
    }

    const ok = await enviarEmailAlertaCliente({
      to: email,
      nomeCliente: cliente?.name || proc.cliente || 'Cliente',
      escritorio,
      numeroProcesso: numeroFmt,
      tipoAlerta: tipo,
      movimentoNome: mov.nome,
      movimentoData: mov.dataHora,
    })

    if (!ok) {
      await db.from('processos_alertas_enviados').insert({
        processo_id: proc.id,
        lawyer_id: proc.lawyer_id,
        cliente_id: proc.cliente_id,
        tipo_alerta: tipo,
        movimento_nome: mov.nome,
        movimento_data: mov.dataHora,
        chave_dedup: chave,
        canal: 'email',
        status: 'falha',
        detalhe: 'Falha ao enviar via Resend',
      })
      await db.from('notifications').insert({
        lawyer_id: proc.lawyer_id,
        title: `Falha ao enviar aviso de ${rotuloTipoAlerta(tipo)} no processo ${numeroFmt}.`,
        type: 'error',
        link: '/processos',
      })
      continue
    }

    await db.from('processos_alertas_enviados').insert({
      processo_id: proc.id,
      lawyer_id: proc.lawyer_id,
      cliente_id: proc.cliente_id,
      tipo_alerta: tipo,
      movimento_nome: mov.nome,
      movimento_data: mov.dataHora,
      chave_dedup: chave,
      canal: 'email',
      status: 'enviado',
      detalhe: `E-mail enviado para ${email}`,
    })

    await db.from('notifications').insert({
      lawyer_id: proc.lawyer_id,
      title: `Cliente avisado: ${rotuloTipoAlerta(tipo)} — ${numeroFmt}`,
      type: 'success',
      link: '/processos',
    })

    stats.alertas_enviados++
  }
}

export async function monitorarProcessos(opts?: {
  lawyerIds?: string[]
}): Promise<ResultadoMonitoramento> {
  const db = adminSupabase()
  const stats: ResultadoMonitoramento = {
    ok: true,
    verificados: 0,
    alertas_enviados: 0,
    sem_email: 0,
    ja_enviados: 0,
    erros_consulta: 0,
    seed_baseline: 0,
  }

  let q = db
    .from('processos')
    .select(
      'id, lawyer_id, numero, tribunal, cliente, cliente_id, alertas_movimentos, alertas_desde',
    )
    .not('alertas_movimentos', 'eq', '[]')

  if (opts?.lawyerIds && opts.lawyerIds.length > 0) {
    q = q.in('lawyer_id', opts.lawyerIds)
  }

  const { data: processos, error } = await q
  if (error) throw new Error(error.message)

  const lista = ((processos || []) as ProcessoMonitorado[]).filter(
    (p) => normalizarTiposAlerta(p.alertas_movimentos).length > 0,
  )
  if (lista.length === 0) return stats

  const clienteIds = Array.from(
    new Set(lista.map((p) => p.cliente_id).filter(Boolean) as string[]),
  )
  const lawyerIds = Array.from(new Set(lista.map((p) => p.lawyer_id)))

  const [{ data: clients }, { data: lawyers }] = await Promise.all([
    clienteIds.length
      ? db.from('clients').select('id, name, email, lawyer_id').in('id', clienteIds)
      : Promise.resolve({ data: [] as ClienteRow[] }),
    db.from('lawyers').select('id, name, office_name').in('id', lawyerIds),
  ])

  const mapaClientes = new Map<string, ClienteRow>()
  for (const c of (clients || []) as ClienteRow[]) mapaClientes.set(c.id, c)
  const mapaLawyers = new Map<string, LawyerRow>()
  for (const l of (lawyers || []) as LawyerRow[]) mapaLawyers.set(l.id, l)

  // Sequencial para respeitar rate limit do DataJud.
  for (const proc of lista) {
    await processarUm(db, proc, mapaClientes, mapaLawyers, stats)
  }

  return stats
}

export type { TipoAlertaMovimentoId }
