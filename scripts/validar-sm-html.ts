import { writeFileSync } from 'fs'
import { montarHtmlSmRural, textoRodapeSm } from '../lib/peticao-sm-rural'
import { FIXTURE_SM_ANA_LUCIA } from '../lib/fixtures/sm-ana-lucia'

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

const checks: [string, boolean][] = [
  ['planilha 1518 x4', (html.match(/R\$ 1\.518,00/g) || []).length >= 4],
  ['total 6072', html.includes('R$ 6.072,00')],
  ['titulo br', html.includes('SALÁRIO-<br/>MATERNIDADE')],
  ['header nome', html.includes('Prev Labs')],
  ['header OAB', html.includes('OAB/MA n° 12345')],
  ['header email', html.includes('contato@prevlabs.com.br')],
  ['sem footer no corpo', !/<div class="sm-footer[\s"]/.test(html)],
  ['sem timeline no corpo', !/<div class="sm-timeline[\s"]/.test(html)],
  ['overflow hidden', html.includes('overflow: hidden')],
  ['max-width 794', html.includes('max-width: 794px')],
  ['III then IV', /III[\s\S]*IV – DAS PROVAS/.test(html)],
]

let ok = true
for (const [name, pass] of checks) {
  console.log(pass ? 'OK' : 'FAIL', name)
  if (!pass) ok = false
}
console.log('rodape:', textoRodapeSm(adv))
console.log(ok ? 'ALL PASSED' : 'SOME FAILED')
process.exit(ok ? 0 : 1)
