import { isClientStage } from "@/lib/client-stages";
import { mascararCpf, rotuloCargo, type Cargo } from "./cargos";

/**
 * Classificação dos campos de `clients`.
 *
 * BÁSICO   — necessário para atendimento: contato, endereço, situação.
 * SENSÍVEL — identificação completa e histórico livre do caso. Nunca sai do
 *            servidor para cargo restrito, nem mesmo parcialmente, exceto o CPF
 *            que sai mascarado.
 *
 * Peças judiciais (`documents`) e dados financeiros ficam fora desta lista
 * porque são bloqueados por inteiro, não por campo.
 */
export const CAMPOS_BASICOS = [
  "id",
  "lawyer_id",
  "name",
  "phone",
  "whatsapp",
  "email",
  "cep",
  "address",
  "city",
  "state",
  "zone",
  "profession",
  "status",
  "status_contato",
  "stage",
  "status_final",
  /** Operacional — checklist INSS (não sensível). */
  "tipo_beneficio",
  "created_at",
] as const;

export const CAMPOS_SENSIVEIS = ["cpf", "rg", "birth_date", "notes"] as const;

/** Campos que um cargo restrito pode gravar. */
export const CAMPOS_EDITAVEIS_BASICO = [
  "phone",
  "whatsapp",
  "email",
  "cep",
  "address",
  "city",
  "state",
  "status_contato",
  "stage",
] as const;

/** Campos que um cargo com acesso total pode gravar. */
export const CAMPOS_EDITAVEIS_TOTAL = [
  ...CAMPOS_EDITAVEIS_BASICO,
  "name",
  "cpf",
  "rg",
  "birth_date",
  "profession",
  "zone",
  "notes",
  "status",
  "tipo_beneficio",
] as const;

export const STATUS_CONTATO = [
  { valor: "nao_contatado", rotulo: "Não contatado", cor: "#888888" },
  { valor: "aguardando_retorno", rotulo: "Aguardando retorno", cor: "#F59E0B" },
  { valor: "contatado", rotulo: "Contatado", cor: "#3B82F6" },
  { valor: "documentos_pendentes", rotulo: "Documentos pendentes", cor: "#EF4444" },
  { valor: "em_dia", rotulo: "Em dia", cor: "#22C55E" },
] as const;

export const STATUS_CONTATO_VALORES = STATUS_CONTATO.map((s) => s.valor) as readonly string[];

export type ClienteVisivel = {
  id: string;
  lawyer_id: string | null;
  name: string | null;
  /** CPF integral apenas com acesso total; caso contrário vem mascarado. */
  cpf: string | null;
  cpf_mascarado: string | null;
  rg: string | null;
  birth_date: string | null;
  profession: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  zone: string | null;
  cep: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string | null;
  status_contato: string | null;
  /** Etapa do funil (`clients.stage`). Dado operacional básico. */
  stage: string | null;
  /** Rótulo da etapa final quando arquivado (concluido | protocolado). */
  status_final: string | null;
  /** Tipo de benefício/caso para a checklist INSS (dado operacional). */
  tipo_beneficio: string | null;
  notes: string | null;
  created_at: string | null;
  acesso_total: boolean;
};

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  return String(valor);
}

/**
 * Última barreira antes da resposta sair do servidor: reprojeta a linha campo a
 * campo em vez de deletar chaves, para que coluna nova adicionada ao schema por
 * outra frente não vaze sozinha para cargo restrito.
 */
export function sanitizarCliente(
  linha: Record<string, unknown>,
  acessoTotal: boolean
): ClienteVisivel {
  const cpfBruto = texto(linha.cpf);
  const mascarado = texto(linha.cpf_mascarado) ?? mascararCpf(cpfBruto);

  return {
    id: String(linha.id),
    lawyer_id: texto(linha.lawyer_id),
    name: texto(linha.name),
    cpf: acessoTotal ? cpfBruto : mascarado,
    cpf_mascarado: mascarado,
    rg: acessoTotal ? texto(linha.rg) : null,
    birth_date: acessoTotal ? texto(linha.birth_date) : null,
    profession: texto(linha.profession),
    phone: texto(linha.phone),
    whatsapp: texto(linha.whatsapp),
    email: texto(linha.email),
    zone: texto(linha.zone),
    cep: texto(linha.cep),
    address: texto(linha.address),
    city: texto(linha.city),
    state: texto(linha.state),
    status: texto(linha.status),
    status_contato: texto(linha.status_contato),
    stage: texto(linha.stage),
    status_final: texto(linha.status_final),
    tipo_beneficio: texto(linha.tipo_beneficio),
    notes: acessoTotal ? texto(linha.notes) : null,
    created_at: texto(linha.created_at),
    acesso_total: acessoTotal,
  };
}

export type TarefaCliente = {
  id: string;
  titulo: string | null;
  tipo: string | null;
  data_prazo: string | null;
  prioridade: string | null;
  concluido: boolean;
};

export type PecaCliente = {
  id: string;
  title: string | null;
  agent_type: string | null;
  created_at: string | null;
};

/** Metadados de peça judicial. O conteúdo integral nunca é listado aqui. */
export function sanitizarPeca(linha: Record<string, unknown>): PecaCliente {
  return {
    id: String(linha.id),
    title: texto(linha.title),
    agent_type: texto(linha.agent_type),
    created_at: texto(linha.created_at),
  };
}

export type PermissoesCliente = {
  cargo: Cargo;
  rotulo: string;
  acessoTotal: boolean;
  podeVerCpfCompleto: boolean;
  podeVerIdentificacao: boolean;
  podeVerObservacoes: boolean;
  podeVerPecas: boolean;
  podeVerFinanceiro: boolean;
  podeCriarCliente: boolean;
  podeExportar: boolean;
  podeArquivar: boolean;
  podeGerarPeticao: boolean;
  camposEditaveis: string[];
};

/**
 * Resumo enviado à interface. Serve só para desenhar a tela: quem decide de
 * fato é a RLS e o filtro de campos aplicado antes da resposta.
 */
export function permissoesDoCargo(cargo: Cargo, acessoTotal: boolean): PermissoesCliente {
  return {
    cargo,
    rotulo: rotuloCargo(cargo),
    acessoTotal,
    podeVerCpfCompleto: acessoTotal,
    podeVerIdentificacao: acessoTotal,
    podeVerObservacoes: acessoTotal,
    podeVerPecas: acessoTotal,
    podeVerFinanceiro: acessoTotal,
    podeCriarCliente: acessoTotal,
    podeExportar: acessoTotal,
    podeArquivar: acessoTotal,
    podeGerarPeticao: acessoTotal,
    camposEditaveis: [...(acessoTotal ? CAMPOS_EDITAVEIS_TOTAL : CAMPOS_EDITAVEIS_BASICO)],
  };
}

/** Mantém no payload de escrita só o que o cargo pode gravar. */
export function filtrarCamposEditaveis(
  payload: Record<string, unknown>,
  acessoTotal: boolean
): Record<string, unknown> {
  const permitidos: readonly string[] = acessoTotal
    ? CAMPOS_EDITAVEIS_TOTAL
    : CAMPOS_EDITAVEIS_BASICO;

  const saida: Record<string, unknown> = {};
  for (const campo of permitidos) {
    if (campo in payload) saida[campo] = payload[campo];
  }
  if (
    typeof saida.status_contato === "string" &&
    !STATUS_CONTATO_VALORES.includes(saida.status_contato)
  ) {
    delete saida.status_contato;
  }
  if (typeof saida.stage === "string" && !isClientStage(saida.stage)) {
    delete saida.stage;
  }
  return saida;
}
