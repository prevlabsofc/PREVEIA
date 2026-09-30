/**
 * Lista de provas SM (seção IV): parsing, recuperação e validação.
 * Uso: npx tsx scripts/testar-provas-sm.ts
 */
import JSZip from 'jszip'
import {
  ERRO_PROVAS_SM,
  diagnosticarProvasSm,
  estruturarProvasSm,
  extrairConteudoSmRural,
  montarHtmlSmRural,
  normalizarProvasNoTexto,
  validarCompletudeSmRural,
} from '../lib/peticao-sm-rural'
import { montarDocxSmRural } from '../lib/peticao-sm-rural-docx'
import { FIXTURE_SM_ANA_LUCIA } from '../lib/fixtures/sm-ana-lucia'

const adv = {
  name: 'Prev Labs',
  office_name: 'Prev Labs',
  oab_number: '12345',
  oab_uf: 'MA',
  cidade: 'São Luís',
  estado: 'MA',
}

const ITENS_REAIS = [
  '✓ Certidão de nascimento da criança (zona rural) — reforça o vínculo do núcleo familiar com a zona rural, indicando o local de nascimento do menor como elemento corroborador do labor campesino',
  '✓ Notas de venda de produtos rurais — constituem prova material da comercialização da produção agropecuária, evidenciando o exercício da atividade rural em regime de economia familiar',
  '✓ Autodeclaração de segurado especial — art. 38-B, §2º, Lei 8.213/91 — declaração formal do próprio autor afirmando o exercício de atividade rural em regime de economia familiar, com valor probatório expressamente reconhecido pela legislação previdenciária',
  '✓ Testemunhas disponíveis — pessoas que conviveram com o autor na zona rural e podem atestar, em audiência, o exercício contínuo do labor agrícola pelo período exigido para a concessão do benefício',
]

const RE_DEPOIS = /<<<III_SINTESE_DEPOIS>>>([\s\S]*?)<<<END_III_DEPOIS>>>/
const RE_IV = /<<<IV_PROVAS>>>[\s\S]*?<<<END_IV>>>/
const narrativaDepois = FIXTURE_SM_ANA_LUCIA.match(RE_DEPOIS)?.[1].trim() || ''

/** Formato normal (fixture). */
const NORMAL = FIXTURE_SM_ANA_LUCIA

/** Regressão real: IA não fecha a III (sem <<<END_III_DEPOIS>>>) e a IV vem com itens longos/2 travessões. */
const SEM_FIM_III = FIXTURE_SM_ANA_LUCIA.replace(
  RE_DEPOIS,
  `<<<III_SINTESE_DEPOIS>>>\n${narrativaDepois}\n`,
).replace(RE_IV, `<<<IV_PROVAS>>>\n${ITENS_REAIS.join('\n')}\n<<<END_IV>>>`)

/** Provas no fim da III (com linha em branco entre itens) e IV vazia. */
const PROVAS_NA_III = FIXTURE_SM_ANA_LUCIA.replace(
  RE_DEPOIS,
  `<<<III_SINTESE_DEPOIS>>>\n${narrativaDepois}\n\nProvas juntadas:\n${ITENS_REAIS.slice(0, 2).join('\n')}\n\n${ITENS_REAIS.slice(2).join('\n')}\n<<<END_III_DEPOIS>>>`,
).replace(RE_IV, '<<<IV_PROVAS>>>\n<<<END_IV>>>')

/** Provas no fim da III sem ✓ e sem nenhum marcador IV_PROVAS. */
const SEM_MARCADOR_IV = FIXTURE_SM_ANA_LUCIA.replace(
  RE_DEPOIS,
  `<<<III_SINTESE_DEPOIS>>>\n${narrativaDepois}\n\n${ITENS_REAIS.map((l) => l.replace(/^✓\s*/, '')).join('\n')}\n<<<END_III_DEPOIS>>>`,
).replace(RE_IV, '')

/** Inválido mesmo após recuperação: nenhuma prova em lugar nenhum. */
const SEM_PROVAS = FIXTURE_SM_ANA_LUCIA.replace(RE_IV, '<<<IV_PROVAS>>>\n<<<END_IV>>>')

function secoesHtml(html: string) {
  const iIII = html.search(/III\s*[–—-]\s*SÍNTESE/)
  const iIV = html.search(/IV\s*[–—-]\s*DAS PROVAS/)
  const iV = html.search(/V\s*[–—-]\s*FUNDAMENTAÇÃO/)
  return {
    iii: iIII >= 0 && iIV > iIII ? html.slice(iIII, iIV) : '',
    iv: iIV >= 0 && iV > iIV ? html.slice(iIV, iV) : '',
  }
}

