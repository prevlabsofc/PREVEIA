/**
 * Validação e pré-preenchimento do cliente ao ir de Clientes → área de petição.
 * Não altera prompts/IA — só dados cadastrais e estado de erro amigável.
 */

export type ClientePeticaoCampos = {
  id?: string | null
  name?: string | null
  nome?: string | null
  cpf?: string | null
  rg?: string | null
  data_nascimento?: string | null
  birth_date?: string | null
  cep?: string | null
  rua?: string | null
  address?: string | null
  numero?: string | null
  bairro?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
}

export type ValidacaoClientePeticao = {
  /** false = bloqueia seleção (id inválido / sem nome ou CPF). */
  ok: boolean
  faltando: string[]
  mensagem: string | null
  /** Avisos não bloqueantes (ex.: endereço incompleto). */
  avisos: string[]
}

const ROTULOS: Record<string, string> = {
  nome: 'nome completo',
  cpf: 'CPF',
  data_nascimento: 'data de nascimento',
  endereco: 'endereço (rua/cidade)',
  notes: 'benefício pleiteado / motivo do indeferimento (Sobre o caso)',
}

/**
 * Nome + CPF são obrigatórios para abrir o fluxo.
 * Demais campos geram aviso amigável sem bloquear.
 */
export function validarClienteParaPeticao(
  cli: ClientePeticaoCampos | null | undefined,
): ValidacaoClientePeticao {
  if (!cli || !String(cli.id || '').trim()) {
    return {
      ok: false,
      faltando: ['cliente'],
      avisos: [],
      mensagem:
        'Cliente não encontrado ou sem permissão de acesso. Volte para Clientes e escolha outro cadastro.',
    }
  }

  const nome = String(cli.name || cli.nome || '').trim()
  const cpf = String(cli.cpf || '').replace(/\D/g, '')
  const nasc = String(cli.data_nascimento || cli.birth_date || '')
    .trim()
    .slice(0, 10)
  const rua = String(cli.rua || cli.address || '').trim()
  const cidade = String(cli.city || '').trim()
  const notes = String(cli.notes || '').trim()

  const faltandoBloqueio: string[] = []
  if (!nome) faltandoBloqueio.push('nome')
  if (cpf.length < 11) faltandoBloqueio.push('cpf')

  if (faltandoBloqueio.length > 0) {
    const lista = faltandoBloqueio.map((k) => ROTULOS[k] || k).join(', ')
    return {
      ok: false,
      faltando: faltandoBloqueio,
      avisos: [],
      mensagem: `Cadastro incompleto: falta ${lista}. Complete a ficha do cliente e tente novamente.`,
    }
  }

  const avisos: string[] = []
  if (!nasc) avisos.push(ROTULOS.data_nascimento)
  if (!rua && !cidade) avisos.push(ROTULOS.endereco)
  if (!notes) avisos.push(ROTULOS.notes)

  return {
    ok: true,
    faltando: [],
    avisos,
    mensagem:
      avisos.length > 0
        ? `Cliente selecionado. Complete na ficha se puder: ${avisos.join('; ')}.`
        : null,
  }
}

/** Extrai benefício/motivo livres a partir de notes para pré-preencher o form. */
export function extrairContextoDoCaso(notes: string | null | undefined): {
  contexto: string
  motivo_inss: string
} {
  const texto = String(notes || '').trim()
  if (!texto) return { contexto: '', motivo_inss: '' }
  const motivoMatch = texto.match(
    /(?:motivo|indefer(?:imento)?|negativa)[:\s—–-]+(.+)/i,
  )
  return {
    contexto: texto,
    motivo_inss: motivoMatch?.[1]?.trim().slice(0, 500) || '',
  }
}
