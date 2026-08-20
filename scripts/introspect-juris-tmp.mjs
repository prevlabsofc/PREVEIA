import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.locaL', 'utf8')
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
for (const t of Object.keys(defs)) {
  if (!/juris/i.test(t)) continue
  console.log(`\n=== ${t} ===`)
  for (const [col, v] of Object.entries(defs[t].properties || {})) {
    console.log(`  ${col}: ${v.format}${v.default !== undefined ? ` default=${JSON.stringify(v.default)}` : ''} ${v.description ? '// ' + v.description.replace(/\n/g, ' ') : ''}`)
  }
}

const sample = await fetch(`${url}/rest/v1/jurisprudencias?select=*&limit=3`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
console.log('\nSAMPLE STATUS', sample.status)
console.log(JSON.stringify(await sample.json(), null, 2).slice(0, 3000))
