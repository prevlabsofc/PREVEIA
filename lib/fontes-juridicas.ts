/**
 * Resolução de citações jurídicas para URLs de portais oficiais.
 *
 * O modelo NÃO gera URLs (elas seriam alucinadas). Ele emite apenas a seção
 * `## Fontes e Referências` com citações estruturadas ("Lei 8.213/1991 — Planalto").
 * Este módulo interpreta essas citações e resolve o link oficial correspondente.
 *
 * Quando a URL exata do documento não pode ser derivada com segurança, usamos a
 * busca oficial do órgão (marcada com `busca: true`) em vez de inventar um deep link.
 */

export interface FonteJuridica {
  id: string
  label: string
  descricao?: string
  orgao: string
  url: string
  /** true = link para busca oficial; false = link direto para o documento */
  busca?: boolean
}

const PLANALTO = 'https://www.planalto.gov.br'

/** Normas com URL verificada no Planalto (chave = número sem pontos). */
const LEIS_CURADAS: Record<string, { path: string; descricao: string }> = {
  '5172': { path: '/ccivil_03/leis/l5172compilado.htm', descricao: 'Código Tributário Nacional' },
  '8036': { path: '/ccivil_03/leis/l8036consol.htm', descricao: 'FGTS' },
  '8069': { path: '/ccivil_03/leis/l8069.htm', descricao: 'Estatuto da Criança e do Adolescente' },
  '8078': { path: '/ccivil_03/leis/l8078compilado.htm', descricao: 'Código de Defesa do Consumidor' },
  '8212': { path: '/ccivil_03/leis/l8212cons.htm', descricao: 'Custeio da Seguridade Social' },
  '8213': { path: '/ccivil_03/leis/l8213cons.htm', descricao: 'Planos de Benefícios da Previdência Social' },
  '8429': { path: '/ccivil_03/leis/l8429.htm', descricao: 'Improbidade Administrativa' },
  '8666': { path: '/ccivil_03/leis/l8666cons.htm', descricao: 'Licitações (revogada pela Lei 14.133/2021)' },
  '8742': { path: '/ccivil_03/leis/l8742.htm', descricao: 'LOAS — Assistência Social / BPC' },
  '9099': { path: '/ccivil_03/leis/l9099.htm', descricao: 'Juizados Especiais Cíveis e Criminais' },
  '9784': { path: '/ccivil_03/leis/l9784.htm', descricao: 'Processo Administrativo Federal' },
  '9868': { path: '/ccivil_03/leis/l9868.htm', descricao: 'Processo e julgamento de ADI e ADC' },
  '10259': { path: '/ccivil_03/leis/leis_2001/l10259.htm', descricao: 'Juizados Especiais Federais' },
  '10406': { path: '/ccivil_03/leis/2002/l10406.htm', descricao: 'Código Civil' },
  '10741': { path: '/ccivil_03/leis/2003/l10.741.htm', descricao: 'Estatuto da Pessoa Idosa' },
  '11340': { path: '/ccivil_03/_ato2004-2006/2006/lei/l11340.htm', descricao: 'Lei Maria da Penha' },
  '12008': { path: '/ccivil_03/_ato2007-2010/2009/lei/l12008.htm', descricao: 'Prioridade processual' },
  '13105': { path: '/ccivil_03/_ato2015-2018/2015/lei/l13105.htm', descricao: 'Código de Processo Civil' },
  '13146': { path: '/ccivil_03/_ato2015-2018/2015/lei/l13146.htm', descricao: 'Estatuto da Pessoa com Deficiência' },
  '13467': { path: '/ccivil_03/_ato2015-2018/2017/lei/l13467.htm', descricao: 'Reforma Trabalhista' },
  '13709': { path: '/ccivil_03/_ato2015-2018/2018/lei/l13709.htm', descricao: 'LGPD' },
  '14133': { path: '/ccivil_03/_ato2019-2022/2021/lei/l14133.htm', descricao: 'Licitações e Contratos' },
}

const DECRETOS_CURADOS: Record<string, { path: string; descricao: string }> = {
  '3048': { path: '/ccivil_03/decreto/d3048.htm', descricao: 'Regulamento da Previdência Social' },
}

