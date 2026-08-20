import {
  STAGE_IDS,
  STAGES,
  normalizeStage,
  type ClientStage,
} from "@/lib/client-stages";

export type ClienteFunil = {
  id: string;
  stage?: string | null;
  status?: string | null;
  lawyer_id?: string | null;
  assigned_lawyer_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_contact_at?: string | null;
};

export type DocumentoFunil = {
  id: string;
  lawyer_id?: string | null;
  client_id?: string | null;
  created_at?: string | null;
};

export type MembroEquipe = {
  id: string;
  name: string | null;
};

export type MetricasEtapa = {
  stage: ClientStage;
  label: string;
  color: string;
  rgb: string;
  clientes: number;
  /** Clientes com 2+ documentos gerados (proxy de retrabalho). */
  comRetrabalho: number;
  /** 0–100; null se não há clientes na etapa. */
  taxaRetrabalhoPct: number | null;
  /** Média de horas desde `clients.updated_at` (permanência na etapa). */
  permanenciaMediaHoras: number | null;
  /** Média de horas desde `clients.last_contact_at` (atraso de contato). */
  atrasoContatoMediaHoras: number | null;
};

export type MetricasMembro = {
  id: string;
  nome: string;
  clientes: number;
  documentos: number;
  taxaRetrabalhoPct: number | null;
  permanenciaMediaHoras: number | null;
};

export type ResumoControladoria = {
  totalClientes: number;
  totalDocumentos: number;
  taxaRetrabalhoGeralPct: number | null;
  permanenciaMediaGeralHoras: number | null;
  porEtapa: MetricasEtapa[];
  gargalos: MetricasEtapa[];
  porMembro: MetricasMembro[];
};

const MS_HORA = 3_600_000;

function horasDesde(iso: string | null | undefined, agora: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (agora - t) / MS_HORA);
}

function media(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(parte: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((parte / total) * 1000) / 10;
}

/** Responsável operacional: assigned_lawyer_id, senão lawyer_id do cadastro. */
export function responsavelCliente(c: ClienteFunil): string | null {
  return c.assigned_lawyer_id || c.lawyer_id || null;
}

export function formatarHoras(horas: number | null): string {
  if (horas === null || Number.isNaN(horas)) return "—";
  if (horas < 24) {
    const h = Math.round(horas);
    return h <= 1 ? "≈1 h" : `${h} h`;
  }
  const dias = horas / 24;
  if (dias < 10) return `${dias.toFixed(1).replace(".", ",")} d`;
  return `${Math.round(dias)} d`;
}

export function formatarPct(valor: number | null): string {
  if (valor === null) return "—";
  return `${valor.toFixed(1).replace(".", ",")}%`;
}

/**
 * Agrega métricas de controladoria a partir de clientes e documentos do escritório.
 *
 * Definições (dados existentes — sem histórico de etapa):
 * - Taxa de retrabalho: % de clientes com ≥2 documentos (`documents.client_id`).
 * - Permanência: média de horas desde `clients.updated_at` na etapa atual.
 * - Atraso de contato: média desde `clients.last_contact_at` (informação auxiliar).
 * - Gargalos: etapas ativas (≠ concluído) com maior permanência média.
 * - Equipe: documentos por `documents.lawyer_id`; clientes por responsável.
 */
export function calcularControladoria(
  clientes: ClienteFunil[],
  documentos: DocumentoFunil[],
  membros: MembroEquipe[],
  agora: number = Date.now()
): ResumoControladoria {
  const ativos = clientes.filter((c) => (c.status ?? "active") !== "archived");

  const docsPorCliente = new Map<string, number>();
  for (const d of documentos) {
    if (!d.client_id) continue;
    docsPorCliente.set(d.client_id, (docsPorCliente.get(d.client_id) || 0) + 1);
  }

  const porEtapaMap = new Map<ClientStage, ClienteFunil[]>();
  for (const id of STAGE_IDS) porEtapaMap.set(id, []);
  for (const c of ativos) {
    porEtapaMap.get(normalizeStage(c.stage))!.push(c);
  }

  const porEtapa: MetricasEtapa[] = STAGES.map((meta) => {
    const lista = porEtapaMap.get(meta.id) || [];
    const comRetrabalho = lista.filter((c) => (docsPorCliente.get(c.id) || 0) >= 2).length;
    const permanencias = lista
      .map((c) => horasDesde(c.updated_at || c.created_at, agora))
      .filter((h): h is number => h !== null);
    const atrasos = lista
      .map((c) => horasDesde(c.last_contact_at, agora))
      .filter((h): h is number => h !== null);

    return {
      stage: meta.id,
      label: meta.label,
      color: meta.color,
      rgb: meta.rgb,
      clientes: lista.length,
      comRetrabalho,
      taxaRetrabalhoPct: pct(comRetrabalho, lista.length),
      permanenciaMediaHoras: media(permanencias),
      atrasoContatoMediaHoras: media(atrasos),
    };
  });

  const gargalos = porEtapa
    .filter((e) => e.stage !== "concluido" && e.clientes > 0 && e.permanenciaMediaHoras !== null)
    .slice()
    .sort((a, b) => (b.permanenciaMediaHoras ?? 0) - (a.permanenciaMediaHoras ?? 0));

  const docsPorLawyer = new Map<string, number>();
  for (const d of documentos) {
    if (!d.lawyer_id) continue;
    docsPorLawyer.set(d.lawyer_id, (docsPorLawyer.get(d.lawyer_id) || 0) + 1);
  }

  const clientesPorMembro = new Map<string, ClienteFunil[]>();
  for (const m of membros) clientesPorMembro.set(m.id, []);
  for (const c of ativos) {
    const rid = responsavelCliente(c);
    if (!rid || !clientesPorMembro.has(rid)) continue;
    clientesPorMembro.get(rid)!.push(c);
  }

  const porMembro: MetricasMembro[] = membros
    .map((m) => {
      const lista = clientesPorMembro.get(m.id) || [];
      const comRetrabalho = lista.filter((c) => (docsPorCliente.get(c.id) || 0) >= 2).length;
      const permanencias = lista
        .map((c) => horasDesde(c.updated_at || c.created_at, agora))
        .filter((h): h is number => h !== null);
      return {
        id: m.id,
        nome: m.name?.trim() || "Sem nome",
        clientes: lista.length,
        documentos: docsPorLawyer.get(m.id) || 0,
        taxaRetrabalhoPct: pct(comRetrabalho, lista.length),
        permanenciaMediaHoras: media(permanencias),
      };
    })
    .sort((a, b) => b.documentos - a.documentos || b.clientes - a.clientes);

  const comRetrabalhoGeral = ativos.filter((c) => (docsPorCliente.get(c.id) || 0) >= 2).length;
  const permanenciasGerais = ativos
    .filter((c) => normalizeStage(c.stage) !== "concluido")
    .map((c) => horasDesde(c.updated_at || c.created_at, agora))
    .filter((h): h is number => h !== null);

  return {
    totalClientes: ativos.length,
    totalDocumentos: documentos.length,
    taxaRetrabalhoGeralPct: pct(comRetrabalhoGeral, ativos.length),
    permanenciaMediaGeralHoras: media(permanenciasGerais),
    porEtapa,
    gargalos,
    porMembro,
  };
}
