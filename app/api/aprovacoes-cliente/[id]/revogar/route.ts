import { createClient } from "@supabase/supabase-js";

import { sessaoComAcesso } from "@/lib/permissions/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Revoga um link pendente (escritório). */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "id_invalido" }, { status: 400 });

  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { sessao, acesso } = contexto;
  if (!acesso.acessoTotal && !acesso.legado) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: row } = await sessao.supabase
    .from("aprovacoes_cliente")
    .select("id, status, client_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    // Fallback admin + ownership check
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: adminRow } = await sb
      .from("aprovacoes_cliente")
      .select("id, status, client_id")
      .eq("id", id)
      .maybeSingle();

    if (!adminRow) return Response.json({ error: "nao_encontrado" }, { status: 404 });

    const { data: cliente } = await sessao.supabase
      .from("clients")
      .select("id")
      .eq("id", adminRow.client_id)
      .eq("lawyer_id", sessao.user.id)
      .maybeSingle();

    if (!cliente) return Response.json({ error: "nao_encontrado" }, { status: 404 });

    if (adminRow.status !== "pendente") {
      return Response.json({ error: "nao_pendente" }, { status: 409 });
    }

    await sb
      .from("aprovacoes_cliente")
      .update({ status: "revogado", revoked_at: new Date().toISOString() })
      .eq("id", id);

    return Response.json({ ok: true, status: "revogado" });
  }

  if (row.status !== "pendente") {
    return Response.json({ error: "nao_pendente" }, { status: 409 });
  }

  const { error } = await sessao.supabase
    .from("aprovacoes_cliente")
    .update({ status: "revogado", revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return Response.json({ error: "falha_revogar" }, { status: 500 });

  return Response.json({ ok: true, status: "revogado" });
}
