/**
 * API Pública do Datajud (CNJ) — consulta de metadados processuais.
 *
 * O QUE ESTA API ENTREGA
 * - Capa processual (classe, assuntos, órgão julgador, grau, data de ajuizamento)
 *   e a lista de movimentações de processos públicos de ~90 tribunais, incluindo
 *   o TJMA (alias `api_publica_tjma`).
 * - Busca exclusivamente pelo NÚMERO ÚNICO CNJ (20 dígitos).
 *
 * O QUE ESTA API **NÃO** ENTREGA (limitações relevantes p/ "Consulta de Antecedentes")
 * - Não há busca por CPF/CNPJ nem por nome da parte: o CNJ removeu esses filtros
 *   deliberadamente para impedir perfilamento em massa (LGPD). Ou seja, "dado um
 *   CPF, liste os processos da pessoa" é impossível por esta API.
 * - Não devolve certidão de antecedentes criminais nem inteiro teor de peças.
 * - Processos em segredo de justiça não são publicados.
 * Por isso a certidão continua sendo obtida nos portais oficiais (links externos).
 *
 * AUTENTICAÇÃO
 * O CNJ publica uma chave pública única na wiki (https://datajud-wiki.cnj.jus.br/api-publica/acesso/)
 * e avisa que pode trocá-la a qualquer momento. Preferimos `DATAJUD_API_KEY` do
 * ambiente e caímos na chave publicada como padrão.
 *
 * Termos de uso: https://formularios.cnj.jus.br/wp-content/uploads/2023/11/Termos-de-uso-api-publica-V1.2.pdf
 */

export const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br'

/** Chave pública divulgada pelo CNJ na wiki do Datajud (pode ser rotacionada). */
const CHAVE_PUBLICA_CNJ = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

/** Justiça Estadual (segmento 8): código do tribunal → alias do índice. */
const TRIBUNAIS_ESTADUAIS: Record<string, string> = {
  '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba',
  '06': 'tjce', '07': 'tjdft', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
  '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb',
  '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
  '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse',
  '26': 'tjsp', '27': 'tjto',
}

/** Justiça Militar Estadual (segmento 9). */
const TRIBUNAIS_MILITARES_ESTADUAIS: Record<string, string> = {
  '13': 'tjmmg', '21': 'tjmrs', '26': 'tjmsp',
}

export interface ProcessoDatajud {
  numeroProcesso: string
  numeroFormatado: string
  tribunal: string
  grau: string | null
  classe: string | null
  assuntos: string[]
  orgaoJulgador: string | null
  dataAjuizamento: string | null
  ultimaAtualizacao: string | null
  movimentos: { nome: string; dataHora: string | null }[]
}

export type ResultadoConsulta =
  | { ok: true; alias: string; avisoDigitoVerificador: boolean; processos: ProcessoDatajud[] }
  | { ok: false; erro: TipoErroConsulta; mensagem: string }

export type TipoErroConsulta =
  | 'numero_invalido'
  | 'tribunal_nao_suportado'
  | 'nao_autorizado'
  | 'limite_excedido'
  | 'indisponivel'

/** Remove máscara e espaços, deixando apenas os dígitos do número CNJ. */
export function normalizarNumeroProcesso(valor: string): string {
  return (valor || '').replace(/\D/g, '')
}

/** NNNNNNN-DD.AAAA.J.TR.OOOO */
export function formatarNumeroProcesso(numero: string): string {
  const n = normalizarNumeroProcesso(numero)
  if (n.length !== 20) return numero
  return `${n.slice(0, 7)}-${n.slice(7, 9)}.${n.slice(9, 13)}.${n.slice(13, 14)}.${n.slice(14, 16)}.${n.slice(16, 20)}`
}

/**
 * Dígito verificador do número único (Resolução CNJ 65/2008): o DV é
 * 98 − (restante do número, com "00" no fim, módulo 97).
 */
export function digitoVerificadorValido(numero: string): boolean {
  const n = normalizarNumeroProcesso(numero)
  if (n.length !== 20) return false
  const dv = n.slice(7, 9)
  const semDv = `${n.slice(0, 7)}${n.slice(9)}00`
  const esperado = BigInt(98) - (BigInt(semDv) % BigInt(97))
  return esperado === BigInt(dv)
}

