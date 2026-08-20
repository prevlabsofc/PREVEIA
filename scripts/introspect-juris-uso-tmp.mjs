import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY

const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
const spec = await res.json()
console.log('STATUS', res.status)
const defs = spec.definitions || spec.components?.schemas || {}
console.log('TABELAS:', Object.keys(defs).sort().join(', '))

for (const t of ['documents', 'processos', 'clients', 'lawyers', 'offices', 'jurisprudencias']) {
  if (!defs[t]) { console.log(`\n=== ${t} === (NAO EXISTE)`); continue }
  console.log(`\n=== ${t} ===`)
  for (const [col, v] of Object.entries(defs[t].properties || {})) {
    console.log(`  ${col}: ${v.format}${v.default !== undefined ? ` default=${JSON.stringify(v.default)}` : ''} ${v.description ? '// ' + v.description.replace(/\n/g, ' ') : ''}`)
  }
}

for (const t of ['documents', 'processos']) {
  const s = await fetch(`${url}/rest/v1/${t}?select=*&limit=2`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  console.log(`\nSAMPLE ${t} status=${s.status}`)
  console.log(JSON.stringify(await s.json(), null, 2).slice(0, 2500))
}
