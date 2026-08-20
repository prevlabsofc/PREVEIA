'use client'

import { useCallback, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { STAGES } from '@/lib/client-stages'

export type Cliente = Record<string, any>

/**
 * Permissões vindas da camada de RBAC (Secretária/Estagiário vs. Advogado/Sócio).
 *
 * As visões nunca assumem acesso total: só é exibida a coluna cujo campo
 * realmente veio do servidor (ver `camposPresentes`), e só é editável o campo
 * que não estiver bloqueado aqui. Quando a página ainda não informa nada, o
 * padrão é permitir edição dos campos não sensíveis.
 */
export type PermissoesClientes = {
  podeEditar?: boolean
  camposBloqueados?: string[]
}

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type TipoCampo = 'texto' | 'email' | 'uf' | 'select'

export type CampoCliente = {
  key: string
  label: string
  tipo: TipoCampo
  /** Nunca editável inline e sempre renderizado de forma reduzida/mascarada. */
  sensivel?: boolean
  largura: number
  opcoes?: { value: string; label: string }[]
  validar?: (valor: string) => string | null
}

function validarEmail(valor: string): string | null {
  if (!valor.trim()) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim()) ? null : 'E-mail inválido'
}

export const CAMPOS_CLIENTE: CampoCliente[] = [
  {
    key: 'name',
    label: 'Nome',
    tipo: 'texto',
    largura: 220,
    validar: (v) =>
      !v.trim() ? 'Nome obrigatório' : v.trim().split(/\s+/).length < 2 ? 'Informe nome e sobrenome' : null,
  },
  { key: 'cpf', label: 'CPF', tipo: 'texto', sensivel: true, largura: 130 },
  { key: 'phone', label: 'Telefone', tipo: 'texto', largura: 140 },
  { key: 'whatsapp', label: 'WhatsApp', tipo: 'texto', largura: 140 },
  { key: 'email', label: 'E-mail', tipo: 'email', largura: 200, validar: validarEmail },
  { key: 'profession', label: 'Profissão', tipo: 'texto', largura: 150 },
  {
    key: 'zone',
    label: 'Zona',
    tipo: 'select',
    largura: 120,
    opcoes: [
      { value: 'rural', label: 'Rural' },
      { value: 'urban', label: 'Urbano' },
    ],
  },
  { key: 'city', label: 'Cidade', tipo: 'texto', largura: 150 },
  {
    key: 'state',
    label: 'UF',
    tipo: 'uf',
    largura: 70,
    validar: (v) => (!v.trim() || /^[A-Za-z]{2}$/.test(v.trim()) ? null : 'Use a sigla com 2 letras'),
  },
  {
    key: 'stage',
    label: 'Etapa do funil',
    tipo: 'select',
    largura: 210,
    opcoes: STAGES.map((s) => ({ value: s.id, label: s.label })),
  },
  {
    key: 'status',
    label: 'Situação',
    tipo: 'select',
    largura: 130,
    opcoes: [
      { value: 'active', label: 'Ativo' },
      { value: 'archived', label: 'Arquivado' },
    ],
  },
  { key: 'notes', label: 'Observações', tipo: 'texto', sensivel: true, largura: 220 },
]

/**
 * Campos que a consulta realmente devolveu. Se a camada de RBAC remover o CPF
 * ou as observações do `select`, a coluna simplesmente deixa de existir aqui.
 * A etapa é sempre considerada presente porque tem default no banco.
 */
export function camposPresentes(clients: Cliente[]): Set<string> {
  const presentes = new Set<string>(['stage'])
  for (const c of clients.slice(0, 30)) {
    for (const k of Object.keys(c ?? {})) presentes.add(k)
  }
  return presentes
}

export function colunasVisiveis(clients: Cliente[]): CampoCliente[] {
  const presentes = camposPresentes(clients)
  return CAMPOS_CLIENTE.filter((c) => presentes.has(c.key))
}

export function podeEditarCampo(campo: CampoCliente, permissoes?: PermissoesClientes): boolean {
  if (campo.sensivel) return false
  if (permissoes?.podeEditar === false) return false
  return !permissoes?.camposBloqueados?.includes(campo.key)
}

export function cpfMascarado(cpf?: string | null): string {
  if (!cpf) return '—'
  const n = String(cpf).replace(/\D/g, '')
  if (n.length !== 11) return String(cpf)
  return `${n.slice(0, 3)}.***.***-${n.slice(9, 11)}`
}

export function iniciais(nome?: string | null): string {
  const parts = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase()
}

/** Valor formatado para leitura, respeitando o mascaramento de campos sensíveis. */
export function valorExibicao(cliente: Cliente, campo: CampoCliente): string {
  const bruto = cliente[campo.key]
  if (campo.key === 'cpf') return cpfMascarado(bruto)
  if (bruto === null || bruto === undefined || bruto === '') return '—'
  if (campo.opcoes) return campo.opcoes.find((o) => o.value === bruto)?.label ?? String(bruto)
  return String(bruto)
}

export type Feedback = { tipo: 'sucesso' | 'erro'; texto: string } | null

export function useFeedback(): [Feedback, (tipo: 'sucesso' | 'erro', texto: string) => void] {
  const [feedback, setFeedback] = useState<Feedback>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrar = useCallback((tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setFeedback(null), tipo === 'erro' ? 6000 : 2500)
  }, [])

  return [feedback, mostrar]
}
