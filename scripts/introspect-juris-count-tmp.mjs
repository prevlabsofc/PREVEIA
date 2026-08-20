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

// 1) Contagem exata + quantas linhas o PostgREST devolve num select sem limit
const res = await fetch(`${url}/rest/v1/jurisprudencias?select=id`, {
  headers: { ...h, Prefer: 'count=exact' },
})
const rows = await res.json()
console.log('STATUS', res.status)
console.log('content-range (total no banco):', res.headers.get('content-range'))
console.log('linhas devolvidas numa chamada sem limit:', Array.isArray(rows) ? rows.length : rows)

// 2) Extensões já instaladas
const ext = await fetch(`${url}/rest/v1/rpc/pg_trgm_check`, {
  method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: '{}',
})
console.log('rpc pg_trgm_check status:', ext.status)

// 3) Funções RPC já expostas relacionadas a jurisprudencia
const spec = await (await fetch(`${url}/rest/v1/`, { headers: h })).json()
const paths = Object.keys(spec.paths || {}).filter(p => p.startsWith('/rpc/'))
console.log('RPCs existentes:', paths.join(', ') || '(nenhuma)')

// 4) Amostra de assuntos, para calibrar o threshold
const sample = await (await fetch(`${url}/rest/v1/jurisprudencias?select=assunto,tribunal,tags&limit=40`, { headers: h })).json()
console.log('\nAmostra de assuntos:')
for (const s of sample) console.log(' -', s.tribunal, '|', s.assunto, '| tags:', JSON.stringify(s.tags))
