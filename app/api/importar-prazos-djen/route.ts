import { createClient } from '@supabase/supabase-js'
import { consultarComunicacoesPorOab, RESULTADO_CPF_INDISPONIVEL, type ComunicacaoDjen } from '@/lib/djen'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Busca automática de prazos/andamentos por OAB (via DJEN/CNJ) ou informa a
 * limitação de busca por CPF — ver `lib/djen.ts` para o porquê. Importa as
 * comunicações encontradas como registros em `prazos`, marcados
 * `origem = 'djen'`, sem duplicar em buscas repetidas (dedupe por
 * `origem_externo_id`, ver migração `20260801_prazos_responsavel_e_djen.sql`).
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!rateLimit(ip, 10, 60000)) {
    return Response.json(
      { ok: false, erro: 'limite_excedido', mensagem: 'Muitas buscas seguidas. Aguarde um minuto e tente de novo.' },
      { status: 429 },
    )
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return Response.json({ ok: false, erro: 'nao_autenticado', mensagem: 'Faça login novamente.' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return Response.json({ ok: false, erro: 'nao_autenticado', mensagem: 'Faça login novamente.' }, { status: 401 })
  }

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return Response.json({ ok: false, erro: 'requisicao_invalida', mensagem: 'Requisição inválida.' }, { status: 400 })
  }

  const modo = body?.modo === 'cpf' ? 'cpf' : 'oab'

  if (modo === 'cpf') {
    // Nenhuma chamada é feita — ver limitação documentada em lib/djen.ts.
    return Response.json(RESULTADO_CPF_INDISPONIVEL, { status: 200 })
  }

  const oabNumero = String(body?.oabNumero ?? '')
  const oabUf = String(body?.oabUf ?? '')
  const tribunal = body?.tribunal ? String(body.tribunal).trim().toUpperCase() : undefined

  const resultado = await consultarComunicacoesPorOab(oabNumero, oabUf, { tribunal })
  if (!resultado.ok) {
    const status = resultado.erro === 'oab_invalida' ? 400 : 502
    return Response.json(resultado, { status })
  }

  if (resultado.comunicacoes.length === 0) {
    return Response.json({ ok: true, parcial: resultado.parcial, encontradas: 0, novas: 0, jaImportadas: 0, prazos: [] })
  }

  const ids = resultado.comunicacoes.map((c) => String(c.id))
  const { data: existentes } = await supabase
    .from('prazos')
    .select('origem_externo_id')
    .eq('lawyer_id', user.id)
    .in('origem_externo_id', ids)

  const idsExistentes = new Set((existentes || []).map((r: { origem_externo_id: string }) => r.origem_externo_id))
  const novas: ComunicacaoDjen[] = resultado.comunicacoes.filter((c) => !idsExistentes.has(String(c.id)))

  if (novas.length === 0) {
    return Response.json({
      ok: true,
      parcial: resultado.parcial,
      encontradas: resultado.comunicacoes.length,
      novas: 0,
      jaImportadas: resultado.comunicacoes.length,
      prazos: [],
    })
  }

  const linhas = novas.map((c) => ({
    lawyer_id: user.id,
    titulo: `${c.tipoComunicacao}${c.tipoDocumento ? ` — ${c.tipoDocumento}` : ''}`.trim(),
    tipo: c.tipoComunicacao || 'Outro',
    data_prazo: c.dataDisponibilizacao,
    processo: c.numeroProcessoFormatado,
    cliente: '',
    prioridade: /cita[cç][aã]o/i.test(c.tipoComunicacao) ? 'alta' : 'normal',
    concluido: false,
    origem: 'djen',
    origem_externo_id: String(c.id),
    observacao:
      `Importado do DJEN/CNJ (${c.tribunal || 'tribunal não identificado'}, ${c.orgao || 'órgão não informado'}). ` +
      `Data de disponibilização da publicação — não é o vencimento do prazo já calculado; confira o prazo ` +
      `aplicável no teor completo. ${c.resumo}${c.link ? ` Teor: ${c.link}` : ''}`.trim(),
  }))

  const { data: inseridos, error: insErr } = await supabase.from('prazos').insert(linhas).select()

  if (insErr) {
    return Response.json(
      { ok: false, erro: 'indisponivel', mensagem: 'Encontramos comunicações no DJEN, mas houve falha ao salvar em Prazos. Tente novamente.' },
      { status: 500 },
    )
  }

  return Response.json({
    ok: true,
    parcial: resultado.parcial,
    encontradas: resultado.comunicacoes.length,
    novas: inseridos?.length || 0,
    jaImportadas: resultado.comunicacoes.length - novas.length,
    prazos: inseridos || [],
  })
}
