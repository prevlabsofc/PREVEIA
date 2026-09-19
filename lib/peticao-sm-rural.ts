/**
 * Template visual fiel ao modelo Custódio Advogados para
 * Salário-Maternidade — Segurada Especial (salario-maternidade-rural).
 *
 * A IA devolve marcadores <<<SECAO>>>…<<<END_SECAO>>>. Este módulo
 * canonicaliza nomes malformados, extrai o miolo e NUNCA deixa as tags
 * (nem o JSON da timeline) vazarem para o HTML/PDF.
 */

import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  corrigirLocalNoTexto,
  formatarLocalData,
  limparMarkdownResidual,
  resolverLocalAdvogado,
} from '@/lib/peticao-export'
import { valorCausaSalarioMaternidade } from '@/lib/salario-minimo'

export type TimelineLabelLayout = {
  i: number
  x: number
  above: boolean
  blocoW: number
  dataY: number
  titleYs: number[]
  detailY: number | null
  blocoTop: number
  blocoBottom: number
}

export const AGENT_SM_RURAL = 'salario-maternidade-rural'

/** Mensagem exibida quando a geração Claude truncou / seções ficaram vazias. */
export const ERRO_GERACAO_INTERROMPIDA =
  'A geração foi interrompida. Tente novamente.'

export type TimelineEstilo = 'horizontal' | 'vertical' | 'none'

export type TimelineEvento = {
  data: string
  titulo: string
  detalhe?: string
}

export type TimelineData = {
  nome: string
  atividade: string
  local: string
  estilo?: TimelineEstilo
  eventos: TimelineEvento[]
}

export type QuadroRow = { campo: string; valor: string }
export type Prioridades = { idoso: boolean; deficiente: boolean; menor: boolean }

/** Bloco "DA …:" da seção I (todos os subtítulos, não só o primeiro). */
export type PreliminarBloco = { titulo: string; corpo: string }

/** Conteúdo parseado da petição SM — fonte única para HTML/PDF e DOCX. */
export type ConteudoSmRural = {
  meta: { tipoAcao: string; juizoDigital: boolean; prioridades: Prioridades }
  enderecoTexto: string
  qualificacao: string
  titulo: string
  subtitulo: string
  emFace: string
  preliminares: PreliminarBloco[]
  quadro: QuadroRow[]
  sinteseAntes: string
  /** Timeline parseada; DOCX pode omitir sem quebrar. */
  timeline: TimelineData | null
  sinteseDepois: string
  provas: string[]
  provasFecho: string
  fundamentacao: string
  pedidos: string[]
  fechamentoExtra: string
  localData: string
  assinaturas: { nome: string; oab: string }[]
  planilha: { rows: QuadroRow[]; nota: string }
}

function escapar(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const ANO_MIN = 1900
const ANO_MAX = () => Math.min(2100, new Date().getFullYear() + 1)

/**
 * Valida/normaliza datas BR para o PDF. Ano deve ter 4 dígitos e cair em
 * 1900..(ano atual+1, máx 2100). Valores absurdos → "A informar".
 * Textos sem dígitos (ex.: "Infância") passam intactos.
 */
export function sanitizarDataPeticao(
  valor: string,
  fallback = 'A informar',
): string {
  const raw = String(valor || '').trim()
  if (!raw) return fallback
  if (!/\d/.test(raw)) return raw

  const anoOk = (y: number) => y >= ANO_MIN && y <= ANO_MAX()

  const fmt = (d: number, m: number, y: number) => {
    if (!anoOk(y) || m < 1 || m > 12 || d < 1 || d > 31) return null
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }

  const expandYear = (yStr: string): number => {
    const n = Number.parseInt(yStr, 10)
    if (yStr.length === 2) return n >= 50 ? 1900 + n : 2000 + n
    return n
  }

  // dd/mm/yyyy | dd-mm-yyyy | dd.mm.yyyy
  let m = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    const out = fmt(
      Number.parseInt(m[1], 10),
      Number.parseInt(m[2], 10),
      expandYear(m[3]),
    )
    return out || fallback
  }

  // yyyy-mm-dd (ISO / input date)
  m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const out = fmt(
      Number.parseInt(m[3], 10),
      Number.parseInt(m[2], 10),
      Number.parseInt(m[1], 10),
    )
    return out || fallback
  }

  // Ano isolado (4 dígitos)
  m = raw.match(/^(\d{4})$/)
  if (m) {
    const y = Number.parseInt(m[1], 10)
    return anoOk(y) ? String(y) : fallback
  }

  // Substitui datas embutidas em texto maior
  const re = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g
  if (re.test(raw)) {
    return raw.replace(re, (piece) => sanitizarDataPeticao(piece, fallback))
  }

  // ISO embutido
  const reIso = /(\d{4})-(\d{2})-(\d{2})/g
  if (reIso.test(raw)) {
    return raw.replace(reIso, (piece) => sanitizarDataPeticao(piece, fallback))
  }

  return raw
}

/** Campos do quadro cujos valores são tipicamente datas. */
function campoEhData(campo: string): boolean {
  return /data|nascimento|requer|indefer|der\.?\s*adm|req\.?\s*adm/i.test(campo)
}

/**
 * Nome de arquivo PDF: peticao-salario-maternidade-francisca-lima-souza
 */
