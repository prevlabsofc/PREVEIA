/**
 * API do DJEN / Comunica PJe (CNJ) — comunicações processuais (intimações,
 * citações, atos ordinatórios) de todos os tribunais do país, sem chave de
 * API. Base: `https://comunicaapi.pje.jus.br/api/v1`.
 *
 * O QUE ESTA API ENTREGA
 * - Busca por **número de OAB + UF de inscrição**: todas as publicações
 *   endereçadas àquele advogado, em qualquer tribunal, num intervalo de
 *   datas de disponibilização.
 * - Cada item traz o processo vinculado, o tipo de ato, o órgão, um resumo
 *   do texto da publicação e o link para o teor completo no tribunal de
 *   origem.
 *
 * O QUE ESTA API **NÃO** ENTREGA (mesma limitação de LGPD documentada em
 * `lib/datajud.ts` para consulta por número de processo)
 * - Não há busca por CPF/CNPJ da parte: comunicações são endereçadas ao
 *   ADVOGADO (por OAB), nunca à parte. "Dado um CPF, listar as publicações
 *   da pessoa" continua impossível — não é uma configuração pendente, é
 *   como o dado é modelado no DJEN. Ver `RESULTADO_CPF_INDISPONIVEL`, usado
 *   por `app/api/importar-prazos-djen/route.ts` sem chamar a API à toa.
 * - A data devolvida é a de **disponibilização da publicação**, não o
 *   vencimento do prazo já calculado — quem importa o item para `/prazos`
 *   ainda precisa conferir o prazo aplicável no teor completo antes de
 *   confiar na data.
 * - Uma alternativa real para busca por CPF existiria integrando, tribunal a
 *   tribunal, o acesso via certificado digital (A1/A3) do escritório ao
 *   PJe/e-Proc (MNI — Modelo Nacional de Interoperabilidade); isso está fora
 *   do escopo desta função e não está configurado nesta base.
 *
 * REQUISITO DE INFRAESTRUTURA — GEOBLOQUEIO
 * O CNJ responde **HTTP 403 para requisições de fora do Brasil**. Uma função
 * serverless hospedada fora do país (região padrão da Vercel é `iad1`,
 * Virgínia/EUA) funciona no notebook do desenvolvedor e falha em produção.
 * Por isso `vercel.json` deste projeto fixa a região `gru1` (São Paulo) —
 * se a hospedagem mudar, garanta uma saída de rede brasileira para esta rota
 * (ou proxie a chamada por um serviço que tenha).
 *
 * VARIANTES DE SUFIXO DA OAB
 * O filtro `numeroOab` é comparado como string exata e cada tribunal grava a
 * inscrição com um sufixo diferente (`123456`, `123456-O`, `123456-A`...).
 * Sem consultar as variantes, boa parte das publicações fica invisível —
 * por isso `consultarComunicacoesPorOab` consulta todas em sequência.
 *
 * Fonte: documentação operacional pública do Comunica PJe. É uma API do CNJ
 * sem SLA nem versionamento formal — pode mudar sem aviso.
 */

export const DJEN_BASE_URL = 'https://comunicaapi.pje.jus.br/api/v1'

/** Sufixos de OAB observados entre tribunais (originária, suplementar, etc). */
const SUFIXOS_OAB = ['', '-O', '-A', '-N', '-B', '-S', '-E']
/** Espaçamento entre requisições sequenciais — a API não documenta limite, mas responde 500 sob rajada. */
const ESPACAMENTO_ENTRE_CONSULTAS_MS = 300
const TIMEOUT_MS = 8000
const RETRY_BACKOFF_MS = 800
/** 3 falhas seguidas (não-403) abortam a varredura — API fora do ar, insistir só queima tempo de função. */
const MAX_FALHAS_CONSECUTIVAS = 3
const ITENS_POR_PAGINA = 50

export interface ComunicacaoDjen {
  id: number
  hash: string
  numeroProcesso: string
  numeroProcessoFormatado: string
  tribunal: string
  tipoComunicacao: string
  tipoDocumento: string
  orgao: string
  classe: string
  /** AAAA-MM-DD — data de disponibilização da publicação, não o vencimento do prazo. */
  dataDisponibilizacao: string
  /** Texto da publicação já convertido para texto plano (a API devolve HTML bruto). */
  resumo: string
  link: string
}

export type TipoErroConsultaDjen =
  | 'oab_invalida'
  | 'cpf_nao_suportado'
  | 'geo_bloqueado'
  | 'indisponivel'

export type ResultadoConsultaDjen =
  | { ok: true; comunicacoes: ComunicacaoDjen[]; parcial: boolean }
  | { ok: false; erro: TipoErroConsultaDjen; mensagem: string }

/** Resposta fixa para busca por CPF — ver limitação documentada no topo do arquivo. */
export const RESULTADO_CPF_INDISPONIVEL: ResultadoConsultaDjen = {
  ok: false,
  erro: 'cpf_nao_suportado',
  mensagem:
    'Busca por CPF não está disponível: nenhuma API pública de tribunal aceita esse filtro — comunicações são ' +
    'endereçadas ao advogado por número de OAB, nunca à parte por CPF (restrição de LGPD, não uma configuração ' +
    'pendente). Use a busca por OAB acima, ou consulte o processo manualmente em Processos.',
}

function normalizarOab(valor: string): string {
  return (valor || '').replace(/\D/g, '')
}

