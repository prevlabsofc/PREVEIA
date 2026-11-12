/**
 * Catálogo de variáveis dinâmicas dos modelos de documento.
 * Formato padronizado: {{nome_variavel}} (snake_case).
 *
 * Para expandir: adicione um item em VARIATEIS_MODELO e, se for campo
 * automático do cliente/advogado, mapeie em `montarMapaVariaveis`.
 */

import type { TipoModeloDocumento } from './tipos'

export type GrupoVariavel =
  | 'cliente'
  | 'advogado'
  | 'contrato'
  | 'processo'
  | 'sistema'

export interface VariavelModelo {
  /** Chave sem chaves — ex.: nome_cliente → {{nome_cliente}} */
  chave: string
  rotulo: string
  descricao: string
  grupo: GrupoVariavel
  /** Tipos de modelo em que a variável aparece no dropdown (vazio = todos). */
  tipos?: TipoModeloDocumento[]
  /** Se true, costuma ser pedida ao advogado antes de gerar (não vem do cadastro). */
  campoExtra?: boolean
}

export const VARIATEIS_MODELO: VariavelModelo[] = [
  // —— Cliente (mínimos da spec + aliases úteis) ——
  { chave: 'nome_cliente', rotulo: 'Nome do cliente', descricao: 'Nome completo do cliente', grupo: 'cliente' },
  { chave: 'cpf_cliente', rotulo: 'CPF do cliente', descricao: 'CPF do cliente', grupo: 'cliente' },
  { chave: 'rg_cliente', rotulo: 'RG do cliente', descricao: 'RG do cliente', grupo: 'cliente', tipos: ['peticao', 'contrato_servicos'] },
  { chave: 'endereco_cliente', rotulo: 'Endereço do cliente', descricao: 'Endereço completo do cliente', grupo: 'cliente' },
  { chave: 'data_nascimento', rotulo: 'Data de nascimento', descricao: 'Data de nascimento formatada', grupo: 'cliente', tipos: ['peticao'] },
  { chave: 'data_parto', rotulo: 'Data do parto', descricao: 'Data do parto / nascimento da criança', grupo: 'cliente', tipos: ['peticao'], campoExtra: true },
  { chave: 'cpf', rotulo: 'CPF (alias)', descricao: 'Alias de cpf_cliente — compatibilidade', grupo: 'cliente' },
  { chave: 'rg', rotulo: 'RG (alias)', descricao: 'Alias de rg_cliente — compatibilidade', grupo: 'cliente' },
  { chave: 'endereco', rotulo: 'Endereço (alias)', descricao: 'Alias de endereco_cliente', grupo: 'cliente' },
  { chave: 'endereco_completo', rotulo: 'Endereço completo (alias)', descricao: 'Alias de endereco_cliente', grupo: 'cliente' },
  { chave: 'estado_civil', rotulo: 'Estado civil', descricao: 'Estado civil do cliente', grupo: 'cliente', campoExtra: true },
  { chave: 'profissao', rotulo: 'Profissão', descricao: 'Profissão / atividade', grupo: 'cliente' },
  { chave: 'sexo', rotulo: 'Sexo', descricao: 'Sexo da parte autora', grupo: 'cliente', tipos: ['peticao'] },
  { chave: 'nacionalidade', rotulo: 'Nacionalidade', descricao: 'Nacionalidade (padrão: brasileira)', grupo: 'cliente', campoExtra: true },
  { chave: 'telefone', rotulo: 'Telefone', descricao: 'Telefone do cliente', grupo: 'cliente' },
  { chave: 'whatsapp', rotulo: 'WhatsApp', descricao: 'WhatsApp do cliente', grupo: 'cliente' },
  { chave: 'email_cliente', rotulo: 'E-mail do cliente', descricao: 'E-mail do cliente', grupo: 'cliente' },
  { chave: 'cep', rotulo: 'CEP', descricao: 'CEP do cliente', grupo: 'cliente' },
  { chave: 'cidade', rotulo: 'Cidade', descricao: 'Cidade do cliente', grupo: 'cliente' },
  { chave: 'estado', rotulo: 'UF', descricao: 'Estado (UF) do cliente', grupo: 'cliente' },

  // —— Advogado / escritório ——
  { chave: 'nome_advogado', rotulo: 'Nome do advogado', descricao: 'Nome do advogado responsável', grupo: 'advogado' },
  { chave: 'oab', rotulo: 'OAB', descricao: 'Número e UF da OAB', grupo: 'advogado' },
  { chave: 'oab_numero', rotulo: 'Nº OAB', descricao: 'Somente o número da OAB', grupo: 'advogado' },
  { chave: 'oab_uf', rotulo: 'UF OAB', descricao: 'UF da inscrição na OAB', grupo: 'advogado' },
  { chave: 'nome_escritorio', rotulo: 'Nome do escritório', descricao: 'Razão / nome do escritório', grupo: 'advogado' },
  { chave: 'email_advogado', rotulo: 'E-mail do advogado', descricao: 'E-mail profissional', grupo: 'advogado' },
  { chave: 'telefone_advogado', rotulo: 'Telefone do advogado', descricao: 'Telefone / WhatsApp do escritório', grupo: 'advogado' },

  // —— Petição / processo ——
  { chave: 'beneficio', rotulo: 'Benefício', descricao: 'Benefício previdenciário pedido', grupo: 'processo', tipos: ['peticao'], campoExtra: true },
  { chave: 'motivo_indeferimento', rotulo: 'Motivo do indeferimento', descricao: 'Motivo do indeferimento no INSS', grupo: 'processo', tipos: ['peticao'], campoExtra: true },
  { chave: 'valor_causa', rotulo: 'Valor da causa', descricao: 'Valor estimado da causa', grupo: 'processo', tipos: ['peticao', 'contrato_honorarios'], campoExtra: true },
  { chave: 'comarca', rotulo: 'Comarca / subseção', descricao: 'Comarca ou subseção judiciária', grupo: 'processo', campoExtra: true },
  { chave: 'tipo_acao', rotulo: 'Tipo de ação', descricao: 'Alias de beneficio', grupo: 'contrato', campoExtra: true },
  { chave: 'numero_processo', rotulo: 'Nº do processo', descricao: 'Número do processo judicial', grupo: 'processo', campoExtra: true },
  { chave: 'tribunal', rotulo: 'Tribunal', descricao: 'Tribunal / juízo', grupo: 'processo', campoExtra: true },
  { chave: 'vara', rotulo: 'Vara', descricao: 'Vara / unidade judiciária', grupo: 'processo', campoExtra: true },

  // —— Contrato / honorários ——
  { chave: 'objeto_contrato', rotulo: 'Objeto do contrato', descricao: 'Objeto / escopo dos serviços', grupo: 'contrato', tipos: ['contrato_servicos'], campoExtra: true },
  { chave: 'descricao_servico', rotulo: 'Descrição dos serviços', descricao: 'Alias de objeto_contrato', grupo: 'contrato', campoExtra: true },
  { chave: 'data_contrato', rotulo: 'Data do contrato', descricao: 'Data de assinatura do contrato', grupo: 'contrato', tipos: ['contrato_servicos', 'contrato_honorarios'], campoExtra: true },
  { chave: 'valor_honorarios', rotulo: 'Valor dos honorários', descricao: 'Valor fixo ou estimado', grupo: 'contrato', tipos: ['contrato_honorarios', 'contrato_servicos'], campoExtra: true },
  { chave: 'percentual_exito', rotulo: 'Percentual de êxito', descricao: 'Percentual sobre o êxito / condenação', grupo: 'contrato', tipos: ['contrato_honorarios', 'contrato_servicos'], campoExtra: true },
  { chave: 'forma_pagamento', rotulo: 'Forma de pagamento', descricao: 'Como os honorários serão pagos', grupo: 'contrato', tipos: ['contrato_honorarios'], campoExtra: true },
  { chave: 'valor_fixo', rotulo: 'Valor fixo', descricao: 'Honorários em valor fixo', grupo: 'contrato', campoExtra: true },
  { chave: 'tipo_honorario', rotulo: 'Tipo de honorário', descricao: 'Percentual, fixo ou misto', grupo: 'contrato', campoExtra: true },
  { chave: 'prazo', rotulo: 'Prazo', descricao: 'Prazo estimado (meses ou texto)', grupo: 'contrato', campoExtra: true },
  { chave: 'observacoes', rotulo: 'Observações', descricao: 'Cláusulas / observações adicionais', grupo: 'contrato', campoExtra: true },
  { chave: 'clausula_honorarios', rotulo: 'Cláusula de honorários', descricao: 'Texto pronto da cláusula de honorários', grupo: 'contrato', campoExtra: true },

  // —— Sistema ——
  { chave: 'data_hoje', rotulo: 'Data de hoje', descricao: 'Data atual por extenso', grupo: 'sistema' },
  { chave: 'data_curta', rotulo: 'Data curta', descricao: 'Data atual dd/mm/aaaa', grupo: 'sistema' },
  { chave: 'cidade_foro', rotulo: 'Cidade do foro', descricao: 'Alias de comarca / local de assinatura', grupo: 'sistema', campoExtra: true },
]

