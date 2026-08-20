import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { CARGO_FALLBACK, isCargo, temAcessoTotal, type Cargo } from "./cargos";

function credenciais() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias."
    );
  }
  return { url, anonKey };
}

export type SessaoSupabase = { supabase: SupabaseClient; user: User };

/**
 * Cliente Supabase ligado ao usuário que fez a requisição — nunca à service
 * role. Aceita tanto o cookie de sessão quanto o header Authorization usado
 * pelas rotas já existentes do projeto. Em ambos os casos o token é validado
 * contra o Supabase antes de ser usado, e as consultas seguintes passam por RLS
 * com o `auth.uid()` desse usuário.
 */
export async function sessaoDaRequisicao(req: Request): Promise<SessaoSupabase | null> {
  const { url, anonKey } = credenciais();

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (token) {
    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) return { supabase, user: data.user };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Route Handlers em contexto estático não podem gravar cookies.
        }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) return { supabase, user: data.user };

  return null;
}

export type AcessoDoUsuario = {
  cargo: Cargo;
  acessoTotal: boolean;
  officeId: string | null;
  officeRole: string | null;
  nome: string | null;
  /** true quando a base ainda não recebeu a migração de cargos. */
  legado: boolean;
};

const ACESSO_RESTRITO: AcessoDoUsuario = {
  cargo: CARGO_FALLBACK,
  acessoTotal: false,
  officeId: null,
  officeRole: null,
  nome: null,
  legado: false,
};

/**
 * Resolve o nível de acesso a partir da sessão. O valor jamais vem do corpo ou
 * da query da requisição.
 *
 * Fail closed: linha ausente em `lawyers`, cargo nulo, cargo desconhecido ou
 * erro de consulta resultam em acesso restrito.
 *
 * Exceção deliberada: se a coluna `cargo` ainda não existe (migração não
 * aplicada), a base está num estado em que nenhum usuário pôde ser marcado como
 * restrito e o bloqueio de RLS também não existe. Nesse caso o comportamento
 * anterior é preservado, para não trancar escritórios inteiros fora do sistema
 * enquanto o SQL não é rodado.
 */
export async function acessoDoUsuario(
  supabase: SupabaseClient,
  userId: string
): Promise<AcessoDoUsuario> {
  const { data, error } = await supabase
    .from("lawyers")
    .select("name, cargo, office_id, office_role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "42703") {
      const { data: legado } = await supabase
        .from("lawyers")
        .select("name, office_id, office_role")
        .eq("id", userId)
        .maybeSingle();
      return {
        cargo: "advogado",
        acessoTotal: true,
        officeId: (legado?.office_id as string) ?? null,
        officeRole: (legado?.office_role as string) ?? null,
        nome: (legado?.name as string) ?? null,
        legado: true,
      };
    }
    return ACESSO_RESTRITO;
  }

  if (!data) return ACESSO_RESTRITO;

  const cargo = isCargo(data.cargo) ? data.cargo : CARGO_FALLBACK;
  return {
    cargo,
    acessoTotal: temAcessoTotal(cargo),
    officeId: (data.office_id as string) ?? null,
    officeRole: (data.office_role as string) ?? null,
    nome: (data.name as string) ?? null,
    legado: false,
  };
}

export async function sessaoComAcesso(
  req: Request
): Promise<{ sessao: SessaoSupabase; acesso: AcessoDoUsuario } | null> {
  const sessao = await sessaoDaRequisicao(req);
  if (!sessao) return null;
  const acesso = await acessoDoUsuario(sessao.supabase, sessao.user.id);
  return { sessao, acesso };
}
