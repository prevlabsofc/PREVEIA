/**
 * Ponto único de montagem do HTML de petição.
 * Encaminha Salário-Maternidade Segurada Especial ao template Custódio.
 * Marcadores <<<TAG>>> nunca vazam: ou são parseados no template SM,
 * ou são removidos antes do gerador genérico.
 */

import {
  type DadosAdvogadoPeticao,
  type EstiloPeticao,
  montarHtmlPeticao as montarHtmlPeticaoGenerico,
} from '@/lib/peticao-export'
import {
  AGENT_SM_RURAL,
  isSmRuralStructured,
  montarHtmlSmRural,
  stripMarcadoresSm,
} from '@/lib/peticao-sm-rural'

export function montarHtmlPeticao(opts: {
  text: string
  adv: DadosAdvogadoPeticao
  estilo: EstiloPeticao
  corPeticao?: string
  comMargens?: boolean
  agentType?: string | null
}): string {
  const useSmRural =
    opts.agentType === AGENT_SM_RURAL || isSmRuralStructured(opts.text)
  if (useSmRural) {
    const dedicated = montarHtmlSmRural({
      text: opts.text,
      adv: opts.adv,
      comMargens: opts.comMargens,
      estilo: opts.estilo,
    })
    if (dedicated) return dedicated
  }
  return montarHtmlPeticaoGenerico({
    ...opts,
    text: stripMarcadoresSm(opts.text),
  })
}
