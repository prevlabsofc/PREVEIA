/**
 * Checklist INSS por tipo de benefício — fonte única usada por /ferramentas
 * e pela ficha do cliente (resumo X/Y + pendências após upload).
 *
 * Regras de matching (documento ↔ item da checklist):
 * 1. Normaliza texto: minúsculas, remove acentos, pontuação e espaços extras.
 * 2. Expande aliases (ex.: "RG" ≡ "identidade" ≡ "carteira de identidade";
 *    "CTPS" ≡ "carteira de trabalho").
 * 3. Um documento casa com um item se:
 *    - form_data.checklist_item bate exatamente com o rótulo do item; ou
 *    - o texto normalizado do doc (title / agent_type / type / file_name)
 *      contém o item (ou um de seus aliases); ou
 *    - qualquer token significativo (≥3 chars) do item aparece no doc,
 *      cobrindo compostos como "RG e CPF" quando só "RG.pdf" foi enviado.
 * 4. Cada item da checklist conta no máximo uma vez (primeiro doc que casar).
 */

export const CHECKLIST_ANEXO_AGENT_TYPE = 'checklist-anexo'

/** Mesma lista estática de /ferramentas — não inventar motor paralelo. */
export const CHECKLIST_INSS: Record<string, string[]> = {
  'Aposentadoria por Idade (Rural)': [
    'RG e CPF',
    'Certidão de nascimento ou casamento',
    'Carteira de trabalho',
    'Declaração do sindicato rural ou colônia de pescadores',
    'ITR em nome próprio ou de familiar',
    'Notas de venda de produtos rurais',
    'Fotos de atividade rural',
    'Certidão eleitoral com endereço rural',
    'Contrato de arrendamento (se houver)',
    'Testemunhas disponíveis',
  ],
  'Salário-Maternidade': [
    'RG e CPF',
    'Certidão de nascimento da criança',
    'Carteira de trabalho',
    'Declaração de sindicato rural (segurada especial)',
    'Registro na colônia de pescadores (pescadora)',
    'Notas de venda de produtos rurais',
    'Certidão eleitoral com endereço rural',
    'ITR em nome próprio ou de familiar',
    'Testemunhas disponíveis',
  ],
  'BPC/LOAS (Idoso)': [
    'RG e CPF',
    'Certidão de nascimento',
    'Comprovante de residência',
    'Declaração de composição familiar',
    'Comprovante de renda familiar',
    'Extratos bancários dos últimos 3 meses',
    'Declaração de que não recebe outro benefício',
  ],
  'BPC/LOAS (Deficiência)': [
    'RG e CPF',
    'Comprovante de residência',
    'Laudo médico atualizado',
    'Relatório de avaliação social',
    'Declaração de composição familiar',
    'Comprovante de renda familiar',
    'Extratos bancários dos últimos 3 meses',
    'Exames médicos complementares',
  ],
  'Aposentadoria por Incapacidade Permanente': [
    'RG e CPF',
    'Carteira de trabalho',
    'Laudos médicos atualizados',
    'Exames complementares',
    'Histórico de tratamentos',
    'Relatório médico detalhado',
    'Atestados de internação (se houver)',
    'CTPS com vínculos empregatícios',
  ],
  'Auxílio por Incapacidade Temporária': [
    'RG e CPF',
    'Carteira de trabalho',
    'Atestado médico (mínimo 15 dias)',
    'Laudos e exames médicos',
    'CTPS com vínculo atual',
    'Comprovante de afastamento',
  ],
  'Pensão por Morte': [
    'RG e CPF do dependente',
    'Certidão de óbito do segurado',
    'Certidão de casamento ou união estável',
    'Certidão de nascimento dos filhos (menores de 21)',
    'Comprovante de dependência econômica',
    'Documentos do falecido (CTPS, CPF, RG)',
  ],
}