/** Chaves mínimas exigidas por tipo (documentação / validação de modelos padrão). */
export const VARIAVEIS_MINIMAS_POR_TIPO: Record<TipoModeloDocumento, string[]> = {
  peticao: [
    'nome_cliente',
    'cpf_cliente',
    'rg_cliente',
    'endereco_cliente',
    'data_nascimento',
    'data_parto',
    'beneficio',
    'motivo_indeferimento',
    'valor_causa',
    'comarca',
  ],
  contrato_servicos: [
    'nome_cliente',
    'cpf_cliente',
    'endereco_cliente',
    'nome_advogado',
    'oab',
    'objeto_contrato',
    'data_contrato',
  ],
  contrato_honorarios: [
    'nome_cliente',
    'cpf_cliente',
    'valor_honorarios',
    'percentual_exito',
    'forma_pagamento',
    'prazo',
  ],
}

export const REGEX_VARIAVEL = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi

export function tokenVariavel(chave: string): string {
  return `{{${chave}}}`
}

export function variavelPorChave(chave: string): VariavelModelo | undefined {
  return VARIATEIS_MODELO.find((v) => v.chave === chave)
}

export function variaveisPorGrupo(grupo: GrupoVariavel): VariavelModelo[] {
  return VARIATEIS_MODELO.filter((v) => v.grupo === grupo)
}

