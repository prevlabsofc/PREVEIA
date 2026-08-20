import { isCargo, type Cargo } from "./cargos";

/**
 * Controladoria: visão gerencial do funil — só sócio ou admin de plataforma.
 *
 * Não usa `temAcessoTotal` (que inclui advogado). Em bases legadas sem a
 * coluna `cargo`, o `office_role === 'owner'` equivale ao sócio (mesma regra
 * da migração `20260727_cargos_e_acesso_clientes.sql`).
 */
export type LawyerAuthzControladoria = {
  cargo?: string | null;
  role?: string | null;
  office_role?: string | null;
};

export function podeAcessarControladoria(
  lawyer: LawyerAuthzControladoria | null | undefined
): boolean {
  if (!lawyer) return false;
  if (lawyer.role === "super_admin") return true;
  if (isCargo(lawyer.cargo) && (lawyer.cargo as Cargo) === "socio") return true;
  if (!lawyer.cargo && lawyer.office_role === "owner") return true;
  return false;
}
