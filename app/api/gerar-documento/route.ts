import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSystemPrompt } from '@/lib/agents'
import { temAcessoTotal } from '@/lib/permissions/cargos'
import { rateLimit } from '@/lib/rateLimit'
import { registrarContato } from '@/lib/registrar-contato'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return Response.json(
        { error: 'Body JSON inválido. Envie application/json com agentType, formData e clientId/clientName.' },
        { status: 400 },
      )
    }

    // Payload esperado (alinhado com app/(dashboard)/agentes/page.tsx):
    // { agentType, formData, clientId, clientName }
    const {
      agentType: rawAgentType,
      formData = {},
      clientId = null,
      clientName = null,
    } = body ?? {}

    const agentType =
      typeof rawAgentType === 'string' && rawAgentType.trim()
        ? rawAgentType.trim()
        : 'peticao'

    const normalizedFormData = (
      formData && typeof formData === 'object' ? formData : {}
    ) as Record<string, unknown>
    const normalizedClientId =
      typeof clientId === 'string' && clientId.trim()
        ? clientId.trim()
        : clientId || null
    const normalizedClientName =
      typeof clientName === 'string' && clientName.trim()
        ? clientName.trim()
        : clientName || null

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip, 20, 60000)) {
      return Response.json(
        { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
        { status: 429 },
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return Response.json(
        { error: 'Variáveis de ambiente do Supabase ausentes no servidor.' },
        { status: 500 },
      )
    }

    // Valida sessão via cookies (SSR) — mais robusto que ler o JWT do header,
    // pois funciona mesmo quando o access_token está sendo rotacionado.
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          /* read-only em Route Handler */
        },
      },
    })

    // Fallback: aceitar token Bearer caso o cookie não esteja presente
    // (ex.: chamadas de testes ou clientes que não enviam cookies).
    let user: { id: string } | null = null
    const { data: sessionData } = await supabase.auth.getUser()
    if (sessionData?.user) {
      user = sessionData.user
    } else {
      const token = (request.headers.get('Authorization') || '')
        .replace('Bearer ', '')
        .trim()
      if (token) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey)
        const { data: ud } = await adminClient.auth.getUser(token)
        user = ud?.user ?? null
      }
    }

    if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 })

    const { data: adv, error: advError } = await supabaseAdmin
      .from('lawyers')
      .select('*')
      .eq('id', user.id)
      .single()

    if (advError) {
      console.error('[GERAR_DOCUMENTO][ADV_ERROR]', advError)
    }

    if (!adv) {
      return Response.json(
        { error: 'Usuário não está cadastrado como advogado no sistema.' },
        { status: 400 },
      )
    }

    const { data: cli } = normalizedClientId
      ? await supabaseAdmin
          .from('clients')
          .select('*')
          .eq('id', normalizedClientId)
          .eq('lawyer_id', user.id)
          .single()
      : { data: null }

    // Esta rota usa a service role, que ignora RLS. O cargo precisa ser conferido
    // aqui, senão secretária/estagiário geraria peça com o cadastro completo do
    // cliente no prompt. Base sem a coluna `cargo` (migração não aplicada) segue
    // o comportamento anterior.
    if ('cargo' in adv && !temAcessoTotal((adv as any).cargo)) {
      return Response.json({ error: 'cargo_sem_permissao' }, { status: 403 })
    }

    const inTrial =
      new Date((adv as any).trial_expires_at || 0) > new Date()
    const hasQuota = ((adv as any).docs_trial_used ?? 0) < 5
    const isPaid = ((adv as any).plan || 'trial') !== 'trial'
    if (!((inTrial && hasQuota) || isPaid)) {
      return Response.json({ error: 'trial_expired' }, { status: 403 })
    }

    // Campos de cliente são opcionais: sem cadastro/nome, segue com fallback
    // para não quebrar a geração por undefined/null.
    const manualClientName = String(
      normalizedClientName || (normalizedFormData as any)?.nome || '',
    ).trim()

    const resolvedClientId = cli?.id || null
    const resolvedClientName =
      cli?.name || manualClientName || 'Cliente não informado'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })
    }

    const systemPrompt = getSystemPrompt(agentType, adv, cli)
    const anthropic = new Anthropic({ apiKey })
    const encoder = new TextEncoder()
    let fullText = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 6000,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: JSON.stringify(normalizedFormData ?? {}),
              },
            ],
          })

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              fullText += chunk.delta.text
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }

          const { data: novoDoc } = await supabaseAdmin
            .from('documents')
            .insert({
              lawyer_id: user.id,
              client_id: resolvedClientId,
              client_name: resolvedClientName,
              agent_type: agentType,
              title: (normalizedFormData as any).nome
                ? `Petição — ${(normalizedFormData as any).nome}`
                : agentType,
              content: fullText,
              form_data: normalizedFormData,
              status: 'generated',
              lawyer_snapshot: {
                name: (adv as any).name,
                oab_number: (adv as any).oab_number,
                oab_uf: (adv as any).oab_uf,
                email: (adv as any).email,
                whatsapp: (adv as any).whatsapp,
                cidade: (adv as any).cidade,
                estado: (adv as any).estado || (adv as any).oab_uf,
                logo_url: (adv as any).logo_url,
                signature_url: (adv as any).signature_url,
                banner_url: (adv as any).banner_url,
                honorarios_pct: (adv as any).honorarios_pct,
                vara_padrao: (adv as any).vara_padrao,
                cor_peticao: (adv as any).cor_peticao,
                estilo_peticao:
                  (adv as any).estilo_peticao === 'classico'
                    ? 'classico'
                    : 'moderno',
              },
            })
            .select('id')
            .single()

          if (resolvedClientId) {
            await registrarContato(resolvedClientId, { db: supabaseAdmin })
          }

          const notificacao = {
            lawyer_id: user.id,
            title: 'Nova petição gerada com sucesso!',
            type: 'success',
          }

          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
              ...notificacao,
              document_id: novoDoc?.id ?? null,
              status: 'done',
              progress: 100,
            })

          // Fallback para bases onde a migração de document_id/status/progress ainda não foi aplicada
          if (notifError) {
            await supabaseAdmin.from('notifications').insert(notificacao)
          }

          await supabaseAdmin.from('audit_logs').insert({
            lawyer_id: user.id,
            action: 'GERAR_PETICAO',
            resource: 'documents',
            details: {
              tipo: (normalizedFormData as any)?.agente || 'petição',
            },
          })
        } catch (err) {
          console.error('ERRO GERAR-DOCUMENTO (stream):', err)
          controller.enqueue(encoder.encode(`[ERRO_GERACAO] ${String(err)}`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    console.error('ERRO GERAR-DOCUMENTO:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