export function variaveisCampoExtra(): VariavelModelo[] {
  return VARIATEIS_MODELO.filter((v) => v.campoExtra)
}

/** Variáveis disponíveis no dropdown para um tipo de documento. */
export function variaveisParaTipo(tipo?: TipoModeloDocumento | null): VariavelModelo[] {
  if (!tipo) return VARIATEIS_MODELO
  return VARIATEIS_MODELO.filter((v) => !v.tipos || v.tipos.includes(tipo))
}

/** Extrai chaves únicas usadas em um texto de modelo. */
export function extrairVariaveisDoTexto(texto: string): string[] {
  const found = new Set<string>()
  const re = new RegExp(REGEX_VARIAVEL.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    found.add(m[1].toLowerCase())
  }
  return Array.from(found)
}

/** Retorna chaves usadas no texto que NÃO existem no catálogo. */
export function variaveisDesconhecidas(texto: string): string[] {
  const conhecidas = new Set(VARIATEIS_MODELO.map((v) => v.chave))
  return extrairVariaveisDoTexto(texto).filter((k) => !conhecidas.has(k))
}

export const ROTULO_GRUPO: Record<GrupoVariavel, string> = {
  cliente: 'Cliente',
  advogado: 'Advogado / Escritório',
  contrato: 'Contrato / Honorários',
  processo: 'Processo',
  sistema: 'Sistema',
}