const DECRETOS_LEI_CURADOS: Record<string, { path: string; descricao: string }> = {
  '2848': { path: '/ccivil_03/decreto-lei/del2848compilado.htm', descricao: 'Código Penal' },
  '3689': { path: '/ccivil_03/decreto-lei/del3689compilado.htm', descricao: 'Código de Processo Penal' },
  '4657': { path: '/ccivil_03/decreto-lei/del4657compilado.htm', descricao: 'LINDB' },
  '5452': { path: '/ccivil_03/decreto-lei/del5452.htm', descricao: 'CLT' },
}

/** Apelidos usados no dia a dia forense -> norma correspondente. */
const APELIDOS: { termos: RegExp; numero: string; tipo: 'lei' | 'decreto' | 'decreto-lei'; label: string }[] = [
  { termos: /\bCLT\b|\bConsolida[çc][ãa]o das Leis do Trabalho\b/i, numero: '5452', tipo: 'decreto-lei', label: 'CLT — Decreto-Lei 5.452/1943' },
  { termos: /\bC[óo]digo Civil\b|\bCC\/2002\b/i, numero: '10406', tipo: 'lei', label: 'Código Civil — Lei 10.406/2002' },
  { termos: /\bC[óo]digo de Processo Civil\b|\bCPC\/2015\b|\bCPC\b/i, numero: '13105', tipo: 'lei', label: 'CPC — Lei 13.105/2015' },
  { termos: /\bC[óo]digo de Processo Penal\b|\bCPP\b/i, numero: '3689', tipo: 'decreto-lei', label: 'CPP — Decreto-Lei 3.689/1941' },
  { termos: /\bC[óo]digo Penal\b/i, numero: '2848', tipo: 'decreto-lei', label: 'Código Penal — Decreto-Lei 2.848/1940' },
  { termos: /\bC[óo]digo de Defesa do Consumidor\b|\bCDC\b/i, numero: '8078', tipo: 'lei', label: 'CDC — Lei 8.078/1990' },
  { termos: /\bC[óo]digo Tribut[áa]rio Nacional\b|\bCTN\b/i, numero: '5172', tipo: 'lei', label: 'CTN — Lei 5.172/1966' },
  { termos: /\bEstatuto da Crian[çc]a e do Adolescente\b|\bECA\b/i, numero: '8069', tipo: 'lei', label: 'ECA — Lei 8.069/1990' },
  { termos: /\bEstatuto da Pessoa Idosa\b|\bEstatuto do Idoso\b/i, numero: '10741', tipo: 'lei', label: 'Estatuto da Pessoa Idosa — Lei 10.741/2003' },
  { termos: /\bEstatuto da Pessoa com Defici[êe]ncia\b|\bLBI\b/i, numero: '13146', tipo: 'lei', label: 'Estatuto da Pessoa com Deficiência — Lei 13.146/2015' },
  { termos: /\bLOAS\b|\bLei Org[âa]nica da Assist[êe]ncia Social\b/i, numero: '8742', tipo: 'lei', label: 'LOAS — Lei 8.742/1993' },
  { termos: /\bLei de Benef[íi]cios\b|\bPlano de Benef[íi]cios\b/i, numero: '8213', tipo: 'lei', label: 'Lei de Benefícios — Lei 8.213/1991' },
  { termos: /\bLei de Custeio\b/i, numero: '8212', tipo: 'lei', label: 'Lei de Custeio — Lei 8.212/1991' },
  { termos: /\bRegulamento da Previd[êe]ncia Social\b|\bRPS\b/i, numero: '3048', tipo: 'decreto', label: 'RPS — Decreto 3.048/1999' },
  { termos: /\bLGPD\b/i, numero: '13709', tipo: 'lei', label: 'LGPD — Lei 13.709/2018' },
]

const HOSTS_OFICIAIS = /(^|\.)(gov\.br|jus\.br|leg\.br|mp\.br)$/i

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function soDigitos(numero: string) {
  return numero.replace(/\D/g, '')
}

function formatarNumero(numero: string) {
  const n = soDigitos(numero)
  return n.length > 3 ? n.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : n
}

function normalizarAno(ano?: string) {
  if (!ano) return undefined
  const n = Number(ano)
  if (ano.length === 4) return String(n)
  return String(n <= 30 ? 2000 + n : 1900 + n)
}