async function docxProvas(text: string) {
  const buf = await montarDocxSmRural({ text, adv })
  if (!buf) return { tabelas: 0, linhasProva: 0 }
  const zip = await JSZip.loadAsync(buf)
  const xml = (await zip.file('word/document.xml')?.async('string')) || ''
  const tabelas = xml.match(/<w:tbl>/g) || []
  const linhasProva = (xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || []).filter((tr) =>
    tr.includes('<w:t xml:space="preserve">✓</w:t>') || tr.includes('<w:t>✓</w:t>'),
  )
  return { tabelas: tabelas.length, linhasProva: linhasProva.length }
}

async function caso(nome: string, text: string, esperado: number) {
  const c = extrairConteudoSmRural({ text, adv })
  const html = montarHtmlSmRural({ text, adv }) || ''
  const { iii, iv } = secoesHtml(html)
  const caixasIV = (iv.match(/data-pdf-prova="1"/g) || []).length
  const caixasTotal = (html.match(/data-pdf-prova="1"/g) || []).length
  const provaNaIII = /—\s*(reforça|constituem|declaração formal|pessoas que|comprova)/.test(iii)
  const docx = await docxProvas(text)
  const v = validarCompletudeSmRural(text)
  return [
    [`${nome}: extrair = ${esperado} provas`, c?.provas.length === esperado],
    [`${nome}: ${esperado} caixas no PDF, todas dentro da IV`, caixasIV === esperado && caixasTotal === esperado],
    [`${nome}: nenhuma prova no texto da III`, !provaNaIII],
    [`${nome}: DOCX com ${esperado} linhas ✓ (tabelas=${docx.tabelas})`, docx.linhasProva === esperado],
    [`${nome}: validação ok`, v.ok],
  ] as [string, boolean][]
}

async function main() {
  const checks: [string, boolean][] = []
  checks.push(...(await caso('normal', NORMAL, 6)))
  checks.push(...(await caso('sem END_III_DEPOIS', SEM_FIM_III, 4)))
  checks.push(...(await caso('provas no fim da III', PROVAS_NA_III, 4)))
  checks.push(...(await caso('sem marcador IV', SEM_MARCADOR_IV, 4)))

  const semProvas = validarCompletudeSmRural(SEM_PROVAS)
  checks.push(['inválido: bloqueia com mensagem de provas', !semProvas.ok && semProvas.motivo === ERRO_PROVAS_SM])
  checks.push(['inválido: diagnóstico aponta IV sem lista', /IV sem lista/.test(diagnosticarProvasSm(SEM_PROVAS).motivo || '')])

  const est = estruturarProvasSm([ITENS_REAIS[2].replace(/^✓\s*/, '')])[0]
  checks.push([
    'estrutura: nome / explicação com 2 travessões',
    est.nome === 'Autodeclaração de segurado especial' && est.explicacao.startsWith('art. 38-B'),
  ])

  const form = [
    'Certidão de nascimento da criança (zona rural)',
    'Autodeclaração de segurado especial (art. 38-B, §2º, Lei 8.213/91)',
    'Fotos de atividade agrícola',
  ]
  const normalizado = normalizarProvasNoTexto(PROVAS_NA_III, form)
  const cNorm = extrairConteudoSmRural({ text: normalizado, adv })
  const nomes = (cNorm?.provas || []).map((p) => p.split(' — ')[0])
  checks.push([
    'formulário: só as marcadas (+ marcada sem item entra pelo nome)',
    nomes.length === 3 &&
      nomes[0].startsWith('Certidão de nascimento da criança') &&
      nomes[1] === 'Autodeclaração de segurado especial' &&
      nomes[2] === 'Fotos de atividade agrícola',
  ])
  checks.push([
    'texto normalizado: itens ✓ dentro de IV_PROVAS e III fechada',
    /<<<END_III_DEPOIS>>>/.test(normalizado) &&
      /<<<IV_PROVAS>>>\n✓ Certidão[\s\S]*✓ Fotos de atividade agrícola\n<<<END_IV>>>/.test(normalizado) &&
      !/Provas juntadas:/.test(normalizado),
  ])
  const semFimNorm = normalizarProvasNoTexto(SEM_FIM_III)
  checks.push([
    'texto normalizado: fecha III sem END_III_DEPOIS',
    /reconhecido pela legislação|legítimo|\.\s*\n<<<END_III_DEPOIS>>>\n<<<IV_PROVAS>>>/.test(semFimNorm) &&
      semFimNorm.indexOf('<<<END_III_DEPOIS>>>') < semFimNorm.indexOf('<<<IV_PROVAS>>>'),
  ])

  let ok = true
  for (const [nome, pass] of checks) {
    console.log(pass ? 'OK  ' : 'FAIL', nome)
    if (!pass) ok = false
  }
  console.log(ok ? 'ALL PASSED' : 'SOME FAILED')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
