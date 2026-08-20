/**
 * Fonte única das etapas do funil de atendimento do cliente.
 *
 * Coluna canônica no banco: `clients.stage` (migrações
 * `supabase/migrations/20260727_clients_stage_funil.sql` e
 * `supabase/migrations/20260727_clients_stage_funil_vocabulario.sql`).
 *
 * Não confundir com `clients.status`, que já existia antes e representa o
 * ciclo de vida do cadastro ('active' | 'archived'). Kanban, tabela e as
 * métricas de CRM devem todos ler daqui para não divergirem.
 *
 * Etapas finais (`concluido`, `protocolado`) disparam auto-arquivamento
 * (`status='archived'` + `status_final`) — ver `lib/client-archive.ts`.
 *
 * Vocabulário anterior (provisório CRM) foi mapeado 1:1 por posição:
 *   novo_lead              → atendimento_triagem
 *   em_analise             → organizacao_qualificacao
 *   documentacao_pendente  → redacao_peticao
 *   em_andamento           → conferencia_revisao_final
 *   concluido              → concluido
 */

export const STAGE_IDS = [
  'atendimento_triagem',
  'organizacao_qualificacao',
  'redacao_peticao',
  'conferencia_revisao_final',
  'concluido',
  'protocolado',
] as const

export type ClientStage = (typeof STAGE_IDS)[number]

/** Etapas que encerram o caso e arquivam o cliente. */
export const FINAL_STAGE_IDS = ['concluido', 'protocolado'] as const
export type FinalStage = (typeof FINAL_STAGE_IDS)[number]

export const DEFAULT_STAGE: ClientStage = 'atendimento_triagem'

/** IDs provisórios do CRM Kanban, ainda aceitos na leitura até a migração. */
const LEGACY_STAGE_MAP: Record<string, ClientStage> = {
  novo_lead: 'atendimento_triagem',
  em_analise: 'organizacao_qualificacao',
  documentacao_pendente: 'redacao_peticao',
  em_andamento: 'conferencia_revisao_final',
  concluido: 'concluido',
}

export type StageMeta = {
  id: ClientStage
  label: string
  /** Cor base em RGB, para montar fundos/bordas translúcidos. */
  rgb: string
  color: string
}

export const STAGES: StageMeta[] = [
  {
    id: 'atendimento_triagem',
    label: 'Atendimento/Triagem',
    rgb: '59,130,246',
    color: '#3B82F6',
  },
  {
    id: 'organizacao_qualificacao',
    label: 'Organização/Qualificação',
    rgb: '168,85,247',
    color: '#A855F7',
  },
  {
    id: 'redacao_peticao',
    label: 'Redação/Petição',
    rgb: '245,158,11',
    color: '#F59E0B',
  },
  {
    id: 'conferencia_revisao_final',
    label: 'Conferência/Revisão Final',
    rgb: '212,175,55',
    color: '#D4AF37',
  },
  {
    id: 'concluido',
    label: 'Concluído',
    rgb: '34,197,94',
    color: '#22C55E',
  },
  {
    id: 'protocolado',
    label: 'Protocolado',
    rgb: '16,185,129',
    color: '#10B981',
  },
]

const STAGE_BY_ID = new Map<string, StageMeta>(STAGES.map((s) => [s.id, s]))

export function isClientStage(value: unknown): value is ClientStage {
  return typeof value === 'string' && STAGE_BY_ID.has(value)
}

export function isFinalStage(value: unknown): value is FinalStage {
  if (typeof value !== 'string') return false
  return (FINAL_STAGE_IDS as readonly string[]).includes(value)
}

/** Normaliza qualquer valor vindo do banco para uma etapa válida. */
export function normalizeStage(value: unknown): ClientStage {
  if (typeof value !== 'string') return DEFAULT_STAGE
  if (isClientStage(value)) return value
  return LEGACY_STAGE_MAP[value] ?? DEFAULT_STAGE
}

export function getStageMeta(value: unknown): StageMeta {
  return STAGE_BY_ID.get(normalizeStage(value))!
}

export function stageLabel(value: unknown): string {
  return getStageMeta(value).label
}

/** Índice da etapa na ordem do funil — usado pela navegação por teclado. */
export function stageIndex(value: unknown): number {
  return STAGE_IDS.indexOf(normalizeStage(value))
}
