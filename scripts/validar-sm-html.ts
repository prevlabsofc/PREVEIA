import { writeFileSync } from 'fs'
import {
  canonicalizarMarcadoresSm,
  extrairProvasDoFimDaSintese,
  montarHtmlSmRural,
  montarLayoutsTimeline,
  normalizarTituloSubtitulo,
  textoRodapeSm,
  timelineLabelsSemOverlap,
} from '../lib/peticao-sm-rural'
import { FIXTURE_SM_ANA_LUCIA } from '../lib/fixtures/sm-ana-lucia'
import { getSalarioMinimo, valorCausaSalarioMaternidade } from '../lib/salario-minimo'

const { mensalFmt, totalFmt } = valorCausaSalarioMaternidade('10/01/2025')
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
  'feminino',
)
const COLADO_M = normalizarTituloSubtitulo(
  'AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE (SEGURADA ESPECIAL – AGRICULTORA)',
  '(SEGURADA ESPECIAL – AGRICULTORA)',
  'masculino',
)
const COLADO_NEUTRO = normalizarTituloSubtitulo(
  'AÇÃO PREVIDENCIÁRIA DE CONCESSÃO DE SALÁRIO-MATERNIDADE',
  '',
)

const canon = canonicalizarMarcadoresSm('<<<ENDIIANTES>>>\n<<<V_FUNDAMENTACAO>>>')

const pedidosBlock = html.match(/sm-secao-vi[\s\S]*?sm-fecho-bloco/)?.[0] || ''
const romanos = (html.match(/sm-rom">(?:viii|vii|vi|v|iv|iii|ii|i)\./gi) || []).map((s) =>
  s.replace(/sm-rom">/i, '').toLowerCase(),
)

// BUG1: provas no fim da III devem migrar para IV (depois da faixa)
const COM_PROVAS_NA_III = FIXTURE_SM_ANA_LUCIA.replace(
  /<<<III_SINTESE_DEPOIS>>>[\s\S]*?<<<END_III_DEPOIS>>>/,
  `<<<III_SINTESE_DEPOIS>>>
Em 10/01/2025 nasceu o filho da autora. Requereu o benefício e foi indeferido.

Certidão de nascimento — comprova o parto e o vínculo maternal
CNIS — demonstra ausência de vínculos urbanos
Declaração de atividade rural — prova o labor em economia familiar
Notas fiscais de produtor — corroboram a comercialização agrícola
Autodeclaração de segurado especial — art. 38-B, §2º, Lei 8.213/91
<<<END_III_DEPOIS>>>`,
).replace(/<<<IV_PROVAS>>>[\s\S]*?<<<END_IV>>>/, `<<<IV_PROVAS>>>\n<<<END_IV>>>`)

const extr = extrairProvasDoFimDaSintese(`Narrativa ok.

Doc A — prova A
Doc B — prova B
Doc C — prova C`)
const htmlProvasIII = montarHtmlSmRural({ text: COM_PROVAS_NA_III, adv, comMargens: true }) || ''
const idxIV = htmlProvasIII.search(/IV\s*[–—\-]\s*DAS PROVAS/)
const ordemProvasOk =
  /IV\s*[–—\-]\s*DAS PROVAS[\s\S]*?class="sm-provas[\s\S]*?class="sm-check"/.test(htmlProvasIII)
const antesIV = idxIV >= 0 ? htmlProvasIII.slice(0, idxIV) : ''
const temProvaAntesIV =
  /class="sm-prova-txt"|Certidão de nascimento —|CNIS —|Notas fiscais de produtor —/.test(antesIV)

// Timeline 5 e 6 marcos
const ev5 = Array.from({ length: 5 }, (_, i) => ({
  data: `0${i + 1}/01/2020`,
  titulo: `Evento longo numero ${i + 1} com titulo`,
  detalhe: `Detalhe do marco ${i + 1} bem descritivo`,
}))
const ev6 = Array.from({ length: 6 }, (_, i) => ({
  data: `0${i + 1}/01/2020`,
  titulo: `Marco ${i + 1} titulo completo`,
  detalhe: `Descricao ${i + 1}`,
}))
const lay5 = montarLayoutsTimeline(ev5)
const lay6 = montarLayoutsTimeline(ev6)
const ov5 = timelineLabelsSemOverlap(lay5.layouts)
const ov6 = timelineLabelsSemOverlap(lay6.layouts)
const yIncremental6 = lay6.layouts.every((l) => {
  const ys = [l.dataY, ...l.titleYs, ...(l.detailY != null ? [l.detailY] : [])]
  return ys.every((y, i) => i === 0 || Math.abs(y - ys[i - 1] - 14) < 0.01)
})

const sm2000 = getSalarioMinimo('12/02/2000')
const sm2000b = getSalarioMinimo('2000-02-12')
const vc2000 = valorCausaSalarioMaternidade('12/02/2000')

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
    'subtítulo masculino força agricultor',
    COLADO_M.subtitulo === '(SEGURADO ESPECIAL – AGRICULTOR)' &&
      !/AGRICULTORA/.test(COLADO_M.subtitulo),
  ],
  [
    'subtítulo vazio → neutro',
    COLADO_NEUTRO.subtitulo === '(SEGURADO(A) ESPECIAL – AGRICULTOR(A))',
  ],
  ['pedido iii atividade rural', /atividade rural no CNIS/i.test(FIXTURE_SM_ANA_LUCIA)],
  ['pedido iii sem carência rural', !/carência rural no CNIS/i.test(FIXTURE_SM_ANA_LUCIA)],
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
  // BUG1
  ['extrairProvasDoFim remove da III', extr.provas.length === 3 && !/Doc A/.test(extr.limpo)],
  ['provasHtml depois da faixa IV', ordemProvasOk],
  ['provas NÃO antes de IV', !temProvaAntesIV],
  ['sm-check CSS verde', /\.sm-check[\s\S]*?#15803d/.test(html)],
  ['provas migradas renderizam check', (htmlProvasIII.match(/class="sm-check"/g) || []).length >= 5],
  // BUG2
  ['timeline 5 marcos sem overlap', ov5.ok],
  ['timeline 6 marcos sem overlap', ov6.ok],
  ['timeline 6 y incremental 14px', yIncremental6],
  ['timeline SVG height suficiente', lay6.meta.h >= 200],
  // BUG6 / salário mínimo
  ['SM 12/02/2000 != 1621', sm2000 !== 1621 && sm2000b !== 1621],
  ['SM 12/02/2000 = 136', sm2000 === 136 && sm2000b === 136],
  ['nota planilha vigência 01/05/1999', /01\/05\/1999/.test(vc2000.nota)],
  ['nota planilha sem só-ano-1999 enganoso', !/vigente em 1999/.test(vc2000.nota)],
]

let ok = true
for (const [name, pass] of checks) {
  console.log(pass ? 'OK' : 'FAIL', name)
  if (!pass) ok = false
}
console.log('rodape:', textoRodapeSm(adv))
console.log('salario fixture (parto 2025):', mensalFmt, '×4 =', totalFmt)
console.log('salario parto 12/02/2000:', sm2000, vc2000.mensalFmt, 'vigência', vc2000.dataVigenciaFmt)
console.log(ok ? 'ALL PASSED' : 'SOME FAILED')
process.exit(ok ? 0 : 1)