/** Busca oficial da legislação federal (LexML — Rede de Informação Legislativa e Jurídica). */
function buscaLexml(termo: string) {
  return `https://www.lexml.gov.br/busca/search?keyword=${encodeURIComponent(termo)}`
}

function buscaSTF(termo: string) {
  return `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&pesquisa_inteiro_teor=false&sinonimo=true&plural=true&radicais=false&buscaExata=true&page=1&pageSize=10&queryString=${encodeURIComponent(termo)}&sort=_score&sortBy=desc`
}

function buscaSTJ(termo: string, base?: string) {
  const prefixo = base ? `b=${base}&` : ''
  return `https://scon.stj.jus.br/SCON/pesquisar.jsp?${prefixo}livre=${encodeURIComponent(termo)}`
}

const TST_SUMULAS = 'https://www.tst.jus.br/sumulas'
const TST_JURIS = 'https://jurisprudencia.tst.jus.br/'
const TNU_PORTAL = 'https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao'

function planalto(path: string) {
  return `${PLANALTO}${path}`
}

function fonteLei(numero: string, ano?: string, rotulo?: string): FonteJuridica {
  const num = soDigitos(numero)
  const anoNorm = normalizarAno(ano)
  const curada = LEIS_CURADAS[num]
  const label = rotulo || `Lei ${formatarNumero(num)}${anoNorm ? `/${anoNorm}` : ''}`

  if (curada) {
    return { id: `lei-${num}`, label, descricao: curada.descricao, orgao: 'Planalto', url: planalto(curada.path) }
  }
  // Leis até 1999 seguem o padrão estável /ccivil_03/leis/l{numero}.htm
  const anoNum = anoNorm ? Number(anoNorm) : undefined
  if ((anoNum && anoNum <= 1999) || (!anoNum && num.length <= 4)) {
    return { id: `lei-${num}`, label, orgao: 'Planalto', url: planalto(`/ccivil_03/leis/l${num}.htm`) }
  }
  return { id: `lei-${num}`, label, orgao: 'LexML', url: buscaLexml(label), busca: true }
}

function fonteLeiComplementar(numero: string, ano?: string): FonteJuridica {
  const num = soDigitos(numero)
  const anoNorm = normalizarAno(ano)
  return {
    id: `lc-${num}`,
    label: `Lei Complementar ${formatarNumero(num)}${anoNorm ? `/${anoNorm}` : ''}`,
    orgao: 'Planalto',
    url: planalto(`/ccivil_03/leis/lcp/lcp${num}.htm`),
  }
}

function fonteDecreto(numero: string, ano?: string): FonteJuridica {
  const num = soDigitos(numero)
  const anoNorm = normalizarAno(ano)
  const curado = DECRETOS_CURADOS[num]
  const label = `Decreto ${formatarNumero(num)}${anoNorm ? `/${anoNorm}` : ''}`
  if (curado) {
    return { id: `dec-${num}`, label, descricao: curado.descricao, orgao: 'Planalto', url: planalto(curado.path) }
  }
  const anoNum = anoNorm ? Number(anoNorm) : undefined
  if (anoNum && anoNum <= 1999) {
    return { id: `dec-${num}`, label, orgao: 'Planalto', url: planalto(`/ccivil_03/decreto/d${num}.htm`) }
  }
  return { id: `dec-${num}`, label, orgao: 'LexML', url: buscaLexml(label), busca: true }
}

function fonteDecretoLei(numero: string, ano?: string): FonteJuridica {
  const num = soDigitos(numero)
  const anoNorm = normalizarAno(ano)
  const curado = DECRETOS_LEI_CURADOS[num]
  const label = `Decreto-Lei ${formatarNumero(num)}${anoNorm ? `/${anoNorm}` : ''}`
  if (curado) {
    return { id: `dl-${num}`, label, descricao: curado.descricao, orgao: 'Planalto', url: planalto(curado.path) }
  }
  return { id: `dl-${num}`, label, orgao: 'Planalto', url: planalto(`/ccivil_03/decreto-lei/del${num}.htm`) }
}

function fonteApelido(numero: string, tipo: 'lei' | 'decreto' | 'decreto-lei', label: string): FonteJuridica {
  const base =
    tipo === 'lei' ? fonteLei(numero, undefined, label)
    : tipo === 'decreto' ? fonteDecreto(numero)
    : fonteDecretoLei(numero)
  return { ...base, label }
}

