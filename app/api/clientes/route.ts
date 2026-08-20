import type { PostgrestError } from "@supabase/supabase-js";

import { permissoesDoCargo, sanitizarCliente } from "@/lib/permissions/clientes";
import { sessaoComAcesso } from "@/lib/permissions/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A RPC ainda não existe na base (migração de cargos não aplicada). */
function rpcAusente(erro: PostgrestError | null): boolean {
  return erro?.code === "PGRST202" || erro?.code === "42883";
}

export async function GET(req: Request) {
  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { sessao, acesso } = contexto;

  // `clientes_visiveis` é SECURITY DEFINER e já devolve o recorte permitido:
  // CPF mascarado e rg/nascimento/observações nulos para cargo restrito.
  let linhas: Record<string, unknown>[] = [];
  const { data, error } = await sessao.supabase.rpc("clientes_visiveis");

  if (error && rpcAusente(error) && acesso.legado) {
    const legado = await sessao.supabase
      .from("clients")
      .select("*")
      .eq("lawyer_id", sessao.user.id)
      .order("created_at", { ascending: false });
    if (legado.error) return Response.json({ error: "erro_consulta" }, { status: 500 });
    linhas = (legado.data as Record<string, unknown>[]) ?? [];
  } else if (error) {
    return Response.json({ error: "erro_consulta" }, { status: 500 });
  } else {
    linhas = (data as Record<string, unknown>[]) ?? [];
  }

  const clientes = linhas.map((linha) =>
    sanitizarCliente(linha, acesso.acessoTotal && linha.acesso_total !== false)
  );

  return Response.json(
    { clientes, permissoes: permissoesDoCargo(acesso.cargo, acesso.acessoTotal) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { sessao, acesso } = contexto;
  if (!acesso.acessoTotal) {
    return Response.json({ error: "cargo_sem_permissao" }, { status: 403 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "payload_invalido" }, { status: 400 });
  }

  const { error } = await sessao.supabase.from("clients").insert({
    ...corpo,
    lawyer_id: sessao.user.id,
  });

  if (error) return Response.json({ error: "erro_gravacao" }, { status: 500 });
  return Response.json({ ok: true });
}
