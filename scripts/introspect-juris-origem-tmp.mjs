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

// 1) Colunas atuais de jurisprudencias — procurando por origem/url/carimbo de importação
const spec = await (await fetch(`${url}/rest/v1/`, { headers: h })).json()
const props = (spec.definitions || {}).jurisprudencias?.properties || {}
console.log('COLUNAS:', Object.keys(props).join(', '))
for (const alvo of ['origem', 'importada_em', 'importado_em', 'sincronizada_em', 'url', 'url_fonte', 'fonte_url', 'link']) {
  console.log(`  ${alvo}: ${alvo in props ? 'EXISTE' : '—'}`)
}

// 2) Total de linhas
const res = await fetch(`${url}/rest/v1/jurisprudencias?select=id`, { headers: { ...h, Prefer: 'count=exact' } })
console.log('\ncontent-range (total):', res.headers.get('content-range'))

// 3) created_at de todas as linhas — a automação ainda não existe, então
//    toda linha anterior a hoje só pode ter vindo de cadastro manual/CSV.
const linhas = await (await fetch(`${url}/rest/v1/jurisprudencias?select=created_at,tribunal,assunto&order=created_at.asc`, { headers: h })).json()
console.log('linhas:', linhas.length)
if (linhas.length) {
  console.log('created_at mais antigo:', linhas[0].created_at)
  console.log('created_at mais recente:', linhas[linhas.length - 1].created_at)
  const porDia = {}
  for (const l of linhas) {
    const dia = (l.created_at || '').slice(0, 10)
    porDia[dia] = (porDia[dia] || 0) + 1
  }
  console.log('por dia:', JSON.stringify(porDia, null, 2))
  console.log('sem created_at:', linhas.filter(l => !l.created_at).length)
}