export function slugArquivoPeticaoSm(nomeCliente: string): string {
  const slug = String(nomeCliente || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  return `peticao-salario-maternidade-${slug || 'cliente'}`
}

const MARCADOR_RE = /<<<\s*\/?\s*([A-Z0-9_]+)\s*>>>/gi

function compactTag(name: string): string {
  return String(name || '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
}

/** Nomes canônicos a partir da forma compacta (absorve <<<ENDIIANTES>>> etc.). */
const CANON_BY_COMPACT: Record<string, string> = {
  SMRURALV2: 'SM_RURAL_V2',
  META: 'META',
  ENDMETA: 'END_META',
  ENDERECO: 'ENDERECO',
  ENDENDERECO: 'END_ENDERECO',
  QUALIFICACAO: 'QUALIFICACAO',
  ENDQUALIFICACAO: 'END_QUALIFICACAO',
  TITULO: 'TITULO',
  SUBTITULO: 'SUBTITULO',
  ENDTITULO: 'END_TITULO',
  EMFACE: 'EM_FACE',
  ENDEMFACE: 'END_EM_FACE',
  IPRELIMINARES: 'I_PRELIMINARES',
  ENDI: 'END_I',
  IIQUADRO: 'II_QUADRO',
  ENDII: 'END_II',
  IIISINTESEANTES: 'III_SINTESE_ANTES',
  IIIANTES: 'III_SINTESE_ANTES',
  ENDIIIANTES: 'END_III_ANTES',
  ENDIIANTES: 'END_III_ANTES',
  TIMELINE: 'TIMELINE',
  ENDTIMELINE: 'END_TIMELINE',
  IIISINTESEDEPOIS: 'III_SINTESE_DEPOIS',
  IIIDEPOIS: 'III_SINTESE_DEPOIS',
  ENDIIIDEPOIS: 'END_III_DEPOIS',
  ENDIIDEPOIS: 'END_III_DEPOIS',
  IVPROVAS: 'IV_PROVAS',
  ENDIV: 'END_IV',
  IVFECHO: 'IV_FECHO',
  ENDIVFECHO: 'END_IV_FECHO',
  VFUNDAMENTACAO: 'V_FUNDAMENTACAO',
  ENDV: 'END_V',
  VIPEDIDOS: 'VI_PEDIDOS',
  ENDVI: 'END_VI',
  FECHAMENTO: 'FECHAMENTO',
  ENDFECHAMENTO: 'END_FECHAMENTO',
  PLANILHA: 'PLANILHA',
  ENDPLANILHA: 'END_PLANILHA',
}

/** Normaliza marcadores da IA (nomes errados, espaços) para a forma canônica. */
export function canonicalizarMarcadoresSm(text: string): string {
  return String(text || '').replace(MARCADOR_RE, (_m, name: string) => {
    const canon = CANON_BY_COMPACT[compactTag(name)]
    return canon ? `<<<${canon}>>>` : ''
  })
}

/** Remove qualquer <<<TAG>>> residual do texto/HTML. */
export function stripMarcadoresSm(text: string): string {
  return String(text || '')
    .replace(/<<<[^>]*>>>/g, '')
    .replace(/<<\s*\/?\s*[A-Z0-9_]*\s*>>/gi, '')
    .replace(/<<\s*>>/g, '')
    .replace(/&lt;&lt;&lt;[^&]*&gt;&gt;&gt;/gi, '')
    .replace(/&lt;&lt;\s*&gt;&gt;/gi, '')
}

const TITULO_SM_PADRAO =
  'AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE'
/** Fallback neutro — NÃO forçar feminino (homem pode requerer SM). */
export const SUBTITULO_SM_NEUTRO = '(SEGURADO(A) ESPECIAL – AGRICULTOR(A))'
export const SUBTITULO_SM_MASCULINO = '(SEGURADO ESPECIAL – AGRICULTOR)'
export const SUBTITULO_SM_FEMININO = '(SEGURADA ESPECIAL – AGRICULTORA)'
/** Alias histórico (feminino). Preferir subtituloSmPorSexo. */
export const SUBTITULO_SM_PADRAO = SUBTITULO_SM_FEMININO

const SUBTITULO_PAREN_RE =
  /\(\s*SEGURAD[OA](?:\(A\))?\s+ESPECIAL\s*[–—\-]\s*AGRICULTOR(?:A|\(A\))?\s*\)/gi

export function normalizarSexoParteAutora(
  sexoRaw?: string | null,
): 'masculino' | 'feminino' | '' {
  const s = String(sexoRaw || '').trim().toLowerCase()
  if (s === 'masculino' || s === 'm' || s === 'male' || s === 'homem') return 'masculino'
  if (s === 'feminino' || s === 'f' || s === 'female' || s === 'mulher') return 'feminino'
  return ''
}

export function subtituloSmPorSexo(sexoRaw?: string | null): string {
  const sexo = normalizarSexoParteAutora(sexoRaw)
  if (sexo === 'masculino') return SUBTITULO_SM_MASCULINO
  if (sexo === 'feminino') return SUBTITULO_SM_FEMININO
  return SUBTITULO_SM_NEUTRO
}

/** Default de atividade na timeline conforme sexo da parte autora. */
export function atividadeAgricultorPorSexo(sexoRaw?: string | null): string {
  const sexo = normalizarSexoParteAutora(sexoRaw)
  if (sexo === 'masculino') return 'Agricultor'
  if (sexo === 'feminino') return 'Agricultora'
  return 'Agricultor(a)'
}

const ATIVIDADE_AGRICULTOR_RE = /^agricultor(?:a|\(a\))?$/i

/**
 * Flexiona Agricultor/Agricultora quando a atividade é genérica ou vazia.
 * Outras profissões (ex.: Pescador) são preservadas.
 */
export function flexionarAtividadeTimeline(
  atividadeRaw?: string | null,
  sexoRaw?: string | null,
): string {
  const fallback = atividadeAgricultorPorSexo(sexoRaw)
  const a = String(atividadeRaw || '').trim()
  if (!a || ATIVIDADE_AGRICULTOR_RE.test(a)) return fallback
  return a
}

/** Alinha atividade ao sexo conhecido ou ao subtítulo já canônico da peça. */
export function alinharAtividadeTimeline(
  atividadeRaw?: string | null,
  sexoRaw?: string | null,
  subtituloRaw?: string | null,
): string {
  const sexo =
    normalizarSexoParteAutora(sexoRaw) ||
    (() => {
      const sub = String(subtituloRaw || '')
      if (/\bAGRICULTORA\b/i.test(sub) || /\bSEGURADA ESPECIAL\b/i.test(sub)) {
        return 'feminino' as const
      }
      if (
        /\bSEGURADO ESPECIAL\b/i.test(sub) &&
        /\bAGRICULTOR\b/i.test(sub) &&
        !/\bAGRICULTORA\b/i.test(sub)
      ) {
        return 'masculino' as const
      }
      return '' as const
    })()
  return flexionarAtividadeTimeline(atividadeRaw, sexo || sexoRaw)
}

/**
 * Remove artefatos << >> / tags e deduplica título × subtítulo.
 * Funciona mesmo quando a IA cola o subtítulo (uma ou mais vezes) dentro de TITULO.
 * `sexoParteAutora` define o subtítulo fixo quando o bloco vem vazio ou inconsistente.
 */
export function normalizarTituloSubtitulo(
  tituloRaw: string,
  subtituloRaw: string,
  sexoParteAutora?: string | null,
): { titulo: string; subtitulo: string } {
  const limpar = (s: string) =>
    stripMarcadoresSm(limparMarkdownResidual(s || ''))
      .replace(/<<\s*\/?\s*[A-Z0-9_]*\s*>>/gi, ' ')
      .replace(/<<\s*>>/g, ' ')
      .replace(/&lt;&lt;.*?&gt;&gt;/gi, ' ')
      .replace(/[<>]{1,}/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

  let titulo = limpar(tituloRaw)
  let subtitulo = limpar(subtituloRaw)
  const desejado = subtituloSmPorSexo(sexoParteAutora)
  const sexo = normalizarSexoParteAutora(sexoParteAutora)

  const parenRe = SUBTITULO_PAREN_RE
  const foundInTitle = titulo.match(parenRe)
  if (foundInTitle?.[0]) {
    if (!subtitulo) subtitulo = foundInTitle[0].replace(/\s+/g, ' ').trim()
    titulo = titulo.replace(parenRe, ' ').replace(/\s{2,}/g, ' ').trim()
  }

  // Também no subtítulo cru (IA pode colar título+subtítulo nos dois blocos)
  const foundInSub = subtitulo.match(parenRe)
  if (foundInSub?.[0]) {
    subtitulo = foundInSub[0].replace(/\s+/g, ' ').trim()
  }

  titulo = titulo
    .replace(/\bSEGURAD[OA](?:\(A\))?\s+ESPECIAL\s*[–—\-]\s*AGRICULTOR(?:A|\(A\))?\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (subtitulo) {
    const plain = subtitulo.replace(/[()]/g, '').trim()
    if (plain) {
      const esc = plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      titulo = titulo
        .replace(new RegExp(`\\(?\\s*${esc}\\s*\\)?`, 'gi'), ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
      subtitulo = subtitulo
        .replace(new RegExp(`(\\(?\\s*${esc}\\s*\\)?)\\s*\\1+`, 'gi'), '$1')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }
  }

  if (!titulo) titulo = TITULO_SM_PADRAO

  // Se sexo conhecido, força o subtítulo canônico (evita misturar agricultora em autor masculino)
  if (sexo) {
    subtitulo = desejado
  } else if (!subtitulo) {
    subtitulo = SUBTITULO_SM_NEUTRO
  }

  if (!/^\(/.test(subtitulo)) {
    subtitulo = `(${subtitulo.replace(/^\(+|\)+$/g, '')})`
  }

  subtitulo = subtitulo.replace(
    /(\(\s*SEGURAD[OA](?:\(A\))?\s+ESPECIAL\s*[–—\-]\s*AGRICULTOR(?:A|\(A\))?\s*\))\s*\1+/gi,
    '$1',
  )

  // Garante uma única ocorrência do subtítulo
  const once = subtitulo.match(parenRe)
  if (once?.[0]) subtitulo = once[0].replace(/\s+/g, ' ').trim()

  return { titulo, subtitulo }
}

function proximoMarcadorIndex(text: string, from: number): number {
  const re = /<<<[A-Z0-9_]+>>>/g
  re.lastIndex = from
  const m = re.exec(text)
  return m ? m.index : -1
}

/**
 * Extrai o miolo entre start e end. Se o fechamento faltar, para no
 * próximo marcador — nunca engole o resto do documento.
 */
function bloco(text: string, start: string, end: string): string {
  const startTag = start.startsWith('<<<') ? start : `<<<${start}>>>`
  const endTag = end.startsWith('<<<') ? end : `<<<${end}>>>`
  const a = text.indexOf(startTag)
  if (a === -1) return ''
  const after = a + startTag.length
  const b = text.indexOf(endTag, after)
  let limit = b === -1 ? text.length : b
  const next = proximoMarcadorIndex(text, after)
  if (next !== -1 && next < limit) limit = next
  return stripMarcadoresSm(text.slice(after, limit)).trim()
}

function parseMeta(raw: string): {
  tipoAcao: string
  juizoDigital: boolean
  prioridades: Prioridades
} {
  const tipoAcao =
    raw.match(/tipo_acao:\s*(.+)/i)?.[1]?.trim() ||
    'SALÁRIO MATERNIDADE - SEGURADO ESPECIAL'
  const juizoDigital = !/juizo_digital:\s*false/i.test(raw)
  return {
    tipoAcao,
    juizoDigital,
    prioridades: {
      idoso: /prioridade_idoso:\s*true/i.test(raw),
      deficiente: /prioridade_deficiente:\s*true/i.test(raw),
      menor: /prioridade_menor:\s*true/i.test(raw),
    },
  }
}

/** Idade no quadro: "Não informada" faz sentido; demais opcionais vazios são omitidos. */
function quadroValorOmitivel(campo: string, valor: string): boolean {
  const v = valor.trim()
  if (!v) return true
  const ehIdade = /idade/i.test(campo)
  if (/^não\s+informad[oa]s?$/i.test(v) || /^n\/?a$/i.test(v) || /^—$|^-$/.test(v)) {
    return !ehIdade
  }
  if (/^não\s+consta$/i.test(v)) return false
  return false
}

function parseQuadro(md: string): QuadroRow[] {
  const rows: QuadroRow[] = []
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    const m =
      trimmed.match(/^\|(.+?)\|(.+?)\|\s*$/) ||
      trimmed.match(/^\|(.+?)\|(.+?)\|?$/)
    if (m) {
      const campo = limparMarkdownResidual(m[1].trim())
      let valor = limparMarkdownResidual(m[2].trim())
      if (!campo || /^[-:]+$/.test(campo) || /^campo$/i.test(campo)) continue
      if (/^valor$/i.test(valor)) continue
      if (quadroValorOmitivel(campo, valor)) continue
      const pareceData =
        campoEhData(campo) ||
        /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(valor) ||
        /^\d{4}-\d{2}-\d{2}/.test(valor)
      if (pareceData) valor = sanitizarDataPeticao(valor)
      rows.push({ campo, valor })
      continue
    }
  }
  return rows
}

/** Remove "portadora do RG …" / "RG não informado" quando RG vazio. */
export function limparRgNaQualificacao(texto: string): string {
  let s = String(texto || '')
  s = s.replace(
    /,?\s*(?:portador(?:a)?\s+do\s+)?RG\s*(?:n[º°o.]?\s*)?(?:não\s+informado|não\s+informada|n\/?a|—|-)?\s*(?:,|\s+SSP|\s+e\s+CPF|\s+CPF|$)/gi,
    (m) => {
      if (/não\s+informad|n\/?a|—|-?\s*$/i.test(m) || /RG\s*,/i.test(m) || /RG\s+e\s+CPF/i.test(m)) {
        if (/e\s+CPF/i.test(m)) return ', CPF'
        if (/SSP/i.test(m)) return ','
        return ','
      }
      return m
    },
  )
  s = s.replace(/,?\s*RG\s+não\s+informad[oa]\s*,?/gi, ',')
  s = s.replace(/,\s*,+/g, ',').replace(/\s{2,}/g, ' ').replace(/,\s*\./g, '.')
  return s.trim()
}

/** Normaliza endereçamento JEF e citação do INSS (sem "Comarca"). */
export function normalizarEnderecoJef(texto: string, cidadeUf?: string): string {
  let s = String(texto || '').trim()
  const local = (cidadeUf || '').trim()
  s = s.replace(
    /AO\s+JU[IÍ]ZO\s+FEDERAL\s+(?:DA\s+VARA\s+DO\s+)?JUIZADO\s+ESPECIAL\s+FEDERAL\s+DA\s+SUBSE[CÇ][AÃ]O\s+JUDICI[AÁ]RIA\s+(?:DA\s+)?COMARCA\s+DE\s+/gi,
    'AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ',
  )
  s = s.replace(
    /AO\s+JU[IÍ]ZO\s+FEDERAL\s+DA\s+VARA\s+DO\s+JUIZADO\s+ESPECIAL\s+FEDERAL\s+DA\s+SUBSE[CÇ][AÃ]O\s+JUDICI[AÁ]RIA\s+(?:DE\s+)?/gi,
    'AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ',
  )
  if (local && /\[CIDADE\]|\[UF\]/i.test(s)) {
    s = s.replace(/\[CIDADE\]\s*\/\s*\[UF\]/gi, local)
  }
  return s
}

export function normalizarCitacaoInss(texto: string): string {
  return String(texto || '')
    .replace(
      /Ag[eê]ncia\s+do\s+INSS\s+na\s+Comarca\s+de/gi,
      'Agência da Previdência Social em',
    )
    .replace(
      /Ag[eê]ncia\s+do\s+INSS\s+(?:em|de|na)\s+/gi,
      'Agência da Previdência Social em ',
    )
}

/**
 * Extrai itens de prova como tópicos. Aceita ✓ / - / * / números / "Nome — expl".
 * Nunca devolve parágrafos corridos longos sem marcador (quebra por frase se preciso).
 */
function parseProvas(raw: string): string[] {
  const text = String(raw || '').trim()
  if (!text) return []

  // Preferência: linhas com marcador
  const porLinha = text
    .split(/\n+/)
    .map((l) =>
      l
        .replace(/^✓\s*/, '')
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim(),
    )
    .filter(Boolean)
    .filter((l) => !l.startsWith('<') && !/^#{1,6}\s/.test(l))
    .filter((l) => !/^das?\s+provas/i.test(l))

  if (porLinha.length >= 2) {
    return porLinha.map(normalizarItemProva).filter(Boolean)
  }

  // Fallback: vários ✓ no mesmo parágrafo
  const porCheck = text
    .split(/✓/)
    .map((p) => p.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith('<'))

  if (porCheck.length >= 2) {
    return porCheck.map(normalizarItemProva).filter(Boolean)
  }

  // Último recurso: uma linha só ainda vira item único (se não for parágrafo enorme)
  if (porLinha.length === 1 && porLinha[0].length < 280) {
    return [normalizarItemProva(porLinha[0])].filter(Boolean)
  }
  return []
}

function normalizarItemProva(item: string): string {
  let s = item.replace(/\s+/g, ' ').trim()
  // Unifica travessões para o formato "Nome — explicação"
  s = s.replace(/\s+[–—\-]\s+/g, ' — ')
  return s
}

/** Linha curta no padrão "Documento — explicação" (não parágrafo narrativo). */
function pareceLinhaProva(linha: string): boolean {
  const s = String(linha || '')
    .replace(/^✓\s*/, '')
    .replace(/^[-*•]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim()
  if (s.length < 8 || s.length > 220) return false
  if (!/\s+[—–\-]\s+/.test(s)) return false
  // Parágrafo narrativo: duas frases (". " + maiúscula). Abreviações (art. 8.213) ok.
  if (/\.\s+[A-ZÁÉÍÓÚÀÃÕÂÊÔ]/.test(s)) return false
  return true
}

/**
 * Se a IA listou provas no fim da III (padrão "Documento — explicação"),
 * remove da síntese e devolve os itens para a seção IV.
 */
export function extrairProvasDoFimDaSintese(texto: string): {
  limpo: string
  provas: string[]
} {
  const raw = String(texto || '')
  if (!raw.trim()) return { limpo: raw, provas: [] }

  const lines = raw.split(/\n/)
  let end = lines.length - 1
  while (end >= 0 && !lines[end].trim()) end -= 1

  const collected: string[] = []
  let i = end
  while (i >= 0) {
    const t = lines[i].trim()
    if (!t) {
      // linha em branco no meio do bloco de provas: interrompe
      if (collected.length) break
      i -= 1
      continue
    }
    if (pareceLinhaProva(t)) {
      collected.unshift(t)
      i -= 1
      continue
    }
    break
  }

  if (collected.length < 2) return { limpo: raw, provas: [] }

  const keep = lines.slice(0, i + 1)
  while (keep.length && !keep[keep.length - 1].trim()) keep.pop()
  return {
    limpo: keep.join('\n').trim(),
    provas: collected.map(normalizarItemProva).filter(Boolean),
  }
}

function mesclarProvas(base: string[], extras: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const p of [...base, ...extras]) {
    const n = normalizarItemProva(p)
    if (!n) continue
    const key = n.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(n)
  }
  return out
}

/** Data de nascimento da criança no quadro sinóptico (dd/mm/aaaa ou ISO). */
function dataNascimentoDoQuadro(quadro: QuadroRow[]): string | null {
  const row = quadro.find((r) =>
    /data\s+de\s+nascimento|nascimento\s+da\s+crian|parto/i.test(r.campo),
  )
  const v = row?.valor?.trim()
  return v || null
}

function parsePedidos(raw: string): string[] {
  const items: string[] = []
  // Ordem: números romanos mais longos primeiro (viii antes de v, etc.)
  const re = /(?:^|\n)\s*((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s+/gi
  const matches: { num: string; bodyStart: number; start: number }[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    matches.push({
      num: match[1].toLowerCase(),
      start: match.index,
      bodyStart: match.index + match[0].length,
    })
  }
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].start : raw.length
    const body = raw.slice(matches[i].bodyStart, end).trim()
    if (body) items.push(`${matches[i].num}. ${body}`)
  }
  return items
}

function recortarObjetoJson(s: string, from: number): string | null {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = from; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) {
        esc = false
        continue
      }
      if (ch === '\\') {
        esc = true
        continue
      }
      if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return s.slice(from, i + 1)
    }
  }
  return null
}

/** Isola o primeiro objeto JSON (com "eventos" se houver) de um bloco misto. */
export function extrairJsonTimeline(raw: string): string | null {
  const cleaned = String(raw || '').replace(/```(?:json)?/gi, '')
  const ev = cleaned.search(/"eventos"\s*:/)
  const from = ev >= 0 ? cleaned.lastIndexOf('{', ev) : cleaned.indexOf('{')
  if (from < 0) return null
  return recortarObjetoJson(cleaned, from)
}

export function removerJsonTimelineDoTexto(s: string): string {
  const json = extrairJsonTimeline(s)
  if (!json) return s
  return s.replace(json, '').replace(/\n{3,}/g, '\n\n').trim()
}

function parseTimeline(raw: string): TimelineData | null {
  const jsonStr = extrairJsonTimeline(raw) || String(raw || '').trim()
  try {
    const json = JSON.parse(jsonStr)
    if (!json || !Array.isArray(json.eventos)) return null
    const estiloRaw = String(json.estilo || 'horizontal').toLowerCase()
    const estilo: TimelineEstilo =
      estiloRaw === 'vertical' || estiloRaw === 'none' ? estiloRaw : 'horizontal'
    return {
      nome: String(json.nome || 'AUTORA'),
      atividade: String(json.atividade || 'Agricultor(a)'),
      local: String(json.local || ''),
      estilo,
      eventos: json.eventos.map((e: TimelineEvento) => {
        const dataRaw = String(e?.data || '').trim()
        const data =
          !dataRaw
            ? '—'
            : !/\d/.test(dataRaw)
              ? dataRaw
              : sanitizarDataPeticao(dataRaw)
        return {
          data,
          titulo: String(e?.titulo || ''),
          detalhe: String(e?.detalhe || ''),
        }
      }),
    }
  } catch {
    return null
  }
}

/** Sugere eventos padrão a partir dos campos do formulário de SM. */
export function sugerirEventosTimeline(
  form: Record<string, string>,
): TimelineEvento[] {
  const evs: TimelineEvento[] = []
  const periodo = (form.periodo_segurado || '').trim()
  if (periodo) {
    evs.push({
      data: 'Infância / juventude',
      titulo: 'Início do labor rural',
      detalhe: periodo,
    })
  }
  if ((form.data_nascimento_crianca || '').trim()) {
    evs.push({
      data: sanitizarDataPeticao(form.data_nascimento_crianca.trim()),
      titulo: 'Nascimento do(a) filho(a)',
      detalhe: form.nome_crianca ? `Criança: ${form.nome_crianca}` : '',
    })
  }
  if ((form.data_requerimento || '').trim()) {
    evs.push({
      data: sanitizarDataPeticao(form.data_requerimento.trim()),
      titulo: 'Requerimento administrativo',
      detalhe: form.nb ? `NB ${form.nb}` : 'Pedido de salário-maternidade',
    })
  }
  if ((form.data_indeferimento || '').trim()) {
    evs.push({
      data: sanitizarDataPeticao(form.data_indeferimento.trim()),
      titulo: 'Indeferimento pelo INSS',
      detalhe: (form.motivo_inss || '').trim().slice(0, 80),
    })
  }
  evs.push({
    data: new Date().toLocaleDateString('pt-BR'),
    titulo: 'Ajuizamento da ação',
    detalhe: 'Petição inicial — JEF',
  })
  return evs.length
    ? evs
    : [
        { data: '—', titulo: 'Evento 1', detalhe: '' },
        { data: '—', titulo: 'Evento 2', detalhe: '' },
      ]
}

export function montarTimelineDataPadrao(
  form: Record<string, string>,
  estilo: TimelineEstilo = 'horizontal',
): TimelineData {
  const cidade = (form.cidade || '').trim()
  const uf = (form.estado || form.uf || '').trim()
  let local = [cidade, uf].filter(Boolean).join('/')
  if (!local && (form.endereco || '').trim()) {
    // Extrai "Cidade/UF" do final do endereço formatado, se houver
    const m = form.endereco.match(/([A-Za-zÀ-ú\s]+)\s*\/\s*([A-Z]{2})\s*$/)
    if (m) local = `${m[1].trim()}/${m[2]}`
  }
  const sexo =
    form.sexo_parte_autora || form.sexo_autor || form.sexo || ''
  const atividadeRaw =
    form.atividade || form.ocupacao || form.profession || form.profissao || ''
  return {
    nome: (form.nome || 'AUTORA').trim() || 'AUTORA',
    atividade: flexionarAtividadeTimeline(atividadeRaw, sexo),
    local,
    estilo,
    eventos: sugerirEventosTimeline(form),
  }
}

/** Substitui (ou anexa) o bloco <<<TIMELINE>>> no texto gerado pela IA. */
export function injetarTimelineNoTexto(text: string, data: TimelineData): string {
  const base = canonicalizarMarcadoresSm(text)
  const json = JSON.stringify(
    {
      nome: data.nome,
      atividade: data.atividade,
      local: data.local,
      estilo: data.estilo || 'horizontal',
      eventos: data.eventos,
    },
    null,
    2,
  )
  const blocoTl = `<<<TIMELINE>>>\n${json}\n<<<END_TIMELINE>>>`
  if (/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/.test(base)) {
    return base.replace(/<<<TIMELINE>>>[\s\S]*?<<<END_TIMELINE>>>/, blocoTl)
  }
  if (base.includes('<<<III_SINTESE_DEPOIS>>>')) {
    return base.replace('<<<III_SINTESE_DEPOIS>>>', `${blocoTl}\n\n<<<III_SINTESE_DEPOIS>>>`)
  }
  return `${base.trim()}\n\n${blocoTl}\n`
}

function normalizarEspacos(s: string): string {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim()
}

function parasHtml(raw: string, extraClass = ''): string {
  const cls = extraClass ? `sm-para ${extraClass}` : 'sm-para'
  return limparMarkdownResidual(stripMarcadoresSm(raw))
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const limpo = normalizarEspacos(limparMarkdownResidual(p))
      const comDatas = limpo
        .replace(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/g, (piece) =>
          sanitizarDataPeticao(piece),
        )
        .replace(/(\d{4})-(\d{2})-(\d{2})/g, (piece) => sanitizarDataPeticao(piece))
      const inner = escapar(comDatas).replace(/\n/g, '<br/>')
      return `<p class="${cls}" data-pdf-block="1" style="word-wrap:break-word;overflow-wrap:break-word;max-width:100%;white-space:normal;">${inner}</p>`
    })
    .join('')
}

const TL_LINE_H = 14
const TL_BAND_LINES = 4 // data + título(1–2) + descrição
const TL_BAND_H = TL_LINE_H * TL_BAND_LINES
const TL_GAP_LINE = 18 // espaço entre eixo e bloco de rótulos

/** Trunca texto da timeline com reticências. */
function truncarLabelTimeline(s: string, max = 60): string {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

/** Quebra título em até 2 linhas (aprox. por caracteres / largura do bloco). */
function linhasSvgRotulo(texto: string, maxCharsLinha: number): string[] {
  const t = truncarLabelTimeline(texto, maxCharsLinha * 2)
  if (t.length <= maxCharsLinha) return [t]
  const mid = Math.min(maxCharsLinha, t.length)
  let breakAt = t.lastIndexOf(' ', mid)
  if (breakAt < maxCharsLinha * 0.35) breakAt = mid
  const l1 = t.slice(0, breakAt).trim()
  const l2 = truncarLabelTimeline(t.slice(breakAt).trim(), maxCharsLinha)
  return l2 ? [l1, l2] : [l1]
}

/**
 * Layout fixo dos rótulos: y incremental a partir do topo do bloco.
 * Ímpares (1-based) acima; pares abaixo. Sem centralização vertical.
 */
export function layoutTimelineLabels(
  n: number,
  w = 720,
): {
  w: number
  h: number
  padX: number
  lineY: number
  usable: number
  blocoW: number
  step: number
  maxChars: number
  labels: Omit<TimelineLabelLayout, 'dataY' | 'titleYs' | 'detailY' | 'blocoTop' | 'blocoBottom'>[]
} {
  const padX = n >= 6 ? 48 : n >= 5 ? 60 : 80
  const headerH = 34
  const footerPad = 16
  // 3 linhas acima + eixo + 3 linhas abaixo (+ folga p/ 4ª linha do título)
  const h = headerH + TL_BAND_H + TL_GAP_LINE + 28 + TL_GAP_LINE + TL_BAND_H + footerPad
  const lineY = headerH + TL_BAND_H + TL_GAP_LINE + 14
  const usable = w - padX * 2
  const blocoW = n > 0 ? Math.max(48, usable / n - 12) : usable
  const step = n > 1 ? usable / (n - 1) : 0
  const maxChars = Math.max(10, Math.floor(blocoW / 6.5))

  const labels = Array.from({ length: Math.max(n, 1) }, (_, i) => {
    const x = padX + i * step
    const above = i % 2 === 0 // marco 1,3,5… acima
    return { i, x, above, blocoW }
  })

  return { w, h, padX, lineY, usable, blocoW, step, maxChars, labels }
}

/**
 * Calcula Y absolutos de cada linha do rótulo (empilhados, line-height fixo).
 * titleLines: 1 ou 2; hasDetail: se há descrição.
 */
export function computarYsMarco(opts: {
  lineY: number
  above: boolean
  titleLines: number
  hasDetail: boolean
}): Pick<TimelineLabelLayout, 'dataY' | 'titleYs' | 'detailY' | 'blocoTop' | 'blocoBottom'> {
  const nTitle = Math.min(2, Math.max(1, opts.titleLines))
  const lineCount = 1 + nTitle + (opts.hasDetail ? 1 : 0)
  const blockH = lineCount * TL_LINE_H

  let y0: number
  if (opts.above) {
    y0 = opts.lineY - TL_GAP_LINE - blockH + TL_LINE_H
  } else {
    y0 = opts.lineY + TL_GAP_LINE + TL_LINE_H
  }

  const dataY = y0
  const titleYs: number[] = []
  for (let t = 0; t < nTitle; t++) {
    titleYs.push(y0 + (1 + t) * TL_LINE_H)
  }
  const detailY = opts.hasDetail ? y0 + (1 + nTitle) * TL_LINE_H : null
  return {
    dataY,
    titleYs,
    detailY,
    blocoTop: y0 - TL_LINE_H + 2,
    blocoBottom: (detailY ?? titleYs[titleYs.length - 1] ?? dataY) + 2,
  }
}

/** Valida que rótulos do mesmo lado não se sobrepõem (y e x). */
export function timelineLabelsSemOverlap(
  layouts: TimelineLabelLayout[],
): { ok: boolean; motivo?: string } {
  for (const a of layouts) {
    for (const y of [a.dataY, ...a.titleYs, a.detailY].filter((v): v is number => v != null)) {
      // y deve ser múltiplo aproximado da progressão (tolerância 0.01)
      if (!Number.isFinite(y)) return { ok: false, motivo: `y inválido no marco ${a.i + 1}` }
    }
    // linhas internas com dy == TL_LINE_H
    const ys = [a.dataY, ...a.titleYs, ...(a.detailY != null ? [a.detailY] : [])]
    for (let k = 1; k < ys.length; k++) {
      if (Math.abs(ys[k] - ys[k - 1] - TL_LINE_H) > 0.01) {
        return {
          ok: false,
          motivo: `marco ${a.i + 1}: dy != ${TL_LINE_H}px entre linhas`,
        }
      }
    }
  }

  for (let i = 0; i < layouts.length; i++) {
    for (let j = i + 1; j < layouts.length; j++) {
      const a = layouts[i]
      const b = layouts[j]
      if (a.above !== b.above) continue
      const ax0 = a.x - a.blocoW / 2
      const ax1 = a.x + a.blocoW / 2
      const bx0 = b.x - b.blocoW / 2
      const bx1 = b.x + b.blocoW / 2
      const overlapX = ax0 < bx1 && bx0 < ax1
      const overlapY = a.blocoTop < b.blocoBottom && b.blocoTop < a.blocoBottom
      if (overlapX && overlapY) {
        return {
          ok: false,
          motivo: `overlap marcos ${a.i + 1} e ${b.i + 1} no mesmo lado`,
        }
      }
    }
  }
  return { ok: true }
}

/** Monta layouts completos para N eventos (teste / render). */
export function montarLayoutsTimeline(
  eventos: TimelineEvento[],
  w = 720,
): { meta: ReturnType<typeof layoutTimelineLabels>; layouts: TimelineLabelLayout[] } {
  const n = Math.max(eventos.length, 1)
  const meta = layoutTimelineLabels(n, w)
  const layouts: TimelineLabelLayout[] = meta.labels.map((lab, i) => {
    const ev = eventos[i] || { data: '—', titulo: '—', detalhe: '' }
    const tituloLinhas = linhasSvgRotulo(ev.titulo || '', meta.maxChars)
    const hasDetail = Boolean((ev.detalhe || '').trim())
    const ys = computarYsMarco({
      lineY: meta.lineY,
      above: lab.above,
      titleLines: tituloLinhas.length,
      hasDetail,
    })
    return { ...lab, ...ys }
  })
  return { meta, layouts }
}

/** SVG da linha do tempo horizontal — pontos numerados (modelo Custódio). */
export function renderTimelineSvg(data: TimelineData): string {
  const w = 720
  const events = data.eventos.length
    ? data.eventos
    : [{ data: '—', titulo: 'Sem eventos', detalhe: '' }]
  const { meta, layouts } = montarLayoutsTimeline(events, w)
  const { h, padX, lineY, maxChars } = meta
  const n = events.length
  const muitos = n >= 6

  const title = `LINHA DO TEMPO — ${data.nome.toUpperCase()} | ${data.atividade}${data.local ? ` • ${data.local}` : ''}`
  const dataSize = muitos ? 8 : 9
  const labelSize = muitos ? 9 : 10
  const detailSize = muitos ? 7.5 : 8.5
  const titleSize = muitos ? 9 : 10

  let nodes = ''
  events.forEach((ev, i) => {
    const lay = layouts[i]
    const x = lay.x
    const cy = lineY
    const isFirst = i === 0
    const isLast = i === n - 1 && n > 1
    const labelAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
    const labelX = isFirst ? x - 4 : isLast ? x + 4 : x

    const tituloLinhas = linhasSvgRotulo(ev.titulo || '', maxChars)
    const detalheTxt = ev.detalhe
      ? truncarLabelTimeline(ev.detalhe, Math.max(18, Math.floor(maxChars * 1.4)))
      : ''

    const tituloTspans = tituloLinhas
      .map((ln, li) => {
        const y = lay.titleYs[li] ?? lay.titleYs[0]
        return `<tspan x="${labelX}" y="${y}">${escapar(ln)}</tspan>`
      })
      .join('')

    nodes += `
      <circle cx="${x}" cy="${cy}" r="${muitos ? 12 : 14}" fill="#0A2540" stroke="#D4AF37" stroke-width="2"/>
      <text x="${x}" y="${cy + 4}" text-anchor="middle" fill="#fff" font-size="${muitos ? 10 : 11}" font-family="Arial,sans-serif" font-weight="700">${i + 1}</text>
      <text x="${labelX}" y="${lay.dataY}" text-anchor="${labelAnchor}" fill="#555" font-size="${dataSize}" font-family="Arial,sans-serif">${escapar(truncarLabelTimeline(ev.data, 28))}</text>
      <text text-anchor="${labelAnchor}" fill="#0A2540" font-size="${labelSize}" font-family="Arial,sans-serif" font-weight="700">${tituloTspans}</text>
      ${
        detalheTxt && lay.detailY != null
          ? `<text x="${labelX}" y="${lay.detailY}" text-anchor="${labelAnchor}" fill="#666" font-size="${detailSize}" font-family="Arial,sans-serif">${escapar(detalheTxt)}</text>`
          : ''
      }
    `
  })

  return `
    <div class="sm-timeline keep-together" data-pdf-block="1" data-pdf-keep="1" style="page-break-inside:avoid;break-inside:avoid;overflow:visible;overflow-x:visible;width:100%;box-sizing:border-box;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" overflow="visible" style="overflow:visible;" role="img" aria-label="${escapar(title)}">
        <rect x="0" y="0" width="${w}" height="${h}" rx="12" ry="12" fill="#EEF1F5" stroke="#D0D7E2"/>
        <text x="16" y="24" fill="#0A2540" font-size="${titleSize + 2}" font-family="Arial,sans-serif" font-weight="700">${escapar(truncarLabelTimeline(title, 90))}</text>
        <line x1="${padX}" y1="${lineY}" x2="${w - padX}" y2="${lineY}" stroke="#0A2540" stroke-width="2.5"/>
        ${nodes}
      </svg>
    </div>
  `
}

/** Lista cronológica vertical (mais simples de renderizar no PDF). */
export function renderTimelineVertical(data: TimelineData): string {
  const title = `LINHA DO TEMPO — ${data.nome.toUpperCase()} | ${data.atividade}${data.local ? ` • ${data.local}` : ''}`
  const items = (data.eventos.length ? data.eventos : [{ data: '—', titulo: 'Sem eventos', detalhe: '' }])
    .map(
      (ev, i) => `
      <tr>
        <td class="sm-tl-num">${i + 1}</td>
        <td class="sm-tl-data">${escapar(ev.data)}</td>
        <td class="sm-tl-body">
          <div class="sm-tl-titulo">${escapar(ev.titulo)}</div>
          ${ev.detalhe ? `<div class="sm-tl-detalhe">${escapar(ev.detalhe)}</div>` : ''}
        </td>
      </tr>`,
    )
    .join('')

  return `
    <div class="sm-timeline sm-timeline-vertical keep-together" data-pdf-block="1" data-pdf-keep="1" style="page-break-inside:avoid;break-inside:avoid;">
      <div class="sm-tl-title">${escapar(title)}</div>
      <table class="sm-tl-table" cellpadding="0" cellspacing="0">
        <tbody>${items}</tbody>
      </table>
    </div>
  `
}

/** Escolhe o HTML da timeline conforme o estilo configurado. */
export function renderTimelineHtml(data: TimelineData | null): string {
  if (!data) return ''
  const estilo = data.estilo || 'horizontal'
  if (estilo === 'none') return ''
  if (!data.eventos?.length) return ''
  if (estilo === 'vertical') return renderTimelineVertical(data)
  return renderTimelineSvg(data)
}

function cabecalhoSm(adv: DadosAdvogadoPeticao): string {
  const nome = String(adv.office_name || adv.name || 'Advocacia')
  const oabUf = String(adv.oab_uf || adv.estado || '').toUpperCase()
  const oabNum = String(adv.oab_number || '')
  const email = String(adv.email || '')
  const logoSrc = adv.logo_url ? String(adv.logo_url).trim() : ''
  // Só <img> com data-URL válida. Sem logo / falha → espaço vazio (nunca * / texto / broken-image).
  const logoOk =
    logoSrc.startsWith('data:image/') &&
    logoSrc.length > 64 &&
    !/^data:image\/(?:gif|png|jpeg|jpg|webp|svg\+xml);base64,R0lGODlhAQABAIAAAAAAAP/i.test(
      logoSrc,
    )
  const logo = logoOk
    ? `<img src="${logoSrc}" class="sm-logo" width="60" height="36" alt="" style="height:36px;max-width:110px;width:auto;display:block;border:0;"/>`
    : `<div class="sm-logo-slot" style="width:60px;height:36px;display:block;" aria-hidden="true"></div>`

  const mailLine = email
    ? `<br/><span style="font-size:9px;color:#1d4ed8;line-height:1.4;">${escapar(email)}</span>`
    : ''
  return `
    <div class="sm-header">
      <table class="sm-header-table" cellpadding="0" cellspacing="0" width="100%" border="0" style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:130px;" />
          <col style="width:auto;" />
        </colgroup>
        <tr>
          <td width="130" valign="middle" align="left" style="width:130px;vertical-align:middle;text-align:left;padding:0;overflow:visible;">${logo}</td>
          <td valign="middle" align="right" style="vertical-align:middle;text-align:right;padding:0 0 0 10px;overflow:visible;">
            <p align="right" style="margin:0;padding:0;text-align:right;font-family:'Times New Roman',Times,serif;">
              <span style="font-weight:bold;font-size:11.5px;text-transform:uppercase;line-height:1.35;color:#0A2540;">${escapar(nome)}</span><br/>
              <span style="font-size:9px;color:#444;line-height:1.4;">OAB/${escapar(oabUf)} n° ${escapar(oabNum)}</span>${mailLine}
            </p>
          </td>
        </tr>
      </table>
      <div class="sm-header-line"></div>
    </div>
  `
}

function metaBoxHtml(
  tipoAcao: string,
  juizoDigital: boolean,
  p: Prioridades,
): string {
  const chk = (on: boolean) => (on ? '(X)' : '( )')
  const tipo =
    (tipoAcao || '').trim() || 'SALÁRIO MATERNIDADE - SEGURADO ESPECIAL'
  const digital =
    juizoDigital !== false
      ? '<div class="sm-meta-digital">JUÍZO 100% DIGITAL</div>'
      : ''
  // Tabela 2 colunas (vazio | caixa): html2canvas/jsPDF entendem melhor que
  // text-align:right + inline-block / float / position.
  return `
    <table class="sm-meta-row" cellpadding="0" cellspacing="0">
      <tr>
        <td class="sm-meta-spacer">&nbsp;</td>
        <td class="sm-meta-cell">
          <table class="sm-meta-box" cellpadding="0" cellspacing="0">
            <tr><td class="sm-meta-inner">
              <div class="sm-meta-tipo">${escapar(tipo)}</div>
              ${digital}
              <div class="sm-meta-prio">
                <div class="sm-meta-prio-title">Prioridade Legal na tramitação processual:</div>
                <div class="sm-meta-prio-item">${chk(p.idoso)} Idoso(a) maior de 60 anos – Lei 10.741/2003;</div>
                <div class="sm-meta-prio-item">${chk(p.deficiente)} Deficiente – Lei 12.008/2009 – Laudo em anexo;</div>
                <div class="sm-meta-prio-item">${chk(p.menor)} Menor nos termos do ECA – Lei 8.069/1990;</div>
              </div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

function quadroHtml(rows: QuadroRow[]): string {
  const body = rows
    .map(
      (r, i) => `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}" data-pdf-block="1">
        <td class="campo">${escapar(r.campo)}</td>
        <td class="valor">${escapar(r.valor)}</td>
      </tr>`,
    )
    .join('')
  return `
    <div class="sm-table-wrap keep-together">
      <div class="sm-table-caption" data-pdf-block="1" data-pdf-keep-with-next="1">RESUMO DAS PRINCIPAIS INFORMAÇÕES DO PROCESSO</div>
      <table class="sm-quadro" cellpadding="0" cellspacing="0" width="100%" border="1">
        <tbody>${body}</tbody>
      </table>
    </div>
  `
}

function provasHtml(items: string[]): string {
  return `
    <div class="sm-provas keep-together">
      <table class="sm-provas-table" cellpadding="0" cellspacing="0" width="100%">
        ${items
          .map(
            (it, i) => `
          <tr class="${i % 2 === 0 ? 'even' : 'odd'}" data-pdf-block="1">
            <td class="sm-check">✓</td>
            <td class="sm-prova-txt">${escapar(it)}</td>
          </tr>`,
          )
          .join('')}
      </table>
    </div>
  `
}

function pedidosHtml(items: string[], comIntro = true): string {
  if (!items.length) return ''
  // Sem data-pdf-keep / avoid no container (seção VI é grande demais).
  // Só orphans/widows nos itens — nunca page-break-inside:avoid no bloco.
  const rows = items
    .map((it) => {
      const m = it.match(/^((?:viii|vii|vi|iv|ix|iii|ii|v|i|x)+)\.\s*([\s\S]*)$/i)
      const num = m ? m[1].toLowerCase() : ''
      const body = m ? m[2] : it
      return `
        <table class="sm-pedido-item" data-pdf-block="1" cellpadding="0" cellspacing="0" width="100%" border="0"
          style="width:100%;border-collapse:collapse;margin:0 0 8px;height:auto;max-height:none;overflow:visible;">
          <tr>
            <td style="font-size:12px;line-height:1.6;text-align:justify;padding:0;vertical-align:top;text-transform:none;orphans:2;widows:2;overflow:visible;height:auto;max-height:none;">
              <span class="sm-rom">${escapar(num)}.</span> ${escapar(limparMarkdownResidual(body))}
            </td>
          </tr>
        </table>`
    })
    .join('')
  const introHtml = comIntro
    ? `<p class="sm-para sm-pedidos-intro" data-pdf-block="1" data-pdf-keep-with-next="1">Diante do exposto, requer:</p>`
    : ''
  return `
    <div class="sm-pedidos" style="height:auto;max-height:none;overflow:visible;margin:0;padding:0;">
      ${introHtml}
      ${rows}
    </div>
  `
}

function notaDocumentoGeradoHtml(): string {
  const dataTxt = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `
    <div class="sm-doc-fecho-wrap" style="margin-top:6pt;padding-top:4pt;min-height:0;">
      <div class="sm-doc-gerado">Documento gerado em ${escapar(dataTxt)} pela plataforma Marple</div>
    </div>
  `
}

function planilhaPadraoRows(dataReferencia?: string | null): QuadroRow[] {
  const { mensalFmt, totalFmt } = valorCausaSalarioMaternidade(dataReferencia)
  return [
    { campo: '1º Mês de benefício', valor: mensalFmt },
    { campo: '2º Mês de benefício', valor: mensalFmt },
    { campo: '3º Mês de benefício', valor: mensalFmt },
    { campo: '4º Mês de benefício', valor: mensalFmt },
    { campo: 'TOTAL', valor: totalFmt },
  ]
}

/** Reescreve valores da planilha com o SM vigente na data do parto. */
function normalizarPlanilhaPorParto(
  raw: string,
  dataParto: string | null,
): { rows: QuadroRow[]; nota: string } {
  const vc = valorCausaSalarioMaternidade(dataParto)
  const parsed = parseQuadro(raw)
  const rows = (parsed.length ? parsed : planilhaPadraoRows(dataParto)).map((r) => {
    if (/^total$/i.test(r.campo)) return { ...r, valor: vc.totalFmt }
    if (/mês|mes/i.test(r.campo)) return { ...r, valor: vc.mensalFmt }
    return r
  })
  const notaMatch = raw.match(/nota:\s*(.+)/i)
  const nota = vc.nota || notaMatch?.[1]?.trim() || vc.nota
  return { rows, nota }
}

function planilhaHtml(raw: string, dataParto?: string | null): string {
  const { rows, nota } = normalizarPlanilhaPorParto(raw || '', dataParto ?? null)
  const body = rows
    .map((r, i) => {
      const isTotal = /^total$/i.test(r.campo)
      const cls = isTotal ? 'total' : i % 2 === 0 ? 'even' : 'odd'
      return `<tr class="${cls}"><td>${escapar(r.campo)}</td><td class="num" align="right">${escapar(r.valor)}</td></tr>`
    })
    .join('')
  return `
    <div class="sm-anexo" style="margin-top:8pt;margin-bottom:0;padding-top:4pt;padding-bottom:0;border-top:0.5pt solid #ccc;page-break-before:auto;break-before:auto;page-break-inside:avoid;break-inside:avoid;height:auto;min-height:0;overflow:visible;">
      <div class="sm-anexo-title">ANEXO – PLANILHA DE CÁLCULO</div>
      <div class="sm-table-wrap" style="margin:4px 0 0;page-break-inside:avoid;break-inside:avoid;">
        <div class="sm-table-caption">PLANILHA DE CÁLCULO</div>
        <table class="sm-planilha" cellpadding="0" cellspacing="0" width="100%" border="1">
          <colgroup>
            <col style="width:65%;" />
            <col style="width:35%;" />
          </colgroup>
          <tbody>${body}</tbody>
        </table>
        <p class="sm-nota">${escapar(nota)}</p>
      </div>
    </div>
  `
}

function assinaturasHtml(adv: DadosAdvogadoPeticao, fechamentoRaw: string): string {
  const localData = formatarLocalData(adv)

  const cardHtml = (nome: string, oab: string) => `
    <td class="sm-sign-card">
      <div class="sm-sign-line"></div>
      <div class="sm-sign-name">${escapar(nome)}</div>
      <div class="sm-sign-oab">${escapar(oab)}</div>
    </td>`

  // Prioriza dados do lawyer logado (Supabase) — evita "ADVOGADO / OAB/MA nº" vazio do texto da IA.
  const nomeAdv = String(adv.name || '').trim()
  const oabUf = String(adv.oab_uf || adv.estado || '').trim().toUpperCase()
  const oabNum = String(adv.oab_number || '').trim()

  let cards = ''
  let nCards = 1
  if (nomeAdv || oabNum) {
    const oabLabel = oabUf
      ? `OAB/${oabUf}${oabNum ? ` nº ${oabNum}` : ''}`
      : oabNum
        ? `OAB nº ${oabNum}`
        : 'OAB'
    cards = cardHtml(nomeAdv || 'Advogado(a)', oabLabel)
  } else {
    const oabLines = fechamentoRaw.match(
      /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm,
    )
    if (oabLines && oabLines.length) {
      nCards = Math.min(2, oabLines.length)
      cards = oabLines
        .slice(0, 2)
        .map((block) => {
          const [nome, oab] = block.split('\n')
          return cardHtml(nome.trim(), oab.trim())
        })
        .join('')
    } else {
      cards = cardHtml('Advogado(a)', 'OAB')
    }
  }

  let body = fechamentoRaw
    .replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm, '')
    .replace(/^[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+.*/gim, '')
    .trim()

  return `
    <div class="sm-fechamento">
      ${parasHtml(body)}
      <p class="sm-local-data">${escapar(localData)}.</p>
      <table class="sm-sign-row" cellpadding="0" cellspacing="0" width="100%">
        <tr>${cards.replace(/class="sm-sign-card"/g, `class="sm-sign-card"${nCards === 1 ? ' style="width:100%;"' : ''}`)}</tr>
      </table>
    </div>
  `
}

/** Texto do rodapé para desenho nativo no jsPDF (não vai no HTML). */
export function textoRodapeSm(adv: DadosAdvogadoPeticao): string {
  const nome = String(adv.office_name || adv.name || 'Advocacia').trim()
  const { localFormatado } = resolverLocalAdvogado(adv)
  const left = nome.toUpperCase()
  return localFormatado ? `${left} | ${localFormatado}` : left
}

function sectionBar(title: string): string {
  return `<div class="sm-section-bar keep-together" data-pdf-block="1" data-pdf-keep-with-next="1">${escapar(title)}</div>`
}

function subheadSimples(title: string): string {
  // Tipografia bold apenas — sem barra lateral / fundo / border-left
  // (diferente de sectionBar azul I–VI).
  return `<div class="sm-subhead keep-together" data-pdf-block="1" data-pdf-keep-with-next="1" style="font-weight:bold;text-align:left;text-indent:0;text-transform:uppercase;margin:14px 0 6px;">${escapar(title)}</div>`
}

/**
 * Divide a seção I em TODOS os subtítulos "DA …:" (gratuidade, não incidência, etc.).
 * Usado pelo HTML/PDF e pelo DOCX — negrito, esquerda, sem recuo.
 */
export function parsePreliminaresBlocos(raw: string): PreliminarBloco[] {
  const text = limparMarkdownResidual(String(raw || '').trim())
  if (!text) return []

  const re = /(?:^|\n)\s*(DA\s+[A-ZÀ-ŸÁÉÍÓÚÂÊÔÃÕÇ][^:\n]{2,120}:)\s*/gi
  const matches: { title: string; start: number; bodyStart: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    matches.push({
      title: m[1].trim(),
      start: m.index,
      bodyStart: m.index + m[0].length,
    })
  }

  const out: PreliminarBloco[] = []

  if (!matches.length) {
    const first = text.match(/^(DA\s+[^:\n]+:)\s*/i)
    if (first) {
      out.push({
        titulo: first[1].trim(),
        corpo: text.slice(first[0].length).trim(),
      })
      return out
    }
    return [{ titulo: '', corpo: text }]
  }

  const before = text.slice(0, matches[0].start).trim()
  if (before) out.push({ titulo: '', corpo: before })

  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length
    out.push({
      titulo: matches[i].title,
      corpo: text.slice(matches[i].bodyStart, end).trim(),
    })
  }
  return out
}

/**
 * Renderiza TODOS os subtítulos "DA …:" da seção I (negrito, esquerda, sem faixa azul).
 */
function renderPreliminaresHtml(raw: string): string {
  const blocs = parsePreliminaresBlocos(raw)
  if (!blocs.length) return ''
  let html = ''
  for (const b of blocs) {
    if (b.titulo) html += subheadSimples(b.titulo)
    if (b.corpo) html += parasHtml(b.corpo)
  }
  return html
}

function extrairAssinaturasSm(
  adv: DadosAdvogadoPeticao,
  fechamentoRaw: string,
): { nome: string; oab: string }[] {
  const nomeAdv = String(adv.name || '').trim()
  const oabUf = String(adv.oab_uf || adv.estado || '').trim().toUpperCase()
  const oabNum = String(adv.oab_number || '').trim()

  if (nomeAdv || oabNum) {
    const oabLabel = oabUf
      ? `OAB/${oabUf}${oabNum ? ` nº ${oabNum}` : ''}`
      : oabNum
        ? `OAB nº ${oabNum}`
        : 'OAB'
    return [{ nome: nomeAdv || 'Advogado(a)', oab: oabLabel }]
  }

  const oabLines = fechamentoRaw.match(
    /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm,
  )
  if (oabLines?.length) {
    return oabLines.slice(0, 2).map((block) => {
      const [nome, oab] = block.split('\n')
      return { nome: nome.trim(), oab: (oab || '').trim() }
    })
  }
  return [{ nome: 'Advogado(a)', oab: 'OAB' }]
}

/**
 * Extrai o conteúdo estruturado SM (mesma fonte do HTML/PDF).
 * Retorna null se o texto não for petição SM com marcadores.
 */
export function extrairConteudoSmRural(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  sexoParteAutora?: string | null
}): ConteudoSmRural | null {
  const canonical = canonicalizarMarcadoresSm(
    corrigirLocalNoTexto(opts.text, opts.adv),
  )
  if (!isSmRuralStructured(canonical)) return null

  const text = canonical.replace(
    /(<<<[A-Z0-9_]+>>>)([\s\S]*?)(<<<END_[A-Z0-9_]+>>>)/g,
    (_m, open: string, body: string, close: string) =>
      `${open}${limparMarkdownResidual(body)}${close}`,
  )

  const meta = parseMeta(bloco(text, '<<<META>>>', '<<<END_META>>>'))
  const endereco = bloco(text, '<<<ENDERECO>>>', '<<<END_ENDERECO>>>')
  const qualificacao = bloco(text, '<<<QUALIFICACAO>>>', '<<<END_QUALIFICACAO>>>')
  let titulo = bloco(text, '<<<TITULO>>>', '<<<SUBTITULO>>>')
  let subtitulo = bloco(text, '<<<SUBTITULO>>>', '<<<END_TITULO>>>')
  if (!titulo) titulo = bloco(text, '<<<TITULO>>>', '<<<END_TITULO>>>')
  const emFace = bloco(text, '<<<EM_FACE>>>', '<<<END_EM_FACE>>>')
  const preliminaresRaw = bloco(text, '<<<I_PRELIMINARES>>>', '<<<END_I>>>')
  const quadro = parseQuadro(bloco(text, '<<<II_QUADRO>>>', '<<<END_II>>>'))
  let sinteseAntes = bloco(text, '<<<III_SINTESE_ANTES>>>', '<<<END_III_ANTES>>>')
  const timelineRaw = bloco(text, '<<<TIMELINE>>>', '<<<END_TIMELINE>>>')
  let timeline = parseTimeline(timelineRaw)
  if (!timeline) timeline = parseTimeline(extrairJsonTimeline(text) || '')
  let sinteseDepois = bloco(text, '<<<III_SINTESE_DEPOIS>>>', '<<<END_III_DEPOIS>>>')
  let provas = parseProvas(bloco(text, '<<<IV_PROVAS>>>', '<<<END_IV>>>'))
  const provasFecho = bloco(text, '<<<IV_FECHO>>>', '<<<END_IV_FECHO>>>')
  const fund = bloco(text, '<<<V_FUNDAMENTACAO>>>', '<<<END_V>>>')
  const pedidos = parsePedidos(bloco(text, '<<<VI_PEDIDOS>>>', '<<<END_VI>>>'))
  const fechamento = bloco(text, '<<<FECHAMENTO>>>', '<<<END_FECHAMENTO>>>')
  const planilhaRaw = bloco(text, '<<<PLANILHA>>>', '<<<END_PLANILHA>>>')

  sinteseAntes = removerJsonTimelineDoTexto(sinteseAntes)
  sinteseDepois = removerJsonTimelineDoTexto(sinteseDepois)

  {
    const movido = extrairProvasDoFimDaSintese(sinteseDepois)
    if (movido.provas.length) {
      sinteseDepois = movido.limpo
      provas = mesclarProvas(provas, movido.provas)
    }
  }
  {
    const movido = extrairProvasDoFimDaSintese(sinteseAntes)
    if (movido.provas.length) {
      sinteseAntes = movido.limpo
      provas = mesclarProvas(provas, movido.provas)
    }
  }

  const dataParto = dataNascimentoDoQuadro(quadro)
  const { localFormatado } = resolverLocalAdvogado(opts.adv)
  const enderecoTexto = normalizarEnderecoJef(
    normalizarEspacos(
      limparMarkdownResidual(
        endereco ||
          `AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ${localFormatado || '[Cidade]/[UF]'}`,
      ),
    ),
    localFormatado,
  )

  const norm = normalizarTituloSubtitulo(titulo, subtitulo, opts.sexoParteAutora)
  titulo = norm.titulo
  subtitulo = norm.subtitulo

  if (timeline) {
    timeline = {
      ...timeline,
      atividade: alinharAtividadeTimeline(
        timeline.atividade,
        opts.sexoParteAutora,
        subtitulo,
      ),
    }
  }

  const temTimeline = Boolean(
    timeline &&
      timeline.estilo !== 'none' &&
      timeline.eventos?.length,
  )
  if (!temTimeline) {
    sinteseAntes = sinteseAntes
      .replace(/\s*A seguir,?\s+a linha do tempo[^\n.]*[.:]?\s*/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const fechamentoExtra = fechamento
    .replace(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç\s.]+\nOAB\/.+$/gm, '')
    .replace(/^[A-Za-zÀ-ÿ ].*\/[A-Z]{2},?\s+\d{1,2}\s+de\s+\w+.*/gim, '')
    .trim()

  return {
    meta,
    enderecoTexto,
    qualificacao: limparRgNaQualificacao(qualificacao || ''),
    titulo: titulo.replace(/\s*SALÁRIO-MATERNIDADE\s*/gi, ' SALÁRIO-MATERNIDADE ').trim(),
    subtitulo,
    emFace: normalizarCitacaoInss(emFace || ''),
    preliminares: parsePreliminaresBlocos(preliminaresRaw),
    quadro,
    sinteseAntes,
    timeline: temTimeline ? timeline : null,
    sinteseDepois,
    provas,
    provasFecho,
    fundamentacao: fund,
    pedidos,
    fechamentoExtra,
    localData: formatarLocalData(opts.adv),
    assinaturas: extrairAssinaturasSm(opts.adv, fechamento),
    planilha: normalizarPlanilhaPorParto(planilhaRaw || '', dataParto),
  }
}

/**
 * Valida seções I–VI + pedidos i–viii antes do PDF.
 * Bloqueia petição truncada / faixas azuis vazias.
 */
export function validarCompletudeSmRural(
  text: string,
): { ok: true } | { ok: false; motivo: string } {
  const t = canonicalizarMarcadoresSm(String(text || ''))
  if (!isSmRuralStructured(t)) {
    return { ok: false, motivo: ERRO_GERACAO_INTERROMPIDA }
  }

  const secoes: [string, string, string][] = [
    ['I', '<<<I_PRELIMINARES>>>', '<<<END_I>>>'],
    ['II', '<<<II_QUADRO>>>', '<<<END_II>>>'],
    ['III', '<<<III_SINTESE_ANTES>>>', '<<<END_III_ANTES>>>'],
    ['IV', '<<<IV_PROVAS>>>', '<<<END_IV>>>'],
    ['V', '<<<V_FUNDAMENTACAO>>>', '<<<END_V>>>'],
    ['VI', '<<<VI_PEDIDOS>>>', '<<<END_VI>>>'],
  ]

  for (const [nome, open, close] of secoes) {
    const body = bloco(t, open, close)
    if (!body || body.length < 20) {
      console.warn(`[SM_RURAL] Seção ${nome} vazia ou truncada (${body.length} chars)`)
      return { ok: false, motivo: ERRO_GERACAO_INTERROMPIDA }
    }
    // Texto sem pontuação final (corte no meio da frase)
    const tail = body.replace(/\s+/g, ' ').trim()
    if (tail.length > 40 && !/[.!?…:;"')\]]$/.test(tail) && !/\|\s*$/.test(tail)) {
      // Tabelas (II) e listas (IV/VI) podem terminar sem ponto
      if (nome !== 'II' && nome !== 'IV' && nome !== 'VI') {
        console.warn(`[SM_RURAL] Seção ${nome} sem pontuação final — possível truncamento`)
        return { ok: false, motivo: ERRO_GERACAO_INTERROMPIDA }
      }
    }
  }

  const pedidos = parsePedidos(bloco(t, '<<<VI_PEDIDOS>>>', '<<<END_VI>>>'))
  const romanos = new Set(
    pedidos.map((p) => (p.match(/^(viii|vii|vi|iv|ix|iii|ii|v|i|x)\./i)?.[1] || '').toLowerCase()),
  )
  const exigidos = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii']
  const faltando = exigidos.filter((r) => !romanos.has(r))
  if (faltando.length > 0 || pedidos.length < 8) {
    console.warn(`[SM_RURAL] Pedidos incompletos. Faltando: ${faltando.join(', ') || 'itens'}`)
    return { ok: false, motivo: ERRO_GERACAO_INTERROMPIDA }
  }

  const provas = parseProvas(bloco(t, '<<<IV_PROVAS>>>', '<<<END_IV>>>'))
  if (provas.length < 1) {
    console.warn('[SM_RURAL] Seção IV sem itens de prova estruturados')
    return { ok: false, motivo: ERRO_GERACAO_INTERROMPIDA }
  }

  return { ok: true }
}

export function isSmRuralStructured(text: string): boolean {
  const t = canonicalizarMarcadoresSm(text)
  return (
    t.includes('<<<SM_RURAL_V2>>>') ||
    t.includes('<<<TITULO>>>') ||
    t.includes('<<<I_PRELIMINARES>>>') ||
    t.includes('<<<II_QUADRO>>>') ||
    t.includes('<<<V_FUNDAMENTACAO>>>') ||
    t.includes('<<<VI_PEDIDOS>>>') ||
    t.includes('<<<FECHAMENTO>>>') ||
    t.includes('<<<TIMELINE>>>') ||
    t.includes('<<<QUALIFICACAO>>>')
  )
}

export function cssSmRural(comMargens: boolean): string {
  // Preview: margens no HTML. Export PDF: margens via jsPDF — mas o conteúdo
  // ainda precisa de box-sizing e overflow controlados para não cortar texto.
  const pad = comMargens
    ? 'padding: 3cm 2cm 2cm 3cm;'
    : 'padding: 0; box-sizing: border-box;'
  return `
    .pdf-page.sm-rural {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #fff;
      box-sizing: border-box;
      width: 794px;
      max-width: 794px;
      height: auto;
      min-height: 0;
      max-height: none;
      overflow: visible;
      overflow-x: visible;
      overflow-y: visible;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: normal;
      text-transform: none;
      ${pad}
    }
    .pdf-page.sm-rural,
    .pdf-page.sm-rural p,
    .pdf-page.sm-rural div,
    .pdf-page.sm-rural td,
    .pdf-page.sm-rural span,
    .pdf-page.sm-rural li,
    .sm-para,
    .sm-para-qualif,
    .sm-endereco,
    .sm-main-title,
    .sm-sub-title,
    .sm-section-bar,
    .sm-subhead,
    .sm-meta-inner,
    .sm-meta-tipo,
    .sm-fechamento,
    .sm-pedido-item td,
    .sm-prova-txt,
    .sm-quadro td,
    .sm-planilha td {
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
      white-space: normal;
      box-sizing: border-box;
    }
    .pdf-page.sm-rural p,
    .sm-para,
    .sm-para-qualif,
    .sm-pedidos-intro,
    .sm-pedido-item td {
      orphans: 2;
      widows: 2;
    }
    .sm-sheet {
      position: relative;
      min-height: 0;
      height: auto;
      max-height: none;
      width: 100%;
      box-sizing: border-box;
      page-break-inside: auto;
      overflow: visible;
    }
    .sm-sheet-inner { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-sheet-main { vertical-align: top; padding: 0; width: 100%; }
    .sm-sheet-foot { vertical-align: bottom; padding: 16px 0 0; width: 100%; }
    .sm-body { width: 100%; max-width: 100%; box-sizing: border-box; overflow: visible; height: auto; max-height: none; }
    .sm-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* Evitar page-break-before no fluxo — causa páginas em branco com html2canvas */
    .page-break-before { page-break-before: auto; break-before: auto; }
    .keep-together { page-break-inside: avoid !important; break-inside: avoid !important; }

    /* —— Cabeçalho: TABLE logo | dados (sem flex) —— */
    .sm-header { margin-bottom: 18px; width: 100%; }
    .sm-header-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-header-logo { width: 24%; vertical-align: middle; text-align: left; padding: 0 8px 0 0; }
    .sm-header-info { width: 76%; vertical-align: middle; text-align: right; padding: 0; }
    .sm-logo { height: 36px; max-height: 36px; max-width: 120px; width: auto; display: block; }
    .sm-logo-slot { width: 60px; height: 36px; display: block; }
    .sm-office-name {
      font-weight: bold; font-size: 11.5px; color: #0A2540;
      text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.35;
    }
    .sm-office-sub { font-size: 9px; color: #444; margin-top: 2px; line-height: 1.4; }
    .sm-office-mail { font-size: 9px; color: #1d4ed8; margin-top: 1px; }
    .sm-header-line {
      border: none; border-top: 1.5px solid #0A2540;
      margin-top: 8px; width: 100%; height: 0;
    }
    .sm-page-top-line {
      border: none; border-top: 1px solid #999;
      width: 100%; height: 0; margin: 0 0 14px;
    }

    /* —— Rodapé: no fluxo do documento (sem fixed/absolute) —— */
    .sm-footer { margin-top: 0; page-break-inside: avoid; break-inside: avoid; width: 100%; }
    .sm-footer-line { border: none; border-top: 1px solid #999; width: 100%; height: 0; margin: 0 0 6px; }
    .sm-footer-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .sm-footer-left {
      text-align: left; font-weight: 600; font-size: 9px; color: #555; width: 70%;
    }
    .sm-footer-right {
      text-align: right; white-space: nowrap; font-size: 9px; color: #555; width: 30%;
    }

    .sm-endereco {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      text-align: justify;
      margin: 22px 0 20px;
      line-height: 1.55;
      page-break-after: avoid;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: anywhere;
      word-wrap: break-word;
    }

    /* —— Meta: tabela 2 cols + borda tracejada via border-style (sem float) —— */
    .sm-meta-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin: 0 0 14px; page-break-inside: avoid;
    }
    .sm-meta-spacer { width: 46%; padding: 0; }
    .sm-meta-cell { width: 54%; padding: 0; vertical-align: top; text-align: left; }
    table.sm-meta-box {
      width: 100%; border-collapse: collapse;
      border: 1.5px dashed #0A2540;
      background: #ffffff;
    }
    .sm-meta-inner {
      padding: 10px 12px;
      font-size: 9.5px;
      line-height: 1.5;
      text-align: left;
      vertical-align: top;
      color: #1a1a1a;
      overflow-wrap: anywhere;
      word-wrap: break-word;
      max-width: 100%;
    }
    .sm-meta-tipo {
      font-weight: bold; font-size: 10.5px; color: #0A2540;
      text-transform: uppercase; margin-bottom: 4px; line-height: 1.35;
      overflow-wrap: anywhere; word-wrap: break-word;
    }
    .sm-meta-digital {
      font-weight: bold; font-size: 10.5px; color: #0A2540; margin-bottom: 8px;
    }
    .sm-meta-prio {
      border-top: 1px dashed #999; padding-top: 6px; margin-top: 4px;
    }
    .sm-meta-prio-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5px;
      font-size: 9.5px;
    }
    .sm-meta-prio-item { margin: 2px 0; line-height: 1.4; }

    .sm-main-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; color: #0A2540; margin: 16px 0 4px;
      page-break-after: avoid;
      max-width: 100%;
      width: 100%;
      box-sizing: border-box;
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: normal;
      hyphens: none;
    }
    .sm-sub-title {
      text-align: center; font-size: 12px; font-weight: bold;
      margin: 0 0 14px; page-break-after: avoid;
    }

    .sm-section-bar {
      background: #2d5f8a;
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      padding: 8px 14px;
      margin: 18px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      overflow: visible;
      height: auto;
      max-height: none;
      text-overflow: unset;
      page-break-after: avoid;
      page-break-inside: avoid;
      border-left: none;
      line-height: 1.35;
    }
    .sm-subhead {
      font-weight: bold !important;
      font-size: 11.5px;
      color: #1a1a1a;
      text-align: left !important;
      text-indent: 0 !important;
      text-transform: uppercase;
      margin: 14px 0 6px;
      padding: 0;
      background: none;
      background-color: transparent;
      border: none;
      border-left: none;
      box-shadow: none;
      page-break-after: avoid;
    }

    .sm-para {
      font-size: 12px;
      line-height: 1.65;
      text-align: justify;
      text-indent: 1.25cm;
      margin: 0 0 10px;
      width: 100%;
      box-sizing: border-box;
      word-wrap: break-word;
      overflow-wrap: break-word;
      text-transform: none;
      orphans: 3;
      widows: 3;
      overflow: visible;
      height: auto;
      max-height: none;
    }
    .sm-para-qualif { text-indent: 1.25cm; text-transform: none; font-size: 12px; font-weight: normal; }

    .sm-table-wrap { margin: 10px 0 16px; page-break-inside: avoid; width: 100%; box-sizing: border-box; }
    .sm-table-caption {
      background: #1a3a5c;
      color: #fff;
      font-weight: bold;
      font-size: 10.5px;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: center;
      width: 100%;
      box-sizing: border-box;
    }
    table.sm-quadro, table.sm-planilha {
      width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed;
      border: 1px solid #1a3a5c;
    }
    table.sm-quadro td, table.sm-planilha td {
      padding: 7px 10px; border: 1px solid #c5d0e0; vertical-align: top;
      text-transform: none;
    }
    table.sm-quadro tr.even td, table.sm-planilha tr.even td { background: #f5f5f5; }
    table.sm-quadro tr.odd td, table.sm-planilha tr.odd td { background: #ffffff; }
    table.sm-quadro td.campo { font-weight: bold; width: 42%; color: #1a1a1a; }
    table.sm-quadro td.valor { font-weight: normal; width: 58%; }
    table.sm-planilha td.num { text-align: right; white-space: nowrap; width: 35%; }
    table.sm-planilha tr.total td {
      background: #c8a951 !important;
      font-weight: bold;
      color: #1a1a1a;
    }
    .sm-nota {
      font-size: 9.5px; font-style: italic; color: #555;
      margin-top: 8px; text-align: center;
    }
    .sm-anexo {
      page-break-before: auto;
      break-before: auto;
      overflow: visible;
      height: auto;
      min-height: 0;
    }
    .sm-anexo-title {
      text-align: center; font-weight: bold; font-size: 14px;
      text-transform: uppercase; margin: 4px 0 8px; color: #0A2540;
      background: none; padding: 0;
    }

    .sm-timeline {
      margin: 14px 0 18px;
      width: 100%;
      box-sizing: border-box;
      overflow: visible;
      overflow-x: visible;
      overflow-y: visible;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-column-break-inside: avoid;
    }
    .sm-timeline svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
      max-width: 100%;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .sm-timeline-vertical { background: #EEF1F5; border: 1px solid #D0D7E2; padding: 12px 14px; }
    .sm-tl-title { font-weight: bold; font-size: 11.5px; color: #0A2540; margin-bottom: 10px; text-transform: uppercase; }
    .sm-tl-table { width: 100%; border-collapse: collapse; }
    .sm-tl-table td { padding: 8px 6px; vertical-align: top; border-bottom: 1px solid #d8dee8; }
    .sm-tl-num {
      font-weight: bold; color: #fff; background: #0A2540;
      text-align: center; width: 22px; height: 22px;
      line-height: 22px; font-size: 11px;
    }
    .sm-tl-data { width: 110px; font-size: 10.5px; color: #555; white-space: nowrap; }
    .sm-tl-titulo { font-weight: bold; font-size: 11.5px; color: #0A2540; }
    .sm-tl-detalhe { font-size: 10px; color: #666; margin-top: 2px; }

    .sm-provas { margin: 8px 0; }
    table.sm-provas-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    table.sm-provas-table tr.even td { background: #f5f5f5; }
    table.sm-provas-table tr.odd td { background: #fff; }
    table.sm-provas-table td { padding: 6px 10px; font-size: 12px; vertical-align: top; text-transform: none; }
    table.sm-provas-table td.sm-check {
      color: #15803d; font-weight: bold; width: 22px; text-align: center;
    }
    table.sm-provas-table td.sm-prova-txt { width: auto; }

    .sm-pedidos-list { list-style: none; padding: 0; margin: 8px 0 0; }
    /* Seção VI: NUNCA avoid no container — força página em branco após item i */
    .sm-secao-vi {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      margin-top: 4px !important;
      margin-bottom: 0 !important;
      padding-top: 0 !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      page-break-before: auto !important;
      page-break-after: auto !important;
      break-before: auto !important;
      break-after: auto !important;
    }
    .sm-secao-vi .sm-section-bar {
      /* Só o título curto: evita cortar a barra; NÃO agrupa com todos os pedidos */
      page-break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
      margin-top: 10px;
      margin-bottom: 8px;
    }
    .sm-secao-vi .keep-together {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .sm-pedidos {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      page-break-before: auto !important;
      page-break-after: auto !important;
      break-before: auto !important;
      break-after: auto !important;
    }
    .sm-pedidos-list li,
    table.sm-pedido-item {
      font-size: 12px; line-height: 1.6; text-align: justify;
      margin: 0 0 8px;
      text-transform: none;
      orphans: 2;
      widows: 2;
      overflow: visible;
      height: auto;
      max-height: none;
      page-break-inside: auto !important;
      break-inside: auto !important;
      page-break-before: auto !important;
      page-break-after: auto !important;
    }
    .sm-pedidos-intro {
      margin-bottom: 6px;
      margin-top: 0;
      orphans: 2;
      widows: 2;
      page-break-after: auto;
    }
    .sm-rom { font-weight: bold; margin-right: 4px; }

    .sm-fechamento { margin-top: 12px; margin-bottom: 0; text-transform: none; overflow: visible; }
    .sm-fecho-bloco {
      margin-bottom: 0;
      margin-top: 0;
      overflow: visible;
      height: auto;
      page-break-inside: auto !important;
      break-inside: auto !important;
      page-break-before: auto !important;
      break-before: auto !important;
    }
    .sm-local-data { text-align: center; font-size: 12px; margin: 14px 0 16px; font-weight: 500; text-transform: none; }
    table.sm-sign-row {
      width: 100%; border-collapse: collapse; table-layout: fixed;
      margin-top: 8px; page-break-inside: avoid;
    }
    td.sm-sign-card { text-align: center; vertical-align: top; padding: 0 12px; width: 50%; }
    .sm-sign-line { border-top: 1px solid #222; margin: 0 8px 8px; height: 0; }
    .sm-sign-name { font-weight: bold; font-size: 11.5px; text-transform: uppercase; }
    .sm-sign-oab { font-size: 10px; color: #333; margin-top: 2px; }

    .sm-doc-fecho-wrap {
      margin-top: 10pt;
      padding-top: 8pt;
      min-height: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .sm-doc-gerado {
      text-align: center;
      font-size: 9px;
      color: #888;
      font-style: italic;
      border-top: 0.5pt solid #ddd;
      padding-top: 10pt;
      line-height: 1.4;
    }
  `
}

/**
 * Monta o HTML do modelo Custódio a partir dos marcadores da IA.
 * Tags e JSON cru nunca entram no HTML — só o conteúdo parseado.
 */
export function montarHtmlSmRural(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  comMargens?: boolean
  estilo?: EstiloPeticao
  /** Sexo da parte autora (masculino/feminino) — define subtítulo canônico. */
  sexoParteAutora?: string | null
}): string | null {
  const canonical = canonicalizarMarcadoresSm(
    corrigirLocalNoTexto(opts.text, opts.adv),
  )
  if (!isSmRuralStructured(canonical)) return null

  const text = canonical.replace(
    /(<<<[A-Z0-9_]+>>>)([\s\S]*?)(<<<END_[A-Z0-9_]+>>>)/g,
    (_m, open: string, body: string, close: string) =>
      `${open}${limparMarkdownResidual(body)}${close}`,
  )

  const meta = parseMeta(bloco(text, '<<<META>>>', '<<<END_META>>>'))
  const endereco = bloco(text, '<<<ENDERECO>>>', '<<<END_ENDERECO>>>')
  const qualificacao = bloco(text, '<<<QUALIFICACAO>>>', '<<<END_QUALIFICACAO>>>')
  let titulo = bloco(text, '<<<TITULO>>>', '<<<SUBTITULO>>>')
  let subtitulo = bloco(text, '<<<SUBTITULO>>>', '<<<END_TITULO>>>')
  if (!titulo) titulo = bloco(text, '<<<TITULO>>>', '<<<END_TITULO>>>')
  // Se SUBTITULO ausente e o título já traz o parêntese, normalizarTituloSubtitulo separa.
  const emFace = bloco(text, '<<<EM_FACE>>>', '<<<END_EM_FACE>>>')
  const preliminares = bloco(text, '<<<I_PRELIMINARES>>>', '<<<END_I>>>')
  const quadro = parseQuadro(bloco(text, '<<<II_QUADRO>>>', '<<<END_II>>>'))
  let sinteseAntes = bloco(text, '<<<III_SINTESE_ANTES>>>', '<<<END_III_ANTES>>>')
  const timelineRaw = bloco(text, '<<<TIMELINE>>>', '<<<END_TIMELINE>>>')
  let timeline = parseTimeline(timelineRaw)
  if (!timeline) timeline = parseTimeline(extrairJsonTimeline(text) || '')
  let sinteseDepois = bloco(text, '<<<III_SINTESE_DEPOIS>>>', '<<<END_III_DEPOIS>>>')
  let provas = parseProvas(bloco(text, '<<<IV_PROVAS>>>', '<<<END_IV>>>'))
  const provasFecho = bloco(text, '<<<IV_FECHO>>>', '<<<END_IV_FECHO>>>')
  const fund = bloco(text, '<<<V_FUNDAMENTACAO>>>', '<<<END_V>>>')
  const pedidosAll = parsePedidos(bloco(text, '<<<VI_PEDIDOS>>>', '<<<END_VI>>>'))
  const fechamento = bloco(text, '<<<FECHAMENTO>>>', '<<<END_FECHAMENTO>>>')
  const planilha = bloco(text, '<<<PLANILHA>>>', '<<<END_PLANILHA>>>')

  sinteseAntes = removerJsonTimelineDoTexto(sinteseAntes)
  sinteseDepois = removerJsonTimelineDoTexto(sinteseDepois)

  // Fallback: provas listadas no fim da III → mover para IV (caixas com check)
  {
    const movido = extrairProvasDoFimDaSintese(sinteseDepois)
    if (movido.provas.length) {
      sinteseDepois = movido.limpo
      provas = mesclarProvas(provas, movido.provas)
    }
  }
  // Também varre síntese antes (caso raro)
  {
    const movido = extrairProvasDoFimDaSintese(sinteseAntes)
    if (movido.provas.length) {
      sinteseAntes = movido.limpo
      provas = mesclarProvas(provas, movido.provas)
    }
  }

  const dataParto = dataNascimentoDoQuadro(quadro)

  // Divide pedidos: i–vii no bloco principal; viii+ (honorários) junto das assinaturas
  const pedidosP4 = pedidosAll.filter((p) => !/^viii\./i.test(p.trim()))
  const pedidosP5 = pedidosAll.filter((p) => /^viii\./i.test(p.trim()))

  const preliminaresHtml = renderPreliminaresHtml(preliminares)

  const assinaturas = assinaturasHtml(opts.adv, fechamento)

  const { localFormatado } = resolverLocalAdvogado(opts.adv)
  const enderecoTexto = normalizarEnderecoJef(
    normalizarEspacos(
      limparMarkdownResidual(
        endereco ||
          `AO JUÍZO FEDERAL DO JUIZADO ESPECIAL FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE ${localFormatado || '[Cidade]/[UF]'}`,
      ),
    ),
    localFormatado,
  )

  const qualificacaoLimpa = limparRgNaQualificacao(qualificacao || '')
  const emFaceLimpo = normalizarCitacaoInss(emFace || '')

  let tituloBruto = ''
  {
    const norm = normalizarTituloSubtitulo(titulo, subtitulo, opts.sexoParteAutora)
    tituloBruto = norm.titulo
    subtitulo = norm.subtitulo
  }

  if (timeline) {
    timeline = {
      ...timeline,
      atividade: alinharAtividadeTimeline(
        timeline.atividade,
        opts.sexoParteAutora,
        subtitulo,
      ),
    }
  }
  const timelineHtml = renderTimelineHtml(timeline)
  const temTimeline = Boolean(timelineHtml.trim())
  // Garante quebra antes de MATERNIDADE (evita corte no hífen pelo canvas)
  tituloBruto = tituloBruto.replace(/\s*SALÁRIO-MATERNIDADE\s*/gi, ' SALÁRIO-MATERNIDADE ')
  const tituloHtml = escapar(tituloBruto.trim())
    .replace(/SALÁRIO-MATERNIDADE/gi, 'SALÁRIO-<br/>MATERNIDADE')
    .replace(/SALÁRIO-\s*<br\/>\s*MATERNIDADE/gi, 'SALÁRIO-<br/>MATERNIDADE')

  // Remove menção órfã à timeline quando o usuário optou por não exibi-la
  let sinteseAntesLimpa = sinteseAntes || ''
  let sinteseDepoisLimpa = sinteseDepois || ''
  if (!temTimeline) {
    sinteseAntesLimpa = sinteseAntesLimpa
      .replace(/\s*A seguir,?\s+a linha do tempo[^\n.]*[.:]?\s*/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const corpo = `
    <div data-pdf-block="1">${cabecalhoSm(opts.adv)}</div>
    <div class="sm-endereco" data-pdf-block="1">${escapar(enderecoTexto)}</div>
    <div data-pdf-block="1">${metaBoxHtml(meta.tipoAcao, meta.juizoDigital, meta.prioridades)}</div>
    ${parasHtml(qualificacaoLimpa, 'sm-para-qualif')}
    <div class="sm-main-title" data-pdf-block="1" data-pdf-keep-with-next="1">${tituloHtml}</div>
    <div class="sm-sub-title" data-pdf-block="1">${escapar(subtitulo)}</div>
    ${parasHtml(emFaceLimpo)}
    ${sectionBar('I – PRELIMINARMENTE')}
    ${preliminaresHtml}
    ${sectionBar('II – QUADRO SINÓPTICO')}
    ${quadroHtml(quadro)}
    ${sectionBar('III – SÍNTESE DO CONTEXTO FÁTICO')}
    ${parasHtml(sinteseAntesLimpa)}
    ${temTimeline ? timelineHtml : ''}
    ${parasHtml(sinteseDepoisLimpa)}
    ${sectionBar('IV – DAS PROVAS JUNTADAS AOS AUTOS')}
    ${provasHtml(provas)}
    ${parasHtml(provasFecho)}
    ${sectionBar('V – FUNDAMENTAÇÃO JURÍDICA')}
    ${parasHtml(fund)}
    <div class="sm-secao-vi" style="height:auto;max-height:none;overflow:visible;margin-top:4px;padding-top:0;page-break-inside:auto;break-inside:auto;">
      <div class="sm-section-bar" data-pdf-block="1" data-pdf-keep-with-next="1">${escapar('VI – PEDIDO / REQUERIMENTOS')}</div>
      ${pedidosHtml(pedidosP4.length ? pedidosP4 : pedidosAll, true)}
      ${pedidosP5.length ? pedidosHtml(pedidosP5, false) : ''}
    </div>
    <div class="sm-fecho-bloco keep-together" data-pdf-block="1" data-pdf-keep="1" style="margin-top:0;overflow:visible;height:auto;page-break-inside:avoid;break-inside:avoid;">
      ${assinaturas}
      ${planilhaHtml(planilha, dataParto)}
      ${notaDocumentoGeradoHtml()}
    </div>
  `

  const html = `
    <style>${cssSmRural(opts.comMargens !== false)}</style>
    <div class="pdf-page sm-rural">
      ${corpo}
    </div>
  `
  return stripMarcadoresSm(html)
}
