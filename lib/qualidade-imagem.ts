/**
 * Análise client-side de qualidade de imagem (canvas, sem libs pesadas).
 *
 * Limiares (sensíveis o bastante para flagar scans ruins, sem bloquear fotos
 * de celular aceitáveis de documentos INSS):
 *
 * - Resolução: lado menor ≥ 800px E área ≥ 1 MP (≈1280×800).
 *   800px no eixo curto é o mínimo em que texto de RG/CTPS ainda costuma
 *   ser legível; 1 MP evita fotos “grandes” só em um eixo.
 * - Brilho (média de luminância 0–255): fora de [40, 220] = escuro/estourado.
 * - Contraste (desvio-padrão da luminância): < 25 = imagem “lavada”/plana.
 * - Nitidez (variância do Laplaciano em canvas ≤256px): < 80 = desfoque
 *   evidente. Heurística barata; falsos positivos possíveis em fundos lisos.
 *
 * Arquivos não-imagem devem pular este módulo por completo.
 */

export const LIMIARES_QUALIDADE = {
  minLadoMenor: 800,
  minPixels: 1_000_000,
  brilhoMin: 40,
  brilhoMax: 220,
  contrasteMin: 25,
  /** Variância do Laplaciano no canvas reduzido (≤256px no lado maior). */
  nitidezMin: 80,
  /** Lado máximo do canvas usado na análise de nitidez/estatísticas. */
  maxLadoAnalise: 256,
} as const

export type ProblemaQualidade =
  | 'resolucao'
  | 'escuro'
  | 'claro'
  | 'contraste'
  | 'desfoque'

export type ResultadoQualidade = {
  ok: boolean
  width: number
  height: number
  brilho: number
  contraste: number
  nitidez: number
  problemas: ProblemaQualidade[]
}

const MIME_IMAGEM = /^image\/(jpeg|jpg|png|webp|gif|bmp|heic|heif)$/i

export function ehArquivoImagem(file: File): boolean {
  if (file.type && MIME_IMAGEM.test(file.type)) return true
  // Alguns browsers deixam type vazio; fallback pela extensão.
  return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name)
}

const ROTULOS: Record<ProblemaQualidade, string> = {
  resolucao: 'resolução baixa',
  escuro: 'imagem muito escura',
  claro: 'imagem muito clara / estourada',
  contraste: 'contraste insuficiente',
  desfoque: 'possível desfoque',
}

export function descreverProblemas(problemas: ProblemaQualidade[]): string {
  if (problemas.length === 0) return ''
  return problemas.map((p) => ROTULOS[p]).join(', ')
}

function luminancia(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('falha_ao_carregar_imagem'))
    }
    img.src = url
  })
}

/**
 * Variância do Laplaciano 3×3 em luminância (heurística de nitidez).
 * Roda só no canvas já reduzido — custo O(n) aceitável no cliente.
 */
function varianciaLaplaciano(data: Uint8ClampedArray, w: number, h: number): number {
  const gray = new Float32Array(w * h)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = luminancia(data[i], data[i + 1], data[i + 2])
  }

  let soma = 0
  let somaSq = 0
  let n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const lap =
        -gray[i - w] - gray[i - 1] + 4 * gray[i] - gray[i + 1] - gray[i + w]
      soma += lap
      somaSq += lap * lap
      n++
    }
  }
  if (n === 0) return 0
  const media = soma / n
  return somaSq / n - media * media
}

export async function analisarQualidadeImagem(file: File): Promise<ResultadoQualidade> {
  const img = await carregarImagem(file)
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height

  const max = LIMIARES_QUALIDADE.maxLadoAnalise
  const escala = Math.min(1, max / Math.max(width, height, 1))
  const cw = Math.max(1, Math.round(width * escala))
  const ch = Math.max(1, Math.round(height * escala))

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return {
      ok: false,
      width,
      height,
      brilho: 0,
      contraste: 0,
      nitidez: 0,
      problemas: ['resolucao'],
    }
  }

  ctx.drawImage(img, 0, 0, cw, ch)
  const { data } = ctx.getImageData(0, 0, cw, ch)

  let soma = 0
  let somaSq = 0
  const pixels = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    const y = luminancia(data[i], data[i + 1], data[i + 2])
    soma += y
    somaSq += y * y
  }
  const brilho = soma / pixels
  const contraste = Math.sqrt(Math.max(0, somaSq / pixels - brilho * brilho))
  const nitidez = varianciaLaplaciano(data, cw, ch)

  const problemas: ProblemaQualidade[] = []
  const ladoMenor = Math.min(width, height)
  if (
    ladoMenor < LIMIARES_QUALIDADE.minLadoMenor ||
    width * height < LIMIARES_QUALIDADE.minPixels
  ) {
    problemas.push('resolucao')
  }
  if (brilho < LIMIARES_QUALIDADE.brilhoMin) problemas.push('escuro')
  if (brilho > LIMIARES_QUALIDADE.brilhoMax) problemas.push('claro')
  if (contraste < LIMIARES_QUALIDADE.contrasteMin) problemas.push('contraste')
  if (nitidez < LIMIARES_QUALIDADE.nitidezMin) problemas.push('desfoque')

  return {
    ok: problemas.length === 0,
    width,
    height,
    brilho: Math.round(brilho * 10) / 10,
    contraste: Math.round(contraste * 10) / 10,
    nitidez: Math.round(nitidez * 10) / 10,
    problemas,
  }
}
