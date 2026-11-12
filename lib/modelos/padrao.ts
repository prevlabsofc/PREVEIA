/**
 * Modelos padrão do sistema — metadados + ponte para conteúdos editáveis.
 *
 * O texto jurídico fica em lib/modelos/conteudos/* — substitua lá quando
 * o Fernando enviar os modelos oficiais. Este arquivo não deve receber
 * o corpo longo das peças.
 */

import type { ModeloPadrao } from './tipos'
import {
  CONTEUDO_PETICAO_SM_RURAL,
  CONTEUDO_CONTRATO_SERVICOS,
  CONTEUDO_CONTRATO_HONORARIOS,
} from './conteudos'

/** Incrementar ao trocar o conteúdo oficial dos padrões. */
const VERSAO = 2

export const MODELOS_PADRAO: ModeloPadrao[] = [
  {
    id: 'peticao-sm-rural',
    tipo: 'peticao',
    nome: 'Petição de salário-maternidade rural',
    descricao:
      'Modelo padrão de petição inicial de salário-maternidade rural com variáveis dinâmicas. Conteúdo-base editável (aguardando texto do Fernando).',
    versao: VERSAO,
    conteudo: CONTEUDO_PETICAO_SM_RURAL,
  },
  {
    id: 'contrato-prestacao-servicos',
    tipo: 'contrato_servicos',
    nome: 'Contrato de prestação de serviços advocatícios',
    descricao:
      'Modelo padrão de contrato de prestação de serviços. Conteúdo-base editável (aguardando texto do Fernando).',
    versao: VERSAO,
    conteudo: CONTEUDO_CONTRATO_SERVICOS,
  },
  {
    id: 'contrato-honorarios',
    tipo: 'contrato_honorarios',
    nome: 'Contrato de honorários',
    descricao:
      'Modelo padrão de contrato de honorários. Conteúdo-base editável (aguardando texto do Fernando).',
    versao: VERSAO,
    conteudo: CONTEUDO_CONTRATO_HONORARIOS,
  },
]

export function getModeloPadrao(id: string): ModeloPadrao | undefined {
  return MODELOS_PADRAO.find((m) => m.id === id)
}

export function getModelosPadraoPorTipo(tipo: string): ModeloPadrao[] {
  return MODELOS_PADRAO.filter((m) => m.tipo === tipo)
}
