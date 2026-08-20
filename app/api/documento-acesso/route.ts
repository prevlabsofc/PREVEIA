import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sessaoDaRequisicao } from '@/lib/permissions/sessao'
import {
  gerarTokenDocumento,
  hashTokenDocumento,
  novoAccessTokenUuid,
  urlPublicaDocumento,
} from '@/lib/documento-acesso'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST — gera (ou regenera) link público de acesso ao documento.
 * Autenticado. Persiste/atualiza em `documents` com access_token_hash.
 * Body: { content, title?, agent_type?, client_id?, client_name?, document_id?, regenerar? }
 */
export async function POST(req: Request) {
  const sessao = await sessaoDaRequisicao(req)
  if (!sessao) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'body_invalido' }, { status: 400 })
  }

  const content = String(body.content || '').trim()
  if (!content || content.length < 20) {
    return Response.json({ error: 'conteudo_vazio' }, { status: 400 })
  }

  const title = String(body.title || 'Petição').slice(0, 200)
  const agentType = body.agent_type ? String(body.agent_type).slice(0, 120) : null
  const clientName = body.client_name ? String(body.client_name).slice(0, 200) : null
  const clientId =
    typeof body.client_id === 'string' && UUID.test(body.client_id)
      ? body.client_id
      : null
  const documentId =
    typeof body.document_id === 'string' && UUID.test(body.document_id)
      ? body.document_id
      : null
  const regenerar = Boolean(body.regenerar)

  const { user, supabase } = sessao

  // Snapshot do advogado para a página pública poder montar PDF sem login
  const { data: adv } = await supabase
    .from('lawyers')
    .select(
      'name, office_name, oab_number, oab_uf, email, whatsapp, phone, cidade, estado, logo_url, banner_url, signature_url, cor_peticao, estilo_peticao',
    )
    .eq('id', user.id)
    .maybeSingle()

  const lawyerSnapshot = adv
    ? {
        name: adv.name,
        office_name: adv.office_name,
        oab_number: adv.oab_number,
        oab_uf: adv.oab_uf,
        email: adv.email,
        whatsapp: adv.whatsapp || adv.phone,
        phone: adv.phone,
        cidade: adv.cidade,
        estado: adv.estado || adv.oab_uf,
        logo_url: adv.logo_url,
        banner_url: adv.banner_url,
        signature_url: adv.signature_url,
        cor_peticao: adv.cor_peticao,
        estilo_peticao: adv.estilo_peticao === 'classico' ? 'classico' : 'moderno',
      }
    : null

  const token = gerarTokenDocumento()
  const tokenHash = hashTokenDocumento(token)
  const accessTokenUuid = novoAccessTokenUuid()
  const agora = new Date().toISOString()

  let docId = documentId

  if (docId) {
    // Garante que o doc pertence ao advogado
    const { data: existente } = await supabase
      .from('documents')
      .select('id, access_token_hash')
      .eq('id', docId)
      .eq('lawyer_id', user.id)
      .maybeSingle()

    if (!existente) {
      return Response.json({ error: 'documento_nao_encontrado' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      content,
      title,
      lawyer_snapshot: lawyerSnapshot,
    }
    if (agentType) updates.agent_type = agentType
    if (clientId) updates.client_id = clientId
    if (clientName) updates.client_name = clientName

    // Só emite novo token se pedido explicitamente ou se ainda não havia link
    const precisaNovoToken = regenerar || !existente.access_token_hash
    if (precisaNovoToken) {
      updates.access_token_hash = tokenHash
      updates.access_token_created_at = agora
      updates.access_token = accessTokenUuid
    }

    const { error } = await supabase.from('documents').update(updates).eq('id', docId)
    if (error) {
      console.error('[documento-acesso] update', error.message)
      return Response.json(
        {
          error: 'falha_salvar',
          detalhe: error.message.includes('access_token')
            ? 'Verifique se a migration documents_access_token foi aplicada no Supabase.'
            : error.message,
        },
        { status: 500 },
      )
    }

    if (!precisaNovoToken) {
      // Atualizou só o conteúdo — não devolve token (já foi exibido antes)
      return Response.json({
        document_id: docId,
        atualizado: true,
        token: null,
        url: null,
      })
    }
  } else {
    const payloadBase = {
      lawyer_id: user.id,
      client_id: clientId,
      client_name: clientName,
      agent_type: agentType,
      title,
      content,
      status: 'generated',
      lawyer_snapshot: lawyerSnapshot,
      access_token_hash: tokenHash,
      access_token_created_at: agora,
      access_token: accessTokenUuid,
    }

    const { data: novo, error } = await supabase
      .from('documents')
      .insert(payloadBase)
      .select('id')
      .single()

    if (error || !novo) {
      // Fallback: coluna access_token_* ainda não migrada — tenta insert sem elas
      // e usa service role para gravar o hash (ou falha com mensagem clara).
      console.error('[documento-acesso] insert', error?.message)
      const admin = adminClient()
      const { data: novoAdmin, error: errAdmin } = await admin
        .from('documents')
        .insert(payloadBase)
        .select('id')
        .single()
      if (errAdmin || !novoAdmin) {
        return Response.json(
          {
            error: 'falha_salvar',
            detalhe:
              'Verifique se a migration documents_access_token foi aplicada no Supabase. Rode o SQL em supabase/migrations/20260801_documents_access_token.sql no SQL Editor.',
          },
          { status: 500 },
        )
      }
      docId = novoAdmin.id
    } else {
      docId = novo.id
    }
  }

  return Response.json({
    document_id: docId,
    token,
    url: urlPublicaDocumento(token),
    criado_em: agora,
  })
}