export const CARENCIAS_INSS: Record<string, string> = {
  'Aposentadoria por Idade (Rural)':
    '180 meses de atividade rural (15 anos) — STF dispensou carência para segurado especial (ADIs 2110 e 2111)',
  'Aposentadoria por Idade (Urbana)': '180 contribuições mensais (15 anos)',
  'Salário-Maternidade':
    'Dispensada para segurada especial — STF ADIs 2110 e 2111 (28/03/2024)',
  'BPC/LOAS (Idoso)':
    'Não exige carência — apenas 65 anos + renda familiar per capita ≤ 1/4 do salário mínimo',
  'BPC/LOAS (Deficiência)':
    'Não exige carência — apenas deficiência comprovada + renda familiar per capita ≤ 1/4 do salário mínimo',
  'Aposentadoria por Incapacidade Permanente':
    '12 contribuições mensais (dispensada em acidente)',
  'Auxílio por Incapacidade Temporária':
    '12 contribuições mensais (dispensada em acidente)',
  'Pensão por Morte': '18 contribuições (cônjuge) ou sem carência (filhos)',
}

export const TIPOS_BENEFICIO_CHECKLIST = Object.keys(CHECKLIST_INSS)

/** Aliases canônicos: chave normalizada → formas equivalentes. */
const ALIASES: Record<string, string[]> = {
  rg: ['rg', 'identidade', 'carteira de identidade', 'registro geral', 'cnh'],
  cpf: ['cpf', 'cadastro de pessoa fisica'],
  ctps: ['ctps', 'carteira de trabalho', 'carteira profissional'],
  itr: ['itr', 'imposto territorial rural'],
  laudo: ['laudo', 'laudo medico', 'relatorio medico'],
  residencia: ['comprovante de residencia', 'comprovante de endereco', 'conta de luz', 'conta de agua'],
  obito: ['certidao de obito', 'obito'],
  nascimento: ['certidao de nascimento'],
  casamento: ['certidao de casamento', 'uniao estavel'],
  extrato: ['extrato bancario', 'extratos bancarios'],
  sindicato: ['sindicato rural', 'colonia de pescadores', 'declaracao do sindicato'],
}

export function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function expandirAliases(textoNorm: string): Set<string> {
  const out = new Set<string>([textoNorm])
  for (const formas of Object.values(ALIASES)) {
    if (formas.some((f) => textoNorm.includes(f) || f.includes(textoNorm))) {
      for (const f of formas) out.add(f)
    }
  }
  return out
}

function tokensSignificativos(textoNorm: string): string[] {
  return textoNorm.split(' ').filter((t) => t.length >= 3 && !['dos', 'das', 'com', 'para', 'pelo', 'pela', 'nome', 'proprio', 'familiar', 'ultimo', 'ultimos', 'meses', 'minimo', 'dias', 'se', 'houver', 'disponiveis'].includes(t))
}

export type DocChecklist = {
  title?: string | null
  type?: string | null
  agent_type?: string | null
  form_data?: Record<string, unknown> | null
  /** Nome original do arquivo, se houver. */
  file_name?: string | null
  /** true se a imagem foi salva com aviso de baixa qualidade. */
  qualidade_pendente?: boolean | null
}

/** Extrai metadados usados pelo matching da checklist a partir de rows de `documents`. */
export function metaDocs(
  docs: Array<{
    title?: string | null
    type?: string | null
    agent_type?: string | null
    form_data?: Record<string, unknown> | null
    qualidade_pendente?: boolean | null
  }>
): DocChecklist[] {
  return (docs || []).map((d) => {
    const fd = d.form_data
    const fileName =
      fd && typeof fd.file_name === 'string'
        ? fd.file_name
        : fd && typeof fd.fileName === 'string'
          ? fd.fileName
          : null
    const qualidade =
      Boolean(d.qualidade_pendente) ||
      Boolean(fd && fd.qualidade_pendente === true)
    return {
      title: d.title,
      type: d.type,
      agent_type: d.agent_type,
      form_data: fd,
      file_name: fileName,
      qualidade_pendente: qualidade,
    }
  })
}

function textoDoDocumento(doc: DocChecklist): string {
  const fd = doc.form_data
  const fileName =
    doc.file_name ||
    (fd && typeof fd.file_name === 'string' ? fd.file_name : null) ||
    (fd && typeof fd.fileName === 'string' ? fd.fileName : null)
  const checklistItem =
    fd && typeof fd.checklist_item === 'string' ? fd.checklist_item : null

  return [doc.title, doc.type, doc.agent_type, fileName, checklistItem]
    .filter(Boolean)
    .join(' ')
}