type Matcher = {
  regex: RegExp
  build: (m: RegExpMatchArray) => FonteJuridica | null
}

/** A ordem importa: padrões mais específicos primeiro. */
const MATCHERS: Matcher[] = [
  {
    regex: /\bs[uú]mula\s+vinculante\s*(?:n[º°.]?\s*)?(\d{1,3})/gi,
    build: m => ({
      id: `sv-${m[1]}`,
      label: `Súmula Vinculante ${m[1]}`,
      orgao: 'STF',
      url: buscaSTF(`Súmula Vinculante ${m[1]}`),
      busca: true,
    }),
  },
  {
    // "Súmula 149 do STJ", "Súmula 149/STJ", "Súmula 41 da TNU", "Súmula 331 - TST"
    regex: /\bs[uú]mula\s*(?:n[º°.]?\s*)?(\d{1,3})[\s,;]*(?:[-–—/]\s*)?(?:d[oae]\s+)?(STF|STJ|TST|TNU)\b/gi,
    build: m => sumula(m[1], m[2]),
  },
  {
    regex: /\bs[uú]mula\s+(STF|STJ|TST|TNU)\s*(?:n[º°.]?\s*)?(\d{1,3})/gi,
    build: m => sumula(m[2], m[1]),
  },
  {
    regex: /\btema\s*(?:repetitivo\s+|de\s+repercuss[ãa]o\s+geral\s+)?(?:n[º°.]?\s*)?(\d{1,4})[\s,;]*(?:[-–—/]\s*)?(?:d[oae]\s+)?(STF|STJ|TNU|TST)\b/gi,
    build: m => {
      const orgao = m[2].toUpperCase()
      const label = `Tema ${m[1]} — ${orgao}`
      if (orgao === 'STF') return { id: `tema-stf-${m[1]}`, label, orgao, url: buscaSTF(`Tema ${m[1]} repercussão geral`), busca: true }
      if (orgao === 'STJ') return { id: `tema-stj-${m[1]}`, label, orgao, url: buscaSTJ(`Tema ${m[1]}`), busca: true }
      if (orgao === 'TNU') return { id: `tema-tnu-${m[1]}`, label, orgao, url: TNU_PORTAL, busca: true }
      return { id: `tema-tst-${m[1]}`, label, orgao, url: TST_JURIS, busca: true }
    },
  },
  {
    regex: /\b(ADI|ADPF|ADC|ARE|RE|HC|RHC|MS|MI)\s*(?:n[º°.]?\s*)?([\d.]{2,12})/g,
    build: m => {
      const tipo = m[1].toUpperCase()
      const num = formatarNumero(m[2])
      return { id: `stf-${tipo}-${soDigitos(m[2])}`, label: `${tipo} ${num}`, orgao: 'STF', url: buscaSTF(`${tipo} ${num}`), busca: true }
    },
  },
  {
    regex: /\b(REsp|AREsp|EREsp)\s*(?:n[º°.]?\s*)?([\d.]{3,12})/gi,
    build: m => {
      const tipo = m[1]
      const num = formatarNumero(m[2])
      return { id: `stj-${tipo.toLowerCase()}-${soDigitos(m[2])}`, label: `${tipo} ${num}`, orgao: 'STJ', url: buscaSTJ(`${tipo} ${num}`), busca: true }
    },
  },
  {
    regex: /\bPEDILEF\s*(?:n[º°.]?\s*)?([\d.\-/]{4,25})/gi,
    build: m => ({ id: `tnu-pedilef-${soDigitos(m[1])}`, label: `PEDILEF ${m[1]}`, orgao: 'TNU', url: TNU_PORTAL, busca: true }),
  },
  {
    regex: /\b(?:orienta[çc][ãa]o jurisprudencial|OJ)\s*(?:n[º°.]?\s*)?(\d{1,3})\s*(?:d[aoe]\s+)?(SDI-?\s*[12]|SBDI-?\s*[12])?/gi,
    build: m => ({
      id: `tst-oj-${m[1]}`,
      label: `OJ ${m[1]}${m[2] ? ` da ${m[2].toUpperCase()}` : ''} — TST`,
      orgao: 'TST',
      url: TST_JURIS,
      busca: true,
    }),
  },
  {
    regex: /\b(?:Emenda\s+Constitucional|EC)\s*(?:n[º°.]?\s*)?(\d{1,3})\s*(?:\/\s*(\d{2,4}))?/gi,
    build: m => {
      const ano = normalizarAno(m[2])
      return {
        id: `ec-${m[1]}`,
        label: `Emenda Constitucional ${m[1]}${ano ? `/${ano}` : ''}`,
        orgao: 'Planalto',
        url: planalto(`/ccivil_03/constituicao/emendas/emc/emc${m[1]}.htm`),
      }
    },
  },
  {
    regex: /\bLei\s+Complementar\s*(?:n[º°.]?\s*)?(\d{1,3}(?:\.\d{3})*)\s*(?:\/\s*(\d{2,4}))?/gi,
    build: m => fonteLeiComplementar(m[1], m[2]),
  },
  {
    regex: /\bDecreto[-\s]Lei\s*(?:n[º°.]?\s*)?(\d{1,3}(?:\.\d{3})*)\s*(?:\/\s*(\d{2,4}))?/gi,
    build: m => fonteDecretoLei(m[1], m[2]),
  },
  {
    regex: /\bDecreto\s*(?:n[º°.]?\s*)?(\d{1,3}(?:\.\d{3})*)\s*\/\s*(\d{2,4})/gi,
    build: m => fonteDecreto(m[1], m[2]),
  },
  {
    regex: /\bLei\s+(?:Federal\s+)?(?:n[º°.]?\s*)?(\d{1,3}(?:\.\d{3})*)\s*\/\s*(\d{2,4})/gi,
    build: m => fonteLei(m[1], m[2]),
  },
  {
    regex: /\b(?:CF\/88|CF\/1988|CRFB(?:\/88)?|Constitui[çc][ãa]o Federal|Constitui[çc][ãa]o da Rep[úu]blica)/gi,
    build: () => ({
      id: 'cf88',
      label: 'Constituição Federal de 1988',
      orgao: 'Planalto',
      url: planalto('/ccivil_03/constituicao/constituicao.htm'),
    }),
  },
]

