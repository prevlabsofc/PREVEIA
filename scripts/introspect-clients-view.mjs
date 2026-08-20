import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.locaL', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
const spec = await res.json()
const defs = spec.definitions || spec.components?.schemas || {}
console.log('TABELAS:', Object.keys(defs).join(', '))
for (const t of ['clients', 'profiles']) {
  if (!defs[t]) {
    console.log(`\n=== ${t} (NAO ENCONTRADA) ===`)
    continue
  }
  console.log(`\n=== ${t} ===`)
  for (const [col, v] of Object.entries(defs[t].properties || {})) {
    console.log(`  ${col}: ${v.format}${v.default !== undefined ? ` default=${JSON.stringify(v.default)}` : ''}${v.enum ? ` enum=${JSON.stringify(v.enum)}` : ''}`)
  }
}
