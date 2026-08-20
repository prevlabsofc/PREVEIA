/**
 * Smoke test local dos helpers de petição (sem DOM/PDF).
 * node --experimental-strip-types ou npx tsx scripts/test-peticao-export-tmp.ts
 */
import {
  corrigirLocalNoTexto,
  deduplicarHierarquiaTitulos,
  limparMarkdownResidual,
  MARGEM_PETICAO_CM,
  parseMarkdownToHtml,
  prepararTextoPeticao,
} from '../lib/peticao-export'

const adv = {
  name: 'Dra. Ana',
  office_name: 'Ana Advocacia',
  oab_number: '12345',
  oab_uf: 'MA',
  cidade: 'São Luís',
  estado: 'MA',
  email: 'ana@ex.com',
}

let fails = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    fails++
    console.error('FAIL:', msg)
  } else {
    console.log('OK:', msg)
  }
}

assert(MARGEM_PETICAO_CM.left === 3 && MARGEM_PETICAO_CM.top === 3, 'margens left/top 3cm')
assert(MARGEM_PETICAO_CM.right === 2 && MARGEM_PETICAO_CM.bottom === 2, 'margens right/bottom 2cm')

const local = corrigirLocalNoTexto('/MA, 16 de julho de 2025', adv)
assert(local === 'São Luís/MA, 16 de julho de 2025', `cidade antes UF: ${local}`)
assert(
  corrigirLocalNoTexto('MA, 16 de julho de 2025', adv) === 'São Luís/MA, 16 de julho de 2025',
  'UF solto vira cidade/UF',
)

const dup = deduplicarHierarquiaTitulos(
  '## 1. PRELIMINARMENTE\n### 1. PRELIMINARMENTE\n### 1.1 Da Gratuidade\n',
)
assert(
  (dup.match(/PRELIMINARMENTE/g) || []).length === 1,
  'dedup título pai',
)

const md = parseMarkdownToHtml(
  '## III — SÍNTESE DO CONTEXTO FÁTICO\n\n**Fumus boni iuris** / Periculum in mora.\n\n## 1. PRELIMINARMENTE\n### 1. PRELIMINARMENTE\nTexto.\n',
  { estilo: 'classico', adv },
)
assert(!md.includes('**'), 'sem ** residual no HTML')
assert(!md.includes('## '), 'sem ## residual no HTML')
assert(md.includes('Fumus boni iuris'), 'preserva Fumus boni iuris')
assert(md.includes('doc-box'), 'box de síntese')
assert(md.includes('section-classic'), 'estilo clássico')
assert(
  (md.match(/PRELIMINARMENTE/g) || []).length === 1,
  'sem título duplicado no HTML',
)

const prepared = prepararTextoPeticao('MA, 1 de janeiro de 2026\n\n# Título **negrito**', adv)
assert(prepared.includes('São Luís/MA'), 'prepararTextoPeticao corrige local')
assert(limparMarkdownResidual('## **FOO**') === 'FOO', 'limparMarkdownResidual')

if (fails) {
  console.error(`\n${fails} falha(s)`)
  process.exit(1)
}
console.log('\nTodos os asserts passaram.')
