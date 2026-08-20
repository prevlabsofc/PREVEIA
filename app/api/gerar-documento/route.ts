import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSystemPrompt } from '@/lib/agents'
import { temAcessoTotal } from '@/lib/permissions/cargos'
import { rateLimit } from '@/lib/rateLimit'
import { registrarContato } from '@/lib/registrar-contato'

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const runtime = 'nodejs'

function safeJsonStringify(value: unknown) {
  const seen = new WeakSet<object>()
  return JSON.stringify(
    value,
    (_key, v) => {
      if (typeof v === 'bigint') return v.toString()
      if (v && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]'
        seen.add(v)
      }
      if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack }
      return v
    },
    2,
  )
}

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    }
  }

  return {
    message: typeof err === 'string' ? err : 'Erro desconhecido',
    raw: err,
  }
}

export async function POST(req: Request) {
  let requestBody: any = null
  try {
    requestBody = await req.json()
    const { agentType, formData, clientId, clientName } = requestBody ?? {}

    // Log do body recebido (para comparar payload frontend/rota)
    // Obs.: safeJsonStringify lida com BigInt/ciclos caso existam.
    console.log(
      '[GERAR_DOCUMENTO][BODY_RECEBIDO]',
      safeJsonStringify({
        agentType,
        clientId,
        clientName,
        formData,
      }),
    )

    const normalizedFormData = (formData && typeof formData === 'object' ? formData : {}) as Record<string, unknown>
    const normalizedClientId = clientId ?? null
    const normalizedClientName = clientName ?? null

    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip, 20, 60000)) {
      return Response.json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' }, { status: 429 })
    }

    // Valida sessão via cookies (SSR) — mais robusto que ler o JWT do header,
    // pois funciona mesmo quando o access_token está sendo rotacionado.
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => { /* read-only em Route Handler */ },
        },
      }
    )

    // Fallback: aceitar token Bearer caso o cookie não esteja presente
    // (ex.: chamadas de testes ou clientes que não enviam cookies).
    let user: { id: string } | null = null
    const { data: sessionData } = await supabase.auth.getUser()
    if (sessionData?.user) {
      user = sessionData.user
    } else {
      const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim()
      if (token) {
        const adminClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
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
      console.error('[GERAR_DOCUMENTO][ADV_MISSING]', { lawyerId: user.id })
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

    const inTrial = new Date((adv as any).trial_expires_at) > new Date()
    const hasQuota = (adv as any).docs_trial_used < 5
    const isPaid = (adv as any).plan !== 'trial'
    if (!((inTrial && hasQuota) || isPaid)) {
      return Response.json({ error: 'trial_expired' }, { status: 403 })
    }

    const manualClientName = (normalizedClientName || (normalizedFormData as any)?.nome || '').trim()
    if (!normalizedClientId && !manualClientName) {
      console.warn('[GERAR_DOCUMENTO][VALIDACAO_CLIENTE_FALTANTE]', {
        normalizedClientId,
        normalizedClientName,
        formDataNome: (normalizedFormData as any)?.nome,
      })
      return Response.json({ error: 'Informe um cliente cadastrado ou o nome manual do cliente.' }, { status: 400 })
    }
    if (normalizedClientId && !cli) {
      console.warn('[GERAR_DOCUMENTO][VALIDACAO_CLIENTE_NAO_ENCONTRADO]', { normalizedClientId })
      return Response.json({ error: 'Cliente não encontrado.' }, { status: 400 })
    }

    const resolvedClientId = cli?.id || null
    const resolvedClientName = cli?.name || manualClientName

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      console.error('[GERAR_DOCUMENTO][ANTHROPIC_API_KEY_MISSING]', {
        message: 'ANTHROPIC_API_KEY não está definida em process.env',
        agentType,
        lawyerId: user.id,
      })
      return Response.json(
        { error: 'Serviço de IA indisponível. Contate o suporte.' },
        { status: 500 },
      )
    }

    const systemPrompt = getSystemPrompt(agentType, adv, cli)
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })
    const encoder = new TextEncoder()
    let fullText = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 6000,
            system: systemPrompt,
            messages: [{ role: 'user', content: JSON.stringify(normalizedFormData) }],
          })

          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              fullText += chunk.delta.text
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }

          const { data: novoDoc } = await supabaseAdmin.from('documents').insert({
            lawyer_id: user.id,
            client_id: resolvedClientId,
            client_name: resolvedClientName,
            agent_type: agentType,
            title: (normalizedFormData as any).nome ? `Petição — ${(normalizedFormData as any).nome}` : agentType,
            content: fullText,
            form_data: normalizedFormData,
            status: 'generated',
            lawyer_snapshot: {
              name: (adv as any).name, oab_number: (adv as any).oab_number,
              oab_uf: (adv as any).oab_uf, email: (adv as any).email,
              whatsapp: (adv as any).whatsapp,
              cidade: (adv as any).cidade,
              estado: (adv as any).estado || (adv as any).oab_uf,
              logo_url: (adv as any).logo_url, signature_url: (adv as any).signature_url,
              banner_url: (adv as any).banner_url,
              honorarios_pct: (adv as any).honorarios_pct, vara_padrao: (adv as any).vara_padrao,
              cor_peticao: (adv as any).cor_peticao,
              estilo_peticao: (adv as any).estilo_peticao === 'classico' ? 'classico' : 'moderno',
            }
          }).select('id').single()

          if (resolvedClientId) {
            await registrarContato(resolvedClientId, { db: supabaseAdmin })
          }

          const notificacao = {
            lawyer_id: user.id,
            title: 'Nova petição gerada com sucesso!',
            type: 'success',
          }

          const { error: notifError } = await supabaseAdmin.from('notifications').insert({
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
            details: { tipo: (normalizedFormData as any)?.agente || 'petição' },
          })
        } catch (err) {
          console.error(
            '[GERAR_DOCUMENTO][STREAM_ERRO]',
            {
              err: serializeError(err),
              agentType,
              clientId: resolvedClientId,
            },
          )
          console.error('[GERAR_DOCUMENTO][STREAM_BODY]', safeJsonStringify(requestBody))
          controller.enqueue(encoder.encode('[ERRO_GERACAO]'))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (err) {
    console.error('[GERAR_DOCUMENTO][POST_ERRO]', serializeError(err))

    if (requestBody) {
      console.error('[GERAR_DOCUMENTO][POST_BODY]', safeJsonStringify(requestBody))
    } else {
      console.error('[GERAR_DOCUMENTO][POST_BODY]', String(requestBody))
    }

    return Response.json(
      { error: 'Erro interno ao gerar petição. Tente novamente ou contate o suporte.' },
      { status: 500 },
    )
  }
}