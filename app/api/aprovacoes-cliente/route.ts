import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  enviarEmailAceite,
  estaExpirado,
  expiresEmDias,
  gerarTokenAceite,
  hashTokenAceite,
  montarSnapshotAceite,
  urlPublicaAceite,
  type ClienteParaSnapshot,
  type StatusAprovacao,
} from "@/lib/aprovacao-cliente";
import { sessaoComAcesso } from "@/lib/permissions/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type LinhaAprovacao = {
  id: string;
  status: StatusAprovacao;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
};

/** Lista aprovações recentes do cliente (escritório autenticado). */
export async function GET(req: Request) {
  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const clientId = new URL(req.url).searchParams.get("client_id") || "";
  if (!UUID.test(clientId)) {
    return Response.json({ error: "id_invalido" }, { status: 400 });
  }

  const { sessao, acesso } = contexto;
  if (!acesso.acessoTotal && !acesso.legado) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const cliente = await carregarClienteDoEscritorio(
    sessao.supabase,
    clientId,
    sessao.user.id
  );
  if (!cliente) return Response.json({ error: "nao_encontrado" }, { status: 404 });

  const { data } = await sessao.supabase
    .from("aprovacoes_cliente")
    .select("id, status, created_at, expires_at, accepted_at, revoked_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(5);

  const itens = ((data as LinhaAprovacao[]) || []).map((a) => ({
    id: a.id,
    status:
      a.status === "pendente" && estaExpirado(a.expires_at) ? "expirado" : a.status,
    created_at: a.created_at,
    expires_at: a.expires_at,
    accepted_at: a.accepted_at,
  }));

  return Response.json(
    { aprovacoes: itens },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Gera link de aceite: token aleatório, só o hash no banco + snapshot.
 * Revoga pendentes anteriores do mesmo cliente.
 */
export async function POST(req: Request) {
  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { sessao, acesso } = contexto;
  if (!acesso.acessoTotal && !acesso.legado) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const clientId = typeof body?.client_id === "string" ? body.client_id : "";
  if (!UUID.test(clientId)) {
    return Response.json({ error: "id_invalido" }, { status: 400 });
  }

  const cliente = await carregarClienteDoEscritorio(
    sessao.supabase,
    clientId,
    sessao.user.id
  );
  if (!cliente) return Response.json({ error: "nao_encontrado" }, { status: 404 });

  const { data: lawyer } = await sessao.supabase
    .from("lawyers")
    .select("name, office_name")
    .eq("id", sessao.user.id)
    .maybeSingle();

  const snapshot = montarSnapshotAceite(cliente, {
    escritorioNome: lawyer?.office_name || lawyer?.name || null,
    advogadoNome: lawyer?.name || acesso.nome || null,
  });

  const token = gerarTokenAceite();
  const tokenHash = hashTokenAceite(token);
  const expiresAt = expiresEmDias();
  const agora = new Date().toISOString();

  await sessao.supabase
    .from("aprovacoes_cliente")
    .update({ status: "revogado", revoked_at: agora })
    .eq("client_id", clientId)
    .eq("status", "pendente");

  let criada: {
    id: string;
    status: string;
    created_at: string;
    expires_at: string | null;
  } | null = null;

  const insertPayload = {
    client_id: clientId,
    token_hash: tokenHash,
    status: "pendente" as const,
    snapshot,
    expires_at: expiresAt,
    created_by: sessao.user.id,
  };

  const { data, error } = await sessao.supabase
    .from("aprovacoes_cliente")
    .insert(insertPayload)
    .select("id, status, created_at, expires_at")
    .single();

  if (!error && data) {
    criada = data;
  } else {
    // Service role fallback se RLS/tabela exigir (ownership já validado acima).
    const sb = adminClient();
    await sb
      .from("aprovacoes_cliente")
      .update({ status: "revogado", revoked_at: agora })
      .eq("client_id", clientId)
      .eq("status", "pendente");

    const { data: adminCriada, error: adminErr } = await sb
      .from("aprovacoes_cliente")
      .insert(insertPayload)
      .select("id, status, created_at, expires_at")
      .single();

    if (adminErr || !adminCriada) {
      return Response.json({ error: "falha_criar" }, { status: 500 });
    }
    criada = adminCriada;
  }

  const url = urlPublicaAceite(token);
  let emailEnviado = false;
  if (body?.enviar_email === true && snapshot.email) {
    emailEnviado = await enviarEmailAceite({
      to: snapshot.email,
      nomeCliente: snapshot.nome,
      escritorio: snapshot.escritorio_nome,
      url,
    });
  }

  return Response.json(
    {
      ok: true,
      id: criada.id,
      status: criada.status,
      url,
      token,
      expires_at: criada.expires_at,
      created_at: criada.created_at,
      email_enviado: emailEnviado,
      telefone: snapshot.telefone,
      email: snapshot.email,
      nome: snapshot.nome,
      snapshot,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function carregarClienteDoEscritorio(
  supabase: SupabaseClient,
  clientId: string,
  lawyerId: string
): Promise<ClienteParaSnapshot | null> {
  const { data, error } = await supabase.rpc("cliente_visivel", { p_id: clientId });
  if (!error) {
    const linha = ((data as ClienteParaSnapshot[]) ?? [])[0] ?? null;
    if (linha?.id) return linha;
  }

  const { data: legado } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("lawyer_id", lawyerId)
    .maybeSingle();

  return (legado as ClienteParaSnapshot) ?? null;
}
