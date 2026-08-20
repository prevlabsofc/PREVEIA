import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rateLimit'
import { carregarMembrosEscritorio } from '@/lib/equipe'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'

const DIAS_PERMITIDOS = new Set([7, 30])
const DIAS_PADRAO = 30
const LIMITE_FONTES = 8
const LIMITE_JURIS_IDS = 12

const SYSTEM_BASE = `Você redige rascunhos de newsletter jurídica para escritórios brasileiros de Direito Previdenciário (INSS).

Produza um rascunho profissional (assunto + corpo completo) para o advogado revisar antes de enviar.

Regras:
- Português brasileiro, tom profissional e acessível a leigos.
- Não invente números de processo, súmulas, temas, leis ou ementas. Cite apenas o que estiver nas fontes/tese fornecidas.
- Corpo em texto simples (sem HTML), máximo ~400 palavras, com abertura, 1–3 destaques e fechamento convidando o leitor a falar com o escritório.
- Não envie a newsletter — apenas redija o rascunho.
- Responda APENAS com JSON válido, sem markdown nem comentários:
{"assunto":"...","conteudo":"..."}`

const SYSTEM_CLIENTES = `

PÚBLICO: CLIENTES do escritório (segmento Clientes).
- O texto deve explicar como a atualização jurídica se aplica aos CASOS deles — não um ensaio acadêmico genérico.
- Use as tags/tipos de benefício fornecidos como contexto (ex.: BPC/LOAS, Auxílio-Doença, Aposentadoria Rural).
- Fale em segunda pessoa quando fizer sentido ("no seu caso de...", "se você está aguardando...").
- Evite dados sensíveis de processos individuais; fale por tipo de benefício/tag.`

type Modo = 'periodo' | 'selecionadas' | 'tese'
type Segmento = 'cliente' | 'lead' | 'todos'

type JurisRow = {
  id?: string
  tribunal: string | null
  tipo: string | null
  numero: string | null
  assunto: string | null
  ementa: string | null
  data_julgamento: string | null
  created_at: string
}

type ArtigoRow = {
  titulo: string
  categoria: string | null
  conteudo: string | null
  created_at: string
}

function isoDiasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

function extrairJson(texto: string): { assunto: string; conteudo: string } | null {
  const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  try {
    const parsed = JSON.parse(limpo)
    if (typeof parsed?.assunto === 'string' && typeof parsed?.conteudo === 'string') {
      const assunto = parsed.assunto.trim()
      const conteudo = parsed.conteudo.trim()
      if (assunto && conteudo) return { assunto, conteudo }
    }
  } catch { /* tenta extrair bloco */ }
  const m = limpo.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const parsed = JSON.parse(m[0])
    if (typeof parsed?.assunto === 'string' && typeof parsed?.conteudo === 'string') {
      const assunto = parsed.assunto.trim()
      const conteudo = parsed.conteudo.trim()
      if (assunto && conteudo) return { assunto, conteudo }
    }
  } catch { return null }
  return null
}

function normalizarTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(t => String(t || '').trim())
    .filter(Boolean)
    .slice(0, 12)
}

function normalizarJurisIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(id => String(id || '').trim())
    .filter(id => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, LIMITE_JURIS_IDS)
}