function formatarNumeroProcessoLocal(numero: string): string {
  const n = (numero || '').replace(/\D/g, '')
  if (n.length !== 20) return numero
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`
}

/** A API devolve HTML bruto em `texto` — extrai texto plano e trunca (o link cobre o teor completo). */
function textoPlano(html: string, limite = 500): string {
  const semTags = (html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (semTags.length <= limite) return semTags
  return `${semTags.slice(0, limite)}…`
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapearComunicacao(raw: Record<string, any>): ComunicacaoDjen | null {
  const id = Number(raw?.id)
  const numeroProcesso = String(raw?.numero_processo || '').replace(/\D/g, '')
  // Sem os dois não dá pra deduplicar (id) nem vincular a um processo — descarta.
  if (!id || numeroProcesso.length !== 20) return null
  return {
    id,
    hash: String(raw?.hash || ''),
    numeroProcesso,
    numeroProcessoFormatado: String(raw?.numeroprocessocommascara || formatarNumeroProcessoLocal(numeroProcesso)),
    tribunal: String(raw?.siglaTribunal || ''),
    tipoComunicacao: String(raw?.tipoComunicacao || 'Comunicação'),
    tipoDocumento: String(raw?.tipoDocumento || ''),
    orgao: String(raw?.nomeOrgao || ''),
    classe: String(raw?.nomeClasse || ''),
    dataDisponibilizacao: String(raw?.data_disponibilizacao || '').slice(0, 10),
    resumo: textoPlano(raw?.texto || ''),
    link: String(raw?.link || ''),
  }
}

type RespostaPagina = { ok: true; items: any[] } | { ok: false; status: number }

async function buscarPagina(params: URLSearchParams, tentativa = 0): Promise<RespostaPagina> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const resposta = await fetch(`${DJEN_BASE_URL}/comunicacao?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (resposta.status === 403) return { ok: false, status: 403 }
    if (!resposta.ok) {
      if (tentativa === 0) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        return buscarPagina(params, 1)
      }
      return { ok: false, status: resposta.status }
    }
    const json = await resposta.json()
    return { ok: true, items: Array.isArray(json?.items) ? json.items : [] }
  } catch {
    if (tentativa === 0) {
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
      return buscarPagina(params, 1)
    }
    return { ok: false, status: 0 }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Consulta as comunicações (intimações/citações) de um advogado por OAB+UF,
 * varrendo as variantes de sufixo conhecidas. Roda apenas no servidor.
 * Limita a 1 página (50 itens) por variante — suficiente para o uso
 * interativo desta função; uma janela de datas mais estreita ajuda a não
 * perder itens quando o volume é grande.
 */
export async function consultarComunicacoesPorOab(
  oabBruto: string,
  uf: string,
  opcoes: { tribunal?: string; dataInicio?: string; dataFim?: string } = {},
): Promise<ResultadoConsultaDjen> {
  const oab = normalizarOab(oabBruto)
  const ufNormalizada = (uf || '').trim().toUpperCase()
  if (oab.length < 3 || oab.length > 7 || !/^[A-Z]{2}$/.test(ufNormalizada)) {
    return {
      ok: false,
      erro: 'oab_invalida',
      mensagem: 'Informe um número de OAB válido (dígitos) e a UF de inscrição.',
    }
  }

  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dataInicio = opcoes.dataInicio || trintaDiasAtras.toISOString().slice(0, 10)
  const dataFim = opcoes.dataFim || hoje.toISOString().slice(0, 10)

  const encontrados = new Map<number, ComunicacaoDjen>()
  let algumaVarianteOk = false
  let falhasConsecutivas = 0
  let parcial = false

  for (let i = 0; i < SUFIXOS_OAB.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, ESPACAMENTO_ENTRE_CONSULTAS_MS))

    const params = new URLSearchParams({
      numeroOab: `${oab}${SUFIXOS_OAB[i]}`,
      ufOab: ufNormalizada,
      dataDisponibilizacaoInicio: dataInicio,
      dataDisponibilizacaoFim: dataFim,
      itensPorPagina: String(ITENS_POR_PAGINA),
      pagina: '1',
    })
    if (opcoes.tribunal) params.set('siglaTribunal', opcoes.tribunal)

    const pagina = await buscarPagina(params)
    if (!pagina.ok) {
      if (pagina.status === 403) {
        return {
          ok: false,
          erro: 'geo_bloqueado',
          mensagem:
            'O DJEN/CNJ recusou a consulta por bloqueio geográfico (só aceita IPs do Brasil). Se o servidor ' +
            'estiver hospedado fora do país, configure a região de execução para São Paulo — ver comentário em ' +
            'lib/djen.ts.',
        }
      }
      falhasConsecutivas++
      parcial = true
      if (falhasConsecutivas >= MAX_FALHAS_CONSECUTIVAS) break
      continue
    }
    falhasConsecutivas = 0
    algumaVarianteOk = true
    for (const item of pagina.items) {
      const mapeado = mapearComunicacao(item)
      if (mapeado) encontrados.set(mapeado.id, mapeado)
    }
  }

  if (!algumaVarianteOk) {
    return {
      ok: false,
      erro: 'indisponivel',
      mensagem: 'Não foi possível falar com o DJEN/CNJ agora. Tente novamente em instantes.',
    }
  }

  const comunicacoes = Array.from(encontrados.values()).sort((a, b) =>
    b.dataDisponibilizacao.localeCompare(a.dataDisponibilizacao),
  )

  return { ok: true, comunicacoes, parcial }
}
