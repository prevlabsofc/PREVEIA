/**
 * Aplica a migration documents_access_token no projeto ligado ao .env.local.
 * Uso (na raiz do repo, com SUPABASE_DB_URL ou DATABASE_URL):
 *   node --env-file=.env.locaL scripts/aplicar-migration-access-token.mjs
 *
 * Alternativa: cole o SQL de supabase/migrations/20260801_documents_access_token.sql
 * no SQL Editor do painel Supabase.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.join(__dirname, '../supabase/migrations/20260801_documents_access_token.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.DIRECT_URL

async function viaPg() {
  if (!dbUrl) return false
  let pg
  try {
    pg = await import('pg')
  } catch {
    console.log('Pacote pg não instalado — pulando conexão direta.')
    return false
  }
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
    console.log('OK: migration aplicada via Postgres direto.')
    return true
  } finally {
    await client.end()
  }
}

async function verificarColunas() {
  if (!url || !serviceKey) {
    console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    return false
  }
  const admin = createClient(url, serviceKey)
  // Tenta ler as colunas via select (PostgREST)
  const { error } = await admin.from('documents').select('id, access_token_hash, access_token').limit(1)
  if (!error) {
    console.log('OK: colunas access_token / access_token_hash já existem (verificado via API).')
    return true
  }
  console.error('Colunas ainda ausentes ou erro:', error.message)
  return false
}

const okPg = await viaPg().catch((e) => {
  console.error('Falha pg:', e.message)
  return false
})

if (!okPg) {
  console.log('\n--- SQL para colar no Supabase SQL Editor ---\n')
  console.log(sql)
  console.log('--- fim ---\n')
}

const ok = await verificarColunas()
process.exit(ok ? 0 : 1)
