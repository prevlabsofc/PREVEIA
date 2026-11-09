/**
 * Mensagens amigáveis para erros do Supabase Auth.
 * Distingue falha de rede (sem resposta HTTP) de credenciais inválidas.
 */

export type AuthErrorContext = 'login' | 'registro' | 'recuperar' | 'redefinir'

export type AuthErrorLike = {
  message?: string
  code?: string
  status?: number
  name?: string
} | null | undefined

export const MSG_REDE =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'

export const MSG_CREDENCIAIS =
  'Email ou senha incorretos. Verifique e tente novamente.'

const MSG_GENERICA: Record<AuthErrorContext, string> = {
  login: 'Não foi possível entrar. Tente novamente.',
  registro: 'Não foi possível criar a conta. Tente novamente.',
  recuperar: 'Não foi possível enviar o email de recuperação. Tente novamente.',
  redefinir: 'Não foi possível redefinir a senha. Tente novamente.',
}

/** Erro sem resposta HTTP útil (rede, DNS, timeout, CORS) ou fetch retryable do Auth. */
export function isErroRede(error: AuthErrorLike): boolean {
  if (!error) return false

  const name = (error.name || '').toLowerCase()
  const code = (error.code || '').toLowerCase()
  const msg = (error.message || '').toLowerCase()
  const status = error.status

  if (name === 'authretryablefetcherror') return true
  if (name === 'typeerror' && /fetch|network/i.test(msg)) return true

  // status 0 = fetch falhou antes de resposta HTTP
  if (status === 0) return true

  if (
    /failed to fetch|networkerror|network request failed|load failed|err_address_unreachable|err_connection|err_name_not_resolved|err_internet_disconnected|fetch failed|timeout|timed out|econnrefused|enotfound/i.test(
      msg,
    )
  ) {
    return true
  }

  // Sem status/código HTTP e mensagem tipicamente de rede
  if ((status === undefined || status === null) && !code && /network|unreachable|offline/i.test(msg)) {
    return true
  }

  return false
}

/** Credenciais inválidas confirmadas pelo servidor (GoTrue). */
export function isErroCredenciais(error: AuthErrorLike): boolean {
  if (!error || isErroRede(error)) return false

  const code = (error.code || '').toLowerCase()
  const msg = (error.message || '').toLowerCase()
  const status = error.status

  if (code === 'invalid_credentials') return true
  if (/invalid login credentials/i.test(msg)) return true
  if (
    status === 400 &&
    (/invalid.*(email|password|credentials)|email.*password|wrong password|incorrect.*(email|password)|invalid_grant/i.test(
      msg,
    ) ||
      code === 'invalid_grant')
  ) {
    return true
  }

  return false
}

/**
 * Converte erro do Supabase Auth em mensagem em português.
 * Rede → conexão; credenciais (login) → mensagem específica; demais → contexto.
 */
export function mensagemErroAuth(
  error: AuthErrorLike,
  context: AuthErrorContext = 'login',
): string {
  if (isErroRede(error)) return MSG_REDE

  if (context === 'login' && isErroCredenciais(error)) return MSG_CREDENCIAIS

  const raw = error?.message?.trim()
  if (raw) {
    const traduzida = traduzirMensagemAuth(raw)
    if (traduzida) return traduzida
  }

  return MSG_GENERICA[context]
}

function traduzirMensagemAuth(message: string): string | null {
  const m = message.toLowerCase()

  if (/user already registered|already been registered|email.*already/i.test(m)) {
    return 'Este email já está cadastrado. Faça login ou recupere a senha.'
  }
  if (/email not confirmed|email_not_confirmed/i.test(m)) {
    return 'Confirme seu email antes de entrar. Verifique sua caixa de entrada.'
  }
  if (/password.*weak|weak_password|at least \d/i.test(m)) {
    return 'A senha é muito fraca. Use no mínimo 8 caracteres.'
  }
  if (/same password|should be different/i.test(m)) {
    return 'A nova senha deve ser diferente da atual.'
  }
  if (/session|expired|invalid.*(token|link)|otp/i.test(m)) {
    return 'Link inválido ou expirado. Solicite um novo link de recuperação.'
  }
  if (/rate limit|too many|over_email/i.test(m)) {
    return 'Muitas tentativas. Aguarde um momento e tente novamente.'
  }
  if (/invalid login credentials/i.test(m)) {
    return MSG_CREDENCIAIS
  }

  // Mensagem já útil e não técnica de rede: repassa (ex.: português do app / GoTrue)
  if (!/failed to fetch|networkerror|err_/i.test(m)) {
    return message
  }

  return null
}
