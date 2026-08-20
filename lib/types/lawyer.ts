export type LawyerPlan =
  | "trial"
  | "starter"
  | "plus"
  | "premium"
  | "enterprise";

export type LawyerStatus = "active" | "suspended" | "canceled";

export type LawyerRole = "lawyer" | "super_admin";

export type Lawyer = {
  id: string;
  email: string;
  name: string | null;
  cpf: string | null;
  oab_number: string | null;
  oab_uf: string | null;
  role: LawyerRole | null;
  plan: LawyerPlan | string | null;
  status: LawyerStatus | string | null;
  onboarding_done: boolean | null;
  trial_start: string | null;
  trial_expires_at: string | null;
  docs_trial_used: number | null;
  docs_used: number | null;
  [key: string]: unknown;
};

const PLAN_DOC_LIMIT: Record<string, number> = {
  trial: 5,
  starter: 30,
  plus: 100,
  premium: 300,
  enterprise: 1000,
};

export function getDocsUsage(lawyer: Lawyer): { used: number; limit: number } {
  const plan = (lawyer.plan ?? "trial").toString().toLowerCase();
  if (plan === "trial") {
    return { used: lawyer.docs_trial_used ?? 0, limit: 5 };
  }
  return {
    used: lawyer.docs_used ?? 0,
    limit: PLAN_DOC_LIMIT[plan] ?? 30,
  };
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function userInitials(name: string | null, email: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase();
  }
  return (email[0] ?? "?").toUpperCase();
}
