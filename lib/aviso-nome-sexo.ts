/**
 * Aviso não bloqueante: primeiro nome comum BR vs sexo selecionado.
 * Nunca impede cadastro/geração — só alerta o usuário.
 */

const NOMES_FEMININOS = new Set(
  [
    'fernanda',
    'maria',
    'ana',
    'juliana',
    'patricia',
    'patricia',
    'francisca',
    'antonia',
    'adriana',
    'juliana',
    'marcia',
    'fernanda',
    'sandra',
    'camila',
    'amanda',
    'bruna',
    'jessica',
    'larissa',
    'leticia',
    'gabriela',
    'beatriz',
    'carolina',
    'rafaela',
    'vanessa',
    'daniela',
    'alessandra',
    'luciana',
    'renata',
    'simone',
    'claudia',
    'cristina',
    'isabela',
    'isabella',
    'mariana',
    'paula',
    'tatiane',
    'tatiana',
    'viviane',
    'elaine',
    'rosangela',
    'aparecida',
    'conceicao',
    'fatima',
    'lucia',
    'luciana',
    'sonia',
    'silvia',
    'vera',
    'rosa',
    'helena',
    'luiza',
    'luisa',
    'sofia',
    'alice',
    'laura',
    'manuela',
    'valentina',
    'heloisa',
    'heloiza',
    'giovanna',
    'yasmin',
    'yasmim',
    'eduarda',
    'bianca',
    'natalia',
    'nicole',
    'priscila',
    'debora',
    'eliane',
    'regina',
    'solange',
    'neusa',
    'neuza',
    'ivone',
    'ivonete',
    'josefa',
    'terezinha',
    'tereza',
    'teresa',
  ].map((n) => n.normalize('NFD').replace(/\p{M}/gu, '')),
)

const NOMES_MASCULINOS = new Set(
  [
    'joao',
    'jose',
    'antonio',
    'francisco',
    'carlos',
    'paulo',
    'pedro',
    'lucas',
    'luiz',
    'luis',
    'marcos',
    'luis',
    'gabriel',
    'rafael',
    'daniel',
    'marcelo',
    'bruno',
    'eduardo',
    'felipe',
    'andre',
    'fernando',
    'roberto',
    'ricardo',
    'rodolfo',
    'rodrigo',
    'gustavo',
    'leonardo',
    'thiago',
    'tiago',
    'mateus',
    'matheus',
    'vinicius',
    'vitor',
    'victor',
    'diego',
    'alexandre',
    'anderson',
    'fabio',
    'leandro',
    'mauricio',
    'sergio',
    'jorge',
    'miguel',
    'arthur',
    'artur',
    'heitor',
    'bernardo',
    'davi',
    'david',
    'samuel',
    'enzo',
    'nicolas',
    'guilherme',
    'henrique',
    'igor',
    'caio',
    'renan',
    'wesley',
    'wellington',
    'wellington',
    'jefferson',
    'jackson',
    'everton',
    'adriano',
    'claudio',
    'celso',
    'sebastiao',
    'manuel',
    'manoel',
    'nelson',
    'wilson',
    'wagner',
    'waldir',
    'valdir',
    'osvaldo',
    'oswaldo',
  ].map((n) => n.normalize('NFD').replace(/\p{M}/gu, '')),
)

const MSG =
  'Confirme o sexo: o nome informado costuma ser usado no gênero oposto.'

function normalizarPrimeiroNome(nomeCompleto: string): string {
  const primeiro = String(nomeCompleto || '')
    .trim()
    .split(/\s+/)[0] || ''
  return primeiro
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function normalizarSexo(sexo: string): 'masculino' | 'feminino' | '' {
  const s = String(sexo || '').trim().toLowerCase()
  if (s === 'masculino' || s === 'm' || s === 'male' || s === 'homem') return 'masculino'
  if (s === 'feminino' || s === 'f' || s === 'female' || s === 'mulher') return 'feminino'
  return ''
}

/** Retorna mensagem de aviso ou null se não houver inconsistência. */
export function avisoNomeSexoIncompativel(
  nomeCompleto: string,
  sexoRaw: string,
): string | null {
  const sexo = normalizarSexo(sexoRaw)
  const primeiro = normalizarPrimeiroNome(nomeCompleto)
  if (!sexo || !primeiro) return null

  if (sexo === 'masculino' && NOMES_FEMININOS.has(primeiro)) return MSG
  if (sexo === 'feminino' && NOMES_MASCULINOS.has(primeiro)) return MSG
  return null
}
