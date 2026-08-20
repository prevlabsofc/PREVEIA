// Padrão pragmático: cobre os erros reais de digitação (espaço, @ duplicado,
// domínio sem TLD) sem tentar reimplementar a RFC 5322.
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

const TAMANHO_MAXIMO = 254

export interface ResultadoEmail {
  valido: boolean
  email: string
  erro: string | null
}

export function normalizarEmail(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : ''
}

export function validarEmail(valor: unknown): ResultadoEmail {
  const email = normalizarEmail(valor)

  if (!email) return { valido: false, email, erro: 'Informe um e-mail' }
  if (email.length > TAMANHO_MAXIMO || !EMAIL_REGEX.test(email)) {
    return { valido: false, email, erro: 'Digite um e-mail válido' }
  }

  return { valido: true, email, erro: null }
}
