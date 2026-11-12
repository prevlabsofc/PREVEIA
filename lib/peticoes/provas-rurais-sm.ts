/**
 * Documentos-chave de prova de atividade rural no salário-maternidade.
 *
 * A IA deve citar EXPRESSAMENTE, na fundamentação, apenas os que estiverem
 * anexados no cadastro / marcados nas provas do formulário.
 *
 * Se nenhum dos três estiver presente → alerta amarelo no editor.
 */

export const ALERTA_SEM_PROVA_ATIVIDADE_RURAL =
  'Nenhum documento de prova de atividade rural foi anexado — considere adicionar antes de protocolar.'

export type DocProvaRuralId =
  | 'certidao_nascido_vivo_agricultora'
  | 'cadunico_endereco_rural'
  | 'bolsa_familia_endereco_rural'

export type DocProvaRural = {
  id: DocProvaRuralId
  /** Nome a citar na petição. */
  nomePeticao: string
  /** O que o documento prova (texto curto para o prompt). */
  aptidao: string
  /** Padrões de matching (título do anexo / texto da prova marcada). */
  padroes: RegExp[]
}

/**
 * Os três documentos privilegiados. Ordem fixa para citação previsível.
 * Validar com o Fernando se os nomes oficiais mudarem.
 */
export const DOCS_PROVA_ATIVIDADE_RURAL: readonly DocProvaRural[] = [
  {
    id: 'certidao_nascido_vivo_agricultora',
    nomePeticao:
      'Certidão de Nascido Vivo com profissão da mãe constando como AGRICULTORA',
    aptidao:
      'início de prova material da atividade rural da mãe (profissão AGRICULTORA)',
    padroes: [
      /certid[aã]o\s+de\s+nascido\s+vivo/i,
      /nascido\s+vivo/i,
      /dnv\b/i,
      /declara[cç][aã]o\s+de\s+nascido\s+vivo/i,
      /certid[aã]o\s+de\s+nascimento.*agricultor/i,
      /nascimento.*profiss[aã]o.*agricultor/i,
    ],
  },
  {
    id: 'cadunico_endereco_rural',
    nomePeticao: 'CadÚnico com endereço rural',
    aptidao: 'prova do domicílio/endereço rural da unidade familiar',
    padroes: [
      /cad[uú]nico/i,
      /cadastro\s+[uú]nico/i,
      /cad\s*unico/i,
    ],
  },
  {
    id: 'bolsa_familia_endereco_rural',
    nomePeticao: 'Espelho ou Relatório do Bolsa Família com endereço rural',
    aptidao: 'prova do endereço rural e da situação socioeconômica familiar',
    padroes: [
      /bolsa\s*fam[ií]lia/i,
      /espelho.*bolsa/i,
      /relat[oó]rio.*bolsa/i,
      /\bpbf\b/i,
    ],
  },
]

function normalizarFonte(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
}

/** Extrai textos de títulos/provas a partir de fontes heterogêneas. */
export function coletarFontesDocs(fontes: unknown): string[] {
  if (fontes == null) return []
  if (typeof fontes === 'string') {
    const t = fontes.trim()
    return t ? [t] : []
  }
  if (Array.isArray(fontes)) {
    const out: string[] = []
    for (const item of fontes) {
      if (typeof item === 'string') {
        const t = item.trim()
        if (t) out.push(t)
        continue
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>
        for (const k of [
          'title',
          'titulo',
          'nome',
          'name',
          'file_name',
          'fileName',
          'checklist_item',
          'texto',
          'label',
        ]) {
          const v = o[k]
          if (typeof v === 'string' && v.trim()) out.push(v.trim())
        }
        const fd = o.form_data
        if (fd && typeof fd === 'object') {
          const f = fd as Record<string, unknown>
          for (const k of ['file_name', 'checklist_item', 'title', 'titulo']) {
            const v = f[k]
            if (typeof v === 'string' && v.trim()) out.push(v.trim())
          }
        }
      }
    }
    return out
  }
  return []
}

function fonteCasaComDoc(fonte: string, doc: DocProvaRural): boolean {
  const n = normalizarFonte(fonte)
  if (!n) return false
  return doc.padroes.some((re) => re.test(n))
}

/**
 * Quais dos 3 documentos-chave estão presentes nas fontes
 * (anexos do cliente + provas marcadas no formulário).
 */
export function detectarDocsProvaAtividadeRural(
  ...listasFontes: unknown[]
): DocProvaRural[] {
  const textos: string[] = []
  for (const lista of listasFontes) {
    textos.push(...coletarFontesDocs(lista))
  }
  const encontrados: DocProvaRural[] = []
  for (const doc of DOCS_PROVA_ATIVIDADE_RURAL) {
    if (textos.some((t) => fonteCasaComDoc(t, doc))) {
      encontrados.push(doc)
    }
  }
  return encontrados
}

export function alertaProvasAtividadeRural(
  docsEncontrados: readonly DocProvaRural[],
): string | null {
  return docsEncontrados.length === 0 ? ALERTA_SEM_PROVA_ATIVIDADE_RURAL : null
}

/** Bloco injetado no system prompt (somente SM rural). */
export function blocoPromptDocsProvaRural(
  docsEncontrados: readonly DocProvaRural[],
): string {
  if (!docsEncontrados.length) {
    return `
DOCUMENTOS-CHAVE DE PROVA DE ATIVIDADE RURAL:
- Nenhum dos três documentos privilegiados foi localizado nos anexos/provas:
  (1) Certidão de Nascido Vivo com profissão da mãe AGRICULTORA;
  (2) CadÚnico com endereço rural;
  (3) Espelho/Relatório do Bolsa Família com endereço rural.
- NÃO invente nem cite esses documentos como se estivessem nos autos.
- Na fundamentação, não afirme a existência desses documentos.
`
  }

  const lista = docsEncontrados
    .map(
      (d) =>
        `- CITE EXPRESSAMENTE na fundamentação (e, se couber, na seção de provas): "${d.nomePeticao}" — apto a ${d.aptidao}.`,
    )
    .join('\n')

  const ausentes = DOCS_PROVA_ATIVIDADE_RURAL.filter(
    (d) => !docsEncontrados.some((e) => e.id === d.id),
  )
    .map((d) => d.nomePeticao)
    .join('; ')

  return `
DOCUMENTOS-CHAVE DE PROVA DE ATIVIDADE RURAL (obrigatório citar na fundamentação):
${lista}
${ausentes ? `- NÃO cite os seguintes (não anexados): ${ausentes}.` : ''}
- Cite pelo nome exato acima; não invente conteúdo interno (datas, CEP) além do informado nas fontes.
`
}