function sumula(numero: string, orgaoBruto?: string): FonteJuridica | null {
  const orgao = (orgaoBruto || '').toUpperCase().replace(/\s|-/g, '')
  const label = `Súmula ${numero}${orgao ? ` — ${orgao}` : ''}`
  if (orgao === 'STF') return { id: `sum-stf-${numero}`, label, orgao: 'STF', url: buscaSTF(`Súmula ${numero}`), busca: true }
  if (orgao === 'STJ') return { id: `sum-stj-${numero}`, label, orgao: 'STJ', url: buscaSTJ(`Súmula ${numero}`, 'SUMU'), busca: true }
  if (orgao === 'TST') return { id: `sum-tst-${numero}`, label, orgao: 'TST', url: TST_SUMULAS, busca: true }
  if (orgao === 'TNU') return { id: `sum-tnu-${numero}`, label, orgao: 'TNU', url: TNU_PORTAL, busca: true }
  // Sem órgão identificado não há portal confiável para apontar.
  return null
}

/** Resolve uma citação avulsa ("Lei 8.213/1991", "Súmula 149 do STJ") para uma fonte oficial. */
export function resolverFonte(citacao: string): FonteJuridica | null {
  const texto = citacao.trim()
  if (!texto) return null

  for (const { regex, build } of MATCHERS) {
    regex.lastIndex = 0
    const m = regex.exec(texto)
    if (m) {
      const fonte = build(m)
      if (fonte) return fonte
    }
  }

  for (const apelido of APELIDOS) {
    if (apelido.termos.test(texto)) return fonteApelido(apelido.numero, apelido.tipo, apelido.label)
  }

  return null
}