/** Descobre o índice do Datajud (ex.: `api_publica_tjma`) a partir do número CNJ. */
export function aliasDoTribunal(numero: string): string | null {
  const n = normalizarNumeroProcesso(numero)
  if (n.length !== 20) return null
  const segmento = n.slice(13, 14)
  const tribunal = n.slice(14, 16)

  switch (segmento) {
    case '3':
      return 'stj'
    case '4': {
      const regiao = parseInt(tribunal, 10)
      return regiao >= 1 && regiao <= 6 ? `trf${regiao}` : null
    }
    case '5': {
      const regiao = parseInt(tribunal, 10)
      if (regiao === 0) return 'tst'
      return regiao >= 1 && regiao <= 24 ? `trt${regiao}` : null
    }
    case '7':
      return 'stm'
    case '8':
      return TRIBUNAIS_ESTADUAIS[tribunal] || null
    case '9':
      return TRIBUNAIS_MILITARES_ESTADUAIS[tribunal] || null
    default:
      // Segmentos 1 (STF), 2 (CNJ) e 6 (Justiça Eleitoral) não têm índice
      // equivalente e previsível na API pública.
      return null
  }
}

function mapearProcesso(fonte: Record<string, any>): ProcessoDatajud {
  const numero = normalizarNumeroProcesso(fonte.numeroProcesso || '')
  const movimentos = Array.isArray(fonte.movimentos) ? fonte.movimentos : []
  return {
    numeroProcesso: numero,
    numeroFormatado: formatarNumeroProcesso(numero),
    tribunal: fonte.tribunal || '',
    grau: fonte.grau || null,
    classe: fonte.classe?.nome || null,
    assuntos: (Array.isArray(fonte.assuntos) ? fonte.assuntos : [])
      .map((a: any) => a?.nome)
      .filter(Boolean),
    orgaoJulgador: fonte.orgaoJulgador?.nome || null,
    dataAjuizamento: fonte.dataAjuizamento || null,
    ultimaAtualizacao: fonte.dataHoraUltimaAtualizacao || fonte['@timestamp'] || null,
    movimentos: movimentos
      .map((m: any) => ({ nome: m?.nome || '', dataHora: m?.dataHora || null }))
      .filter((m: { nome: string }) => m.nome)
      .sort((a: any, b: any) => String(b.dataHora || '').localeCompare(String(a.dataHora || ''))),
  }
}

/**
 * Consulta um processo por número único. Roda apenas no servidor (a chave e o
 * domínio do CNJ não devem ser expostos ao browser).
 */
export async function consultarProcesso(
  numeroBruto: string,
  opcoes: { limiteMovimentos?: number; signal?: AbortSignal } = {},
): Promise<ResultadoConsulta> {
  const numero = normalizarNumeroProcesso(numeroBruto)
  if (numero.length !== 20) {
    return {
      ok: false,
      erro: 'numero_invalido',
      mensagem: 'Informe o número único CNJ completo (20 dígitos), no formato 0000000-00.0000.0.00.0000.',
    }
  }

  const alias = aliasDoTribunal(numero)
  if (!alias) {
    return {
      ok: false,
      erro: 'tribunal_nao_suportado',
      mensagem: 'Este tribunal não possui índice na API Pública do Datajud. Use o portal oficial do tribunal.',
    }
  }

  const chave = process.env.DATAJUD_API_KEY || CHAVE_PUBLICA_CNJ

  let resposta: Response
  try {
    resposta = await fetch(`${DATAJUD_BASE_URL}/api_publica_${alias}/_search`, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${chave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ size: 5, query: { match: { numeroProcesso: numero } } }),
      signal: opcoes.signal,
      cache: 'no-store',
    })
  } catch {
    return {
      ok: false,
      erro: 'indisponivel',
      mensagem: 'Não foi possível falar com a API do CNJ agora. Tente novamente ou use o portal do tribunal.',
    }
  }

  if (resposta.status === 401 || resposta.status === 403) {
    return {
      ok: false,
      erro: 'nao_autorizado',
      mensagem: 'A chave da API Pública do Datajud foi recusada. O CNJ pode ter rotacionado a chave pública — atualize DATAJUD_API_KEY.',
    }
  }
  if (resposta.status === 429) {
    return {
      ok: false,
      erro: 'limite_excedido',
      mensagem: 'Limite de consultas do Datajud atingido. Aguarde alguns instantes e tente de novo.',
    }
  }
  if (!resposta.ok) {
    return {
      ok: false,
      erro: 'indisponivel',
      mensagem: `A API do CNJ respondeu com erro (${resposta.status}). Consulte o processo no portal do tribunal.`,
    }
  }

  let json: any
  try {
    json = await resposta.json()
  } catch {
    return {
      ok: false,
      erro: 'indisponivel',
      mensagem: 'Resposta inesperada da API do CNJ. Consulte o processo no portal do tribunal.',
    }
  }

  const limite = opcoes.limiteMovimentos ?? 40
  const processos: ProcessoDatajud[] = (json?.hits?.hits || [])
    .map((hit: any) => mapearProcesso(hit?._source || {}))
    .map((p: ProcessoDatajud) => ({ ...p, movimentos: p.movimentos.slice(0, limite) }))

  return {
    ok: true,
    alias,
    avisoDigitoVerificador: !digitoVerificadorValido(numero),
    processos,
  }
}