export function documentoCasaComItem(doc: DocChecklist, item: string): boolean {
  const fd = doc.form_data
  if (fd && typeof fd.checklist_item === 'string' && fd.checklist_item === item) {
    return true
  }

  const docNorm = normalizarTexto(textoDoDocumento(doc))
  if (!docNorm) return false

  const itemNorm = normalizarTexto(item)
  const aliasesDoc = expandirAliases(docNorm)
  const aliasesItem = expandirAliases(itemNorm)

  for (const a of aliasesItem) {
    if (a.length < 2) continue
    for (const d of aliasesDoc) {
      if (d.includes(a) || a.includes(d)) return true
    }
  }

  // Itens compostos ("RG e CPF"): basta um token significativo casar.
  const tokensItem = tokensSignificativos(itemNorm)
  if (tokensItem.length > 1) {
    const hit = tokensItem.some((tok) => {
      const aliasTok = expandirAliases(tok)
      return [...aliasTok].some((a) => docNorm.includes(a))
    })
    if (hit) return true
  }

  return false
}

export type ResumoChecklist = {
  ok: true
  tipoBeneficio: string
  obrigatorios: string[]
  recebidos: string[]
  pendentes: string[]
  total: number
  recebidosCount: number
  rotulo: string
}

export type ResumoChecklistIndisponivel = {
  ok: false
  motivo: string
}

export type ResultadoChecklist = ResumoChecklist | ResumoChecklistIndisponivel

/**
 * Resolve o tipo de benefício a partir dos campos do cliente.
 * Aceita `tipo_beneficio` (canônico) e aliases legados em notes/profession.
 */
export function resolverTipoBeneficio(cliente: {
  tipo_beneficio?: string | null
  benefit_type?: string | null
} | null | undefined): string | null {
  const bruto = cliente?.tipo_beneficio || cliente?.benefit_type || ''
  const trim = String(bruto).trim()
  if (!trim) return null
  if (CHECKLIST_INSS[trim]) return trim

  const norm = normalizarTexto(trim)
  const chave = TIPOS_BENEFICIO_CHECKLIST.find((k) => normalizarTexto(k) === norm)
  return chave ?? null
}

export function documentosExigidos(tipoBeneficio: string | null | undefined): string[] | null {
  if (!tipoBeneficio) return null
  return CHECKLIST_INSS[tipoBeneficio] ?? null
}

export function avaliarChecklist(
  cliente: { tipo_beneficio?: string | null; benefit_type?: string | null } | null | undefined,
  documentos: DocChecklist[]
): ResultadoChecklist {
  const tipo = resolverTipoBeneficio(cliente)
  if (!tipo) {
    return {
      ok: false,
      motivo:
        'Defina o tipo de benefício deste cliente para calcular os documentos obrigatórios.',
    }
  }

  const obrigatorios = CHECKLIST_INSS[tipo]
  if (!obrigatorios?.length) {
    return {
      ok: false,
      motivo:
        'Não há checklist cadastrado para este tipo de benefício. Escolha outro na ficha do cliente.',
    }
  }

  const usados = new Set<number>()
  const recebidos: string[] = []
  const pendentes: string[] = []

  for (const item of obrigatorios) {
    const idx = documentos.findIndex(
      (doc, i) => !usados.has(i) && documentoCasaComItem(doc, item)
    )
    if (idx >= 0) {
      usados.add(idx)
      recebidos.push(item)
    } else {
      pendentes.push(item)
    }
  }

  const recebidosCount = recebidos.length
  const total = obrigatorios.length

  return {
    ok: true,
    tipoBeneficio: tipo,
    obrigatorios,
    recebidos,
    pendentes,
    total,
    recebidosCount,
    rotulo: `Documentos recebidos: ${recebidosCount}/${total}`,
  }
}

/** Sugere o item da checklist que melhor casa com o nome do arquivo. */
export function sugerirItemChecklist(
  fileName: string,
  itens: string[]
): string | null {
  const fake: DocChecklist = { title: fileName, file_name: fileName }
  for (const item of itens) {
    if (documentoCasaComItem(fake, item)) return item
  }
  return null
}
