/**
 * Níveis de acesso aos dados de cliente.
 *
 * Dimensão separada de `lawyers.office_role` (owner/member, que responde por
 * convites e faturamento) e de `lawyers.role` (lawyer/super_admin, papel de
 * plataforma). Aqui só se decide QUAL DADO do cliente o membro enxerga.
 *
 * Espelha a tabela `public.cargos`. Para criar um nível novo: INSERT na tabela
 * e uma entrada aqui — nenhuma policy ou função SQL precisa mudar.
 */
export const CARGOS = ["socio", "advogado", "secretaria", "estagiario"] as const;

export type Cargo = (typeof CARGOS)[number];

export const CARGO_ACESSO_TOTAL: Record<Cargo, boolean> = {
  socio: true,
  advogado: true,
  secretaria: false,
  estagiario: false,
};

export const CARGO_ROTULO: Record<Cargo, string> = {
  socio: "Sócio",
  advogado: "Advogado",
  secretaria: "Secretária",
  estagiario: "Estagiário",
};

/** Cargo assumido quando não é possível resolver o do usuário. */
export const CARGO_FALLBACK: Cargo = "estagiario";

export function isCargo(valor: unknown): valor is Cargo {
  return typeof valor === "string" && (CARGOS as readonly string[]).includes(valor);
}

export function temAcessoTotal(cargo: string | null | undefined): boolean {
  return isCargo(cargo) ? CARGO_ACESSO_TOTAL[cargo] : false;
}

export function rotuloCargo(cargo: string | null | undefined): string {
  return isCargo(cargo) ? CARGO_ROTULO[cargo] : "Acesso restrito";
}

/** `12345678901` → `***.***.789-**`. Sempre executado no servidor. */
export function mascararCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const n = cpf.replace(/\D/g, "");
  if (n.length < 9) return "***.***.***-**";
  return `***.***.${n.slice(6, 9)}-**`;
}
