import { writeFileSync } from 'fs'
import {
  canonicalizarMarcadoresSm,
  montarHtmlSmRural,
  normalizarTituloSubtitulo,
  textoRodapeSm,
} from '../lib/peticao-sm-rural'
import { FIXTURE_SM_ANA_LUCIA } from '../lib/fixtures/sm-ana-lucia'
import { valorCausaSalarioMaternidade } from '../lib/salario-minimo'

const { mensalFmt, totalFmt } = valorCausaSalarioMaternidade()
const mensalEsc = mensalFmt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const adv = {
  name: 'Prev Labs',
  office_name: 'Prev Labs',
  oab_number: '12345',
  oab_uf: 'MA',
  email: 'contato@prevlabs.com.br',
  cidade: 'São Luís',
  estado: 'MA',
  logo_url: null as string | null,
}

const html = montarHtmlSmRural({ text: FIXTURE_SM_ANA_LUCIA, adv, comMargens: true })
if (!html) {
  console.error('FAIL: null html')
  process.exit(1)
}

writeFileSync('tmp-sm-preview.html', `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`)

const MALFORMED = `Qualificação da autora, agricultora, vem propor a presente
<<<END_TITULO>>>
<<<ENDIIANTES>>>
<<<TIMELINE>>>
{"nome":"Maria da Silva","atividade":"Agricultora","local":"Rurópolis/PA","estilo":"horizontal","eventos":[{"data":"10/05/2024","titulo":"Nascimento","detalhe":"João"}]}
<<<END_I>>>
<<<V_FUNDAMENTACAO>>>
O salário-maternidade é um direito assegurado pelo art. 71 da Lei nº 8.213/1991.
<<<VI_PEDIDOS>>>
i. Seja a ação julgada procedente
<<<FECHAMENTO>>>
Termos em que, pede e espera deferimento.
`

const htmlBad = montarHtmlSmRural({ text: MALFORMED, adv, comMargens: true })
if (!htmlBad) {
  console.error('FAIL: malformed returned null (deveria parsear mesmo sem SM_RURAL_V2)')
  process.exit(1)
}

writeFileSync('tmp-sm-malformed.html', `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${htmlBad}</body></html>`)

