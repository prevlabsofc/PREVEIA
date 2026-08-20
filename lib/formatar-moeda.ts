/** Máscara de moeda BRL (R$ 0.000,00) usada em campos de valor monetário digitados. */

/** Extrai somente os dígitos de uma string, descartando "R$", ".", "," etc. */
function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/**
 * Interpreta os dígitos digitados/colados como centavos (os 2 últimos dígitos
 * são sempre os centavos), igual à máscara usada por apps bancários. Assim
 * colar "1234.56" ou "R$ 1.234,56" cai nos mesmos centavos (123456 -> 1234,56).
 */
export function digitosParaCentavos(valor: string): number {
  const digitos = apenasDigitos(valor)
  return digitos ? parseInt(digitos, 10) : 0
}

/** Centavos (inteiro) -> valor decimal limpo em reais, pronto para cálculos. */
export function centavosParaReais(centavos: number): number {
  return centavos / 100
}

/** Centavos (inteiro) -> "R$ 0.000,00". Retorna string vazia para 0/undefined. */
export function formatarCentavosBRL(centavos?: number | null): string {
  if (!centavos) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavosParaReais(centavos))
}

/** Reais (número limpo, ex: 1234.56) -> "R$ 0.000,00". Usado em exibições estáticas. */
export function formatarReaisBRL(reais?: number | null): string {
  if (!reais) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais)
}