const CABECALHO_FONTES =
  /^\s{0,3}(?:#{1,4}\s*)?(?:\*\*|__)?\s*fontes\s+e\s+referencias\s*:?\s*(?:\*\*|__)?\s*$/i

/** Separa o corpo da resposta da seção "Fontes e Referências" emitida pelo modelo. */
export function separarSecaoFontes(texto: string): { corpo: string; secao: string | null } {
  const linhas = texto.split('\n')
  const idx = linhas.findIndex(l => CABECALHO_FONTES.test(semAcento(l)))
  if (idx === -1) return { corpo: texto, secao: null }
  return {
    corpo: linhas.slice(0, idx).join('\n').trimEnd(),
    secao: linhas.slice(idx + 1).join('\n').trim(),
  }
}

function urlOficial(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    return /^https?:$/.test(protocol) && HOSTS_OFICIAIS.test(hostname)
  } catch {
    return false
  }
}

function limparItem(linha: string) {
  return linha
    .replace(/^\s*(?:[-*+•]|\d+[.)])\s*/, '')
    .replace(/^\s*(?:\*\*|__)|(?:\*\*|__)\s*$/g, '')
    .trim()
}

/** Converte as linhas da seção "Fontes e Referências" em fontes com link oficial. */
export function parsearItensFontes(secao: string): FonteJuridica[] {
  const fontes: FonteJuridica[] = []

  for (const linhaBruta of secao.split('\n')) {
    const linha = limparItem(linhaBruta)
    if (!linha) continue

    // O modelo é instruído a não gerar URLs, mas se gerar só aceitamos domínios oficiais.
    const link = linha.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/)
    const texto = link ? `${link[1]} ${linha.replace(link[0], '')}` : linha

    const resolvida = resolverFonte(texto)
    if (resolvida) {
      const complemento = texto
        .split(/\s+[—–]\s+|\s+-\s+/)
        .slice(1)
        .join(' · ')
        .replace(/\b(Planalto|STF|STJ|TST|TNU|CJF|LexML)\b/gi, '')
        .replace(/[·—–]\s*$|^\s*[·—–]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
      fontes.push({
        ...resolvida,
        descricao: resolvida.descricao || (complemento.length > 3 ? complemento : undefined),
      })
      continue
    }

    if (link && urlOficial(link[2])) {
      fontes.push({ id: `link-${fontes.length}`, label: link[1], orgao: new URL(link[2]).hostname.replace(/^www\./, ''), url: link[2] })
    }
  }

  return dedup(fontes)
}

/** Varre o corpo do texto procurando citações reconhecíveis (fallback). */
export function varrerCitacoes(texto: string, limite = 12): FonteJuridica[] {
  const fontes: FonteJuridica[] = []

  for (const { regex, build } of MATCHERS) {
    regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(texto)) !== null) {
      const fonte = build(m)
      if (fonte) fontes.push(fonte)
      if (m[0].length === 0) regex.lastIndex++
    }
  }

  for (const apelido of APELIDOS) {
    if (apelido.termos.test(texto)) fontes.push(fonteApelido(apelido.numero, apelido.tipo, apelido.label))
  }

  return dedup(fontes).slice(0, limite)
}

function dedup(fontes: FonteJuridica[]): FonteJuridica[] {
  const vistos = new Set<string>()
  const saida: FonteJuridica[] = []
  for (const f of fontes) {
    if (vistos.has(f.id)) continue
    vistos.add(f.id)
    saida.push(f)
  }
  return saida
}

interface ExtrairOpts {
  /** Varre o corpo quando o modelo não emitiu a seção (respostas antigas). Padrão: true. */
  varrerCorpo?: boolean
  limite?: number
}

/**
 * Ponto de entrada usado pela UI: separa o corpo da resposta e devolve as fontes
 * já resolvidas para os portais oficiais.
 */
export function extrairFontes(texto: string, opts: ExtrairOpts = {}): { corpo: string; fontes: FonteJuridica[] } {
  const { varrerCorpo = true, limite = 12 } = opts
  if (!texto) return { corpo: '', fontes: [] }

  const { corpo, secao } = separarSecaoFontes(texto)
  if (secao !== null) {
    const fontes = parsearItensFontes(secao)
    if (fontes.length > 0) return { corpo, fontes: fontes.slice(0, limite) }
    // Seção presente mas vazia/ilegível: cai para a varredura do corpo.
    return { corpo, fontes: varrerCorpo ? varrerCitacoes(corpo, limite) : [] }
  }

  return { corpo, fontes: varrerCorpo ? varrerCitacoes(corpo, limite) : [] }
}