const DUP_TITULO = FIXTURE_SM_ANA_LUCIA.replace(
  /<<<TITULO>>>[\s\S]*?<<<END_TITULO>>>/,
  `<<<TITULO>>>
AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE << >>
(SEGURADA ESPECIAL – AGRICULTORA)
<<<SUBTITULO>>>
(SEGURADA ESPECIAL – AGRICULTORA)
<<<END_TITULO>>>`,
)
const htmlDup = montarHtmlSmRural({ text: DUP_TITULO, adv, comMargens: true }) || ''
const titleDup = htmlDup.match(/sm-main-title"[^>]*>([\s\S]*?)<\/div>/)?.[1] || ''
const subDup = htmlDup.match(/sm-sub-title"[^>]*>([\s\S]*?)<\/div>/)?.[1] || ''

const COLADO = normalizarTituloSubtitulo(
  'AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE << >> (SEGURADA ESPECIAL – AGRICULTORA)(SEGURADA ESPECIAL – AGRICULTORA)',
  '',
)

const canon = canonicalizarMarcadoresSm('<<<ENDIIANTES>>>\n<<<V_FUNDAMENTACAO>>>')

const pedidosBlock = html.match(/sm-secao-vi[\s\S]*?sm-fecho-bloco/)?.[0] || ''
const romanos = (html.match(/sm-rom">(?:viii|vii|vi|v|iv|iii|ii|i)\./gi) || []).map((s) =>
  s.replace(/sm-rom">/i, '').toLowerCase(),
)

const checks: [string, boolean][] = [
  [`planilha ${mensalFmt} x4`, (html.match(new RegExp(mensalEsc, 'g')) || []).length >= 4],
  [`total ${totalFmt}`, html.includes(totalFmt)],
  ['titulo br', html.includes('SALÁRIO-<br/>MATERNIDADE')],
  ['header nome', html.includes('Prev Labs')],
  ['header OAB', html.includes('OAB/MA n° 12345')],
  ['header email', html.includes('contato@prevlabs.com.br')],
  ['sem footer no corpo', !/<div class="sm-footer[\s"]/.test(html)],
  ['sem timeline no corpo (estilo none)', !/<div class="sm-timeline[\s"]/.test(html)],
  ['overflow visible no .pdf-page.sm-rural', /\.pdf-page\.sm-rural\s*\{[^}]*overflow:\s*visible/.test(html)],
  ['sm-pedidos overflow visible', /\.sm-pedidos\s*\{[^}]*overflow:\s*visible/.test(html)],
  ['max-width 794', html.includes('max-width: 794px')],
  ['width 794', html.includes('width: 794px')],
  ['III then IV', /III[\s\S]*IV – DAS PROVAS/.test(html)],
  ['fixture sem tags no HTML', !/<<<[A-Z0-9_]+>>>/.test(html)],
  ['fixture sem JSON cru', !/"eventos"\s*:/.test(html)],
  ['sm-para 12px', html.includes('font-size: 12px')],
  ['sm-para sem uppercase', /\.sm-para\s*\{[^}]*text-transform:\s*none/.test(html)],
  ['seção com uppercase', /\.sm-section-bar[\s\S]*?text-transform:\s*uppercase/.test(html)],
  ['data centralizada', /\.sm-local-data\s*\{[^}]*text-align:\s*center/.test(html)],
  ['logo slot vazio (sem img)', !/<img /.test(html)],
  ['logo slot 60px', html.includes('sm-logo-slot') && html.includes('width:60px')],
  [
    'titulo sem subtítulo duplicado',
    /sm-main-title"[^>]*>[^<]*SALÁRIO-<br\/>MATERNIDADE<\/div>\s*<div class="sm-sub-title"[^>]*>\(SEGURADA ESPECIAL/.test(
      html,
    ) && (html.match(/sm-sub-title"[^>]*>\(SEGURADA ESPECIAL/g) || []).length === 1,
  ],
  ['titulo sem artefato <<', !/sm-main-title"[^>]*>[^<]*&lt;/.test(html)],
  ['dup título limpo', !/&lt;|&gt;|SEGURADA/.test(titleDup) && /SALÁRIO-<br\/>MATERNIDADE/.test(titleDup)],
  ['dup subtítulo único', subDup === '(SEGURADA ESPECIAL – AGRICULTORA)'],
  [
    'normalizar cola título+subtítulo',
    !/SEGURADA/.test(COLADO.titulo) &&
      COLADO.subtitulo === '(SEGURADA ESPECIAL – AGRICULTORA)' &&
      /SALÁRIO-MATERNIDADE/i.test(COLADO.titulo),
  ],
  [
    'seção VI sem avoid no container',
    /sm-secao-vi"[^>]*page-break-inside:\s*auto/.test(html) &&
      !/\.sm-secao-vi\s*\{[^}]*page-break-inside:\s*avoid/.test(html),
  ],
  [
    'sm-pedidos sem avoid',
    /\.sm-pedidos\s*\{[^}]*page-break-inside:\s*auto/.test(html) &&
      !/class="sm-pedidos"[^>]*page-break-inside:\s*avoid/.test(html),
  ],
  ['orphans widows nos pedidos', /\.sm-pedido-item[\s\S]*?orphans:\s*2/.test(html) && html.includes('widows: 2')],
  ['subhead sem border-left', /\.sm-subhead\s*\{[^}]*border-left:\s*none/.test(html)],
  ['subhead sem barra (só bold)', html.includes('sm-subhead') && !/sm-subhead[^>]*(border-left:\s*[1-9]|background:\s*#)/.test(pedidosBlock)],
  ['sem data-pdf-keep nos pedidos', !/sm-pedido-item[^>]*data-pdf-keep/.test(html)],
  ['data-pdf-block presente', html.includes('data-pdf-block="1"')],
  ['endereco sem Comarca', /SUBSEÇÃO JUDICIÁRIA DE SÃO LUÍS/.test(html) && !/COMARCA DE/.test(html)],
  ['itens i–viii presentes', ['i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.'].every((r) => romanos.includes(r))],
  ['canon ENDIIANTES', canon.includes('<<<END_III_ANTES>>>')],
  ['malformed não nulo', Boolean(htmlBad)],
  ['malformed sem tags', !/<<<[A-Z0-9_]+>>>/.test(htmlBad)],
  ['malformed sem END_TITULO', !htmlBad.includes('END_TITULO') && !htmlBad.includes('ENDIIANTES')],
  ['malformed timeline parseada', htmlBad.includes('sm-timeline') && !htmlBad.includes('"eventos"')],
  ['malformed fundamentação', htmlBad.includes('art. 71')],
]

let ok = true
for (const [name, pass] of checks) {
  console.log(pass ? 'OK' : 'FAIL', name)
  if (!pass) ok = false
}
console.log('rodape:', textoRodapeSm(adv))
console.log('salario vigente:', mensalFmt, '×4 =', totalFmt)
console.log(ok ? 'ALL PASSED' : 'SOME FAILED')
process.exit(ok ? 0 : 1)
