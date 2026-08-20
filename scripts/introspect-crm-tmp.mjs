import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const h = { apikey: key, Authorization: `Bearer ${key}` }

const iso = new Date().toISOString()

// Valida a sintaxe do filtro `or` com timestamp ISO (contém ':' e '.').
for (const variante of [
  `(last_login.is.null,last_login.lt."${iso}")`,
  `(last_login.is.null,last_login.lt.${iso})`,
]) {
  const qs = new URLSearchParams({ select: 'id', or: variante, limit: '1' })
  const r = await fetch(`${url}/rest/v1/lawyers?${qs}`, { headers: h })
  console.log(variante.includes('"') ? 'COM aspas  ' : 'SEM aspas  ', r.status, (await r.text()).slice(0, 200))
}
