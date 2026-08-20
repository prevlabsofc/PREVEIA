import { createHash, randomBytes, randomUUID } from 'crypto'

/** Token opaco 32 bytes → 64 hex (mesmo formato do aceite de cliente). */
export function gerarTokenDocumento(): string {
  return randomBytes(32).toString('hex')
}

export function hashTokenDocumento(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

const TOKEN_HEX = /^[a-f0-9]{64}$/i

export function tokenDocumentoValido(token: string): boolean {
  return TOKEN_HEX.test(token)
}

/** Domínio canônico dos links públicos de documento. */
export const DOCUMENTO_PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://marple.com.br'
).replace(/\/$/, '')

/**
 * URL pública no formato https://marple.com.br/documento/[token].
 * Em localhost ainda gera o domínio de produção para o link “copia e cola”.
 */
export function urlPublicaDocumento(token: string, _origin?: string): string {
  const base = DOCUMENTO_PUBLIC_BASE.includes('localhost')
    ? 'https://marple.com.br'
    : DOCUMENTO_PUBLIC_BASE || 'https://marple.com.br'
  return `${base}/documento/${token}`
}

export function novoAccessTokenUuid(): string {
  return randomUUID()
}
