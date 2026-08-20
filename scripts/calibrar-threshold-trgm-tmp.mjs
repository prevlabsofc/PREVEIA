// Reproduz o algoritmo de trigramas do pg_trgm para calibrar o limiar de
// similaridade contra os termos que realmente existem na base.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const h = { apikey: key, Authorization: `Bearer ${key}` }

const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// pg_trgm: minusculiza, troca nao-alfanumerico por espaco, e para cada palavra
// gera trigramas de "  palavra " (2 espacos antes, 1 depois).
function trigramas(texto) {
  const set = new Set()
  for (const p of semAcento(texto).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)) {
    const s = '  ' + p + ' '
    for (let i = 0; i + 3 <= s.length; i++) set.add(s.slice(i, i + 3))
  }
  return set
}

// similarity(): |interseccao| / |uniao|
function similarity(a, b) {
  const A = trigramas(a), B = trigramas(b)
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

// word_similarity(a, b): melhor similaridade entre os trigramas de `a` e
// qualquer extensao continua de `b`. Aproximado por janela de palavras.
function wordSimilarity(a, b) {
  const A = trigramas(a)
  const palavras = semAcento(b).toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)
  const nA = [...A].length
  let melhor = 0
  const largura = Math.max(1, semAcento(a).split(/[^a-zA-Z0-9]+/).filter(Boolean).length)
  for (let i = 0; i < palavras.length; i++) {
    for (let w = largura; w <= largura + 1 && i + w <= palavras.length; w++) {
      const B = trigramas(palavras.slice(i, i + w).join(' '))
      let inter = 0
      for (const t of A) if (B.has(t)) inter++
      melhor = Math.max(melhor, inter / nA)
    }
  }
  return melhor
}

const linhas = await (await fetch(`${url}/rest/v1/jurisprudencias?select=assunto,ementa,tags`, { headers: h })).json()

// Vocabulario real: tags + palavras do assunto (>= 4 chars), como fara a RPC.
const vocab = new Map()
for (const l of linhas) {
  for (const t of l.tags || []) vocab.set(semAcento(t).toLowerCase(), (vocab.get(semAcento(t).toLowerCase()) || 0) + 1)
  for (const p of semAcento(l.assunto).toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length >= 4))
    vocab.set(p, (vocab.get(p) || 0) + 1)
}
console.log(`vocabulario real: ${vocab.size} termos\n`)

// --- Caso 1: sugestoes (termo curto vs termo curto) -> similarity()
const consultas = [
  ['carencia', 'acento removido, deveria casar exato'],
  ['carência', 'com acento, deveria casar exato'],
  ['carenica', 'typo (transposicao)'],
  ['carenci', 'typo (falta letra)'],
  ['aposentadoria', 'termo que NAO existe na base'],
  ['maternidad', 'typo (falta letra)'],
  ['maternidde', 'typo (falta letra no meio)'],
  ['xyzabc', 'lixo, nao deve sugerir nada'],
]

console.log('=== SUGESTOES: similarity(consulta, termo_do_vocabulario) ===')
for (const [q, nota] of consultas) {
  const ranked = [...vocab.keys()]
    .map(t => [t, similarity(q, t)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  console.log(`\n"${q}" (${nota})`)
  for (const [t, s] of ranked) console.log(`    ${s.toFixed(3)}  ${t}`)
}

// --- Caso 2: match nos registros -> word_similarity()
console.log('\n\n=== MATCH: word_similarity(consulta, assunto/ementa) melhor por registro ===')
for (const [q, nota] of consultas) {
  const scores = linhas
    .map(l => Math.max(wordSimilarity(q, l.assunto), wordSimilarity(q, l.ementa || '')))
    .sort((a, b) => b - a)
  const unicos = [...new Set(scores.map(s => s.toFixed(3)))].slice(0, 5)
  console.log(`"${q}" (${nota}) -> top scores: ${unicos.join(', ')}`)
}