function blocoJurisTexto(jurisprudencias: JurisRow[]): string {
  if (jurisprudencias.length === 0) return '(nenhuma jurisprudência)'
  return jurisprudencias.map((j, i) => {
    const ementa = (j.ementa || '').slice(0, 600)
    return `${i + 1}. Tribunal: ${j.tribunal || '—'} | Tipo: ${j.tipo || '—'} | Número: ${j.numero || '—'} | Assunto: ${j.assunto || '—'} | Julgamento: ${j.data_julgamento || '—'} | Ementa: ${ementa}`
  }).join('\n')
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip, 10, 60000)) {
      return Response.json(
        { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
        { status: 429 }
      )
    }

    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return Response.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const diasRaw = Number(body?.dias)
    const dias = DIAS_PERMITIDOS.has(diasRaw) ? diasRaw : DIAS_PADRAO
    const modo: Modo =
      body?.modo === 'selecionadas' || body?.modo === 'tese' ? body.modo : 'periodo'
    const segmento: Segmento =
      body?.segmento === 'cliente' || body?.segmento === 'lead' ? body.segmento : 'todos'
    const tags = normalizarTags(body?.tags)
    const tese = typeof body?.tese === 'string' ? body.tese.trim().slice(0, 2000) : ''
    const jurisIds = normalizarJurisIds(body?.juris_ids)

    const membros = await carregarMembrosEscritorio(supabaseAdmin, user.id)
    const idsEscritorio = membros.map(m => m.id)
    if (idsEscritorio.length === 0) idsEscritorio.push(user.id)

    let jurisprudencias: JurisRow[] = []
    let artigosPub: ArtigoRow[] = []

    if (modo === 'tese') {
      if (!tese) {
        return Response.json({ error: 'Informe a tese jurídica.', empty: true }, { status: 400 })
      }
    } else if (modo === 'selecionadas') {
      if (jurisIds.length === 0) {
        return Response.json({
          ok: false,
          empty: true,
          error: 'Selecione ao menos uma jurisprudência',
        })
      }
      const { data: juris } = await supabaseAdmin
        .from('jurisprudencias')
        .select('id, tribunal, tipo, numero, assunto, ementa, data_julgamento, created_at')
        .in('id', jurisIds)
      jurisprudencias = (juris || []) as JurisRow[]
      if (jurisprudencias.length === 0) {
        return Response.json({
          ok: false,
          empty: true,
          error: 'Jurisprudências selecionadas não encontradas',
        })
      }
    } else {
      const desde = isoDiasAtras(dias)
      const [{ data: juris }, { data: artigos }] = await Promise.all([
        supabaseAdmin
          .from('jurisprudencias')
          .select('tribunal, tipo, numero, assunto, ementa, data_julgamento, created_at')
          .gte('created_at', desde)
          .order('created_at', { ascending: false })
          .limit(LIMITE_FONTES),
        supabaseAdmin
          .from('artigos')
          .select('titulo, categoria, conteudo, created_at')
          .in('lawyer_id', idsEscritorio)
          .eq('publicado', true)
          .gte('created_at', desde)
          .order('created_at', { ascending: false })
          .limit(LIMITE_FONTES),
      ])
      jurisprudencias = (juris || []) as JurisRow[]
      artigosPub = (artigos || []) as ArtigoRow[]
      if (jurisprudencias.length === 0 && artigosPub.length === 0) {
        return Response.json({
          ok: false,
          empty: true,
          error: 'Não há jurisprudências/artigos recentes para sugerir conteúdo',
          dias,
        })
      }
    }

    const blocoJuris = blocoJurisTexto(jurisprudencias)
    const blocoArtigos = artigosPub.length === 0
      ? '(nenhum artigo)'
      : artigosPub.map((a, i) => {
          const trecho = (a.conteudo || '').slice(0, 400)
          return `${i + 1}. Título: ${a.titulo} | Categoria: ${a.categoria || '—'} | Trecho: ${trecho}`
        }).join('\n')

    const system =
      SYSTEM_BASE + (segmento === 'cliente' ? SYSTEM_CLIENTES : '')

    let userPrompt = ''
    if (modo === 'tese') {
      userPrompt = `MODO: tese jurídica digitada pelo advogado.\nTESE:\n${tese}\n\n`
    } else if (modo === 'selecionadas') {
      userPrompt = `MODO: jurisprudências selecionadas pelo advogado.\nJURISPRUDÊNCIAS (${jurisprudencias.length}):\n${blocoJuris}\n\n`
    } else {
      userPrompt = `MODO: fontes recentes (últimos ${dias} dias).\nJURISPRUDÊNCIAS (${jurisprudencias.length}):\n${blocoJuris}\n\nARTIGOS DO ESCRITÓRIO (${artigosPub.length}):\n${blocoArtigos}\n\n`
    }

    userPrompt += `SEGMENTO DE ENVIO: ${segmento}.\n`
    if (segmento === 'cliente') {
      userPrompt += tags.length > 0
        ? `TAGS / TIPOS DE BENEFÍCIO DO PÚBLICO: ${tags.join('; ')}.\nRedija falando diretamente a clientes com esses perfis de caso.\n`
        : `TAGS: (não especificadas — use tom geral para clientes previdenciários, ainda assim aplicado ao caso deles).\n`
    } else {
      userPrompt += 'PÚBLICO: leads/inscritos — conteúdo institucional educativo, sem dados de processo.\n'
    }
    userPrompt += '\nGere o rascunho JSON com assunto e conteúdo completo.'

    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const bruto = completion.content[0]?.type === 'text' ? completion.content[0].text : ''
    const rascunho = extrairJson(bruto)
    if (!rascunho) {
      return Response.json(
        { error: 'Não foi possível gerar a sugestão. Tente novamente.' },
        { status: 502 }
      )
    }

    return Response.json({
      ok: true,
      assunto: rascunho.assunto,
      conteudo: rascunho.conteudo,
      dias,
      modo,
      segmento,
      fontes: {
        jurisprudencias: jurisprudencias.length,
        artigos: artigosPub.length,
        tese: modo === 'tese',
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar sugestão'
    return Response.json({ error: msg }, { status: 500 })
  }
}
