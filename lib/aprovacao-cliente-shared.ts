/** Helpers e tipos compartilhados (seguros para client components). */

export const ACEITE_VALIDADE_DIAS = 14;

export type StatusAprovacao =
  | "pendente"
  | "aceito"
  | "recusado"
  | "expirado"
  | "revogado";

/** Snapshot curado — o que o cliente vê e o que fica auditável. */
export type SnapshotAceite = {
  cliente_id: string;
  nome: string | null;
  cpf_mascarado: string | null;
  profissao: string | null;
  zona: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  escritorio_nome: string | null;
  advogado_nome: string | null;
  resumo_caso: string | null;
  gerado_em: string;
};

export function rotuloZona(zona: string | null | undefined): string | null {
  if (!zona) return null;
  if (zona === "rural") return "Rural";
  if (zona === "urbano" || zona === "urban") return "Urbano";
  return zona;
}

export function telefoneParaWaMe(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const comDdi = digits.startsWith("55") ? digits : `55${digits}`;
  return comDdi;
}

export function linkWhatsAppAceite(
  telefone: string,
  url: string,
  nomeCliente?: string | null
): string {
  const nome = nomeCliente?.trim() || "cliente";
  const texto = `Olá! Segue o link para revisar e confirmar os dados do seu caso no escritório, antes do protocolo:\n\n${url}\n\n(${nome})`;
  return `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
}

export function urlPublicaAceite(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return `${base}/aceite/${token}`;
}
