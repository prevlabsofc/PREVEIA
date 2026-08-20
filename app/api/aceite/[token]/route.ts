import { createClient } from "@supabase/supabase-js";

import {
  atrasoUniforme,
  estaExpirado,
  hashTokenAceite,
  ipDaRequisicao,
  tokenFormatoValido,
  userAgentDaRequisicao,
  type SnapshotAceite,
  type StatusAprovacao,
} from "@/lib/aprovacao-cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Linha = {
  id: string;
  status: StatusAprovacao;
  snapshot: SnapshotAceite;
  expires_at: string | null;
  accepted_at: string | null;
};

const ERRO_GENERICO = { error: "link_indisponivel" as const };

/**
 * Consulta pública por token. Sempre demora ~mesmo tempo; erros genéricos
 * (não distingue inexistente / expirado / revogado na mensagem).
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const started = Date.now();
  try {
    const { token } = await ctx.params;
    if (!tokenFormatoValido(token)) {
      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    const hash = hashTokenAceite(token);
    const { data } = await admin()
      .from("aprovacoes_cliente")
      .select("id, status, snapshot, expires_at, accepted_at")
      .eq("token_hash", hash)
      .maybeSingle();

    await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));

    if (!data) {
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    const row = data as Linha;
    let status: StatusAprovacao = row.status;
    if (status === "pendente" && estaExpirado(row.expires_at)) {
      await admin()
        .from("aprovacoes_cliente")
        .update({ status: "expirado" })
        .eq("id", row.id)
        .eq("status", "pendente");
      status = "expirado";
    }

    if (status !== "pendente") {
      // Confirmação pós-aceite: devolve status sem reabrir o formulário.
      if (status === "aceito") {
        return Response.json(
          {
            status: "aceito",
            accepted_at: row.accepted_at,
            snapshot: sanitizarSnapshotPublico(row.snapshot),
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    return Response.json(
      {
        status: "pendente",
        expires_at: row.expires_at,
        snapshot: sanitizarSnapshotPublico(row.snapshot),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
    return Response.json(ERRO_GENERICO, { status: 404 });
  }
}

/** Aceitar ou recusar — uso único; grava IP + user-agent. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const started = Date.now();
  try {
    const { token } = await ctx.params;
    if (!tokenFormatoValido(token)) {
      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const acao = body?.acao === "recusar" ? "recusar" : body?.acao === "aceitar" ? "aceitar" : null;
    if (!acao) {
      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
      return Response.json({ error: "acao_invalida" }, { status: 400 });
    }

    const hash = hashTokenAceite(token);
    const sb = admin();
    const { data } = await sb
      .from("aprovacoes_cliente")
      .select("id, status, expires_at, snapshot")
      .eq("token_hash", hash)
      .maybeSingle();

    if (!data) {
      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    const row = data as Linha & { id: string };
    if (row.status === "pendente" && estaExpirado(row.expires_at)) {
      await sb.from("aprovacoes_cliente").update({ status: "expirado" }).eq("id", row.id);
      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    if (row.status !== "pendente") {
      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    const agora = new Date().toISOString();
    const ip = ipDaRequisicao(req);
    const ua = userAgentDaRequisicao(req);

    if (acao === "aceitar") {
      const { data: updated, error } = await sb
        .from("aprovacoes_cliente")
        .update({
          status: "aceito",
          accepted_at: agora,
          accepted_ip: ip,
          accepted_ua: ua,
        })
        .eq("id", row.id)
        .eq("status", "pendente")
        .select("id, accepted_at")
        .maybeSingle();

      await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));

      if (error || !updated) {
        return Response.json(ERRO_GENERICO, { status: 404 });
      }

      return Response.json({
        ok: true,
        status: "aceito",
        accepted_at: updated.accepted_at,
        snapshot: sanitizarSnapshotPublico(row.snapshot),
      });
    }

    const { data: updated, error } = await sb
      .from("aprovacoes_cliente")
      .update({
        status: "recusado",
        declined_at: agora,
        accepted_ip: ip,
        accepted_ua: ua,
      })
      .eq("id", row.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();

    await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));

    if (error || !updated) {
      return Response.json(ERRO_GENERICO, { status: 404 });
    }

    return Response.json({ ok: true, status: "recusado" });
  } catch {
    await atrasoUniforme(Math.max(0, 90 - (Date.now() - started)));
    return Response.json(ERRO_GENERICO, { status: 404 });
  }
}

/** Nunca devolve ids internos extras além do necessário na UI pública. */
function sanitizarSnapshotPublico(snap: SnapshotAceite | null | undefined) {
  if (!snap || typeof snap !== "object") return {};
  return {
    nome: snap.nome ?? null,
    cpf_mascarado: snap.cpf_mascarado ?? null,
    profissao: snap.profissao ?? null,
    zona: snap.zona ?? null,
    cidade: snap.cidade ?? null,
    estado: snap.estado ?? null,
    endereco: snap.endereco ?? null,
    telefone: snap.telefone ?? null,
    email: snap.email ?? null,
    escritorio_nome: snap.escritorio_nome ?? null,
    advogado_nome: snap.advogado_nome ?? null,
    resumo_caso: snap.resumo_caso ?? null,
    gerado_em: snap.gerado_em ?? null,
  };
}
