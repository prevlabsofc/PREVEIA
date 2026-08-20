import type { PostgrestError } from "@supabase/supabase-js";

import {
  filtrarCamposEditaveis,
  permissoesDoCargo,
  sanitizarCliente,
  sanitizarPeca,
  type PecaCliente,
  type TarefaCliente,
} from "@/lib/permissions/clientes";
import { sessaoComAcesso } from "@/lib/permissions/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rpcAusente(erro: PostgrestError | null): boolean {
  return erro?.code === "PGRST202" || erro?.code === "42883";
}

export async function GET(req: Request, ctx: RouteContext<"/api/clientes/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "id_invalido" }, { status: 400 });

  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { sessao, acesso } = contexto;

  let linha: Record<string, unknown> | null = null;
  const { data, error } = await sessao.supabase.rpc("cliente_visivel", { p_id: id });

  if (error && rpcAusente(error) && acesso.legado) {
    const legado = await sessao.supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("lawyer_id", sessao.user.id)
      .maybeSingle();
    linha = (legado.data as Record<string, unknown>) ?? null;
  } else if (error) {
    return Response.json({ error: "erro_consulta" }, { status: 500 });
  } else {
    linha = ((data as Record<string, unknown>[]) ?? [])[0] ?? null;
  }

  if (!linha) return Response.json({ error: "nao_encontrado" }, { status: 404 });

  const acessoTotal = acesso.acessoTotal && linha.acesso_total !== false;
  const cliente = sanitizarCliente(linha, acessoTotal);

  // Peças judiciais só existem na resposta para cargo com acesso total. A RLS
  // de `documents` já devolveria vazio para os demais; aqui nem chegamos a
  // consultar, e o conteúdo integral nunca entra no payload da listagem.
  let pecas: PecaCliente[] = [];
  if (acessoTotal) {
    const { data: docs } = await sessao.supabase
      .from("documents")
      .select("id, title, agent_type, created_at, client_id, client_name")
      .eq("lawyer_id", sessao.user.id)
      .order("created_at", { ascending: false });

    pecas = ((docs as Record<string, unknown>[]) ?? [])
      .filter((d) => d.client_id === id || (cliente.name && d.client_name === cliente.name))
      .map(sanitizarPeca);
  }

  // Tarefas/prazos são dado básico: visíveis também para cargo restrito.
  let tarefas: TarefaCliente[] = [];
  if (cliente.name) {
    const { data: prazos } = await sessao.supabase.rpc("tarefas_do_cliente", {
      p_cliente_nome: cliente.name,
    });
    tarefas = ((prazos as TarefaCliente[]) ?? []).map((t) => ({
      id: String(t.id),
      titulo: t.titulo ?? null,
      tipo: t.tipo ?? null,
      data_prazo: t.data_prazo ?? null,
      prioridade: t.prioridade ?? null,
      concluido: Boolean(t.concluido),
    }));
  }

  return Response.json(
    {
      cliente,
      pecas,
      tarefas,
      permissoes: permissoesDoCargo(acesso.cargo, acessoTotal),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/clientes/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "id_invalido" }, { status: 400 });

  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { sessao, acesso } = contexto;

  let corpo: Record<string, unknown>;
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "payload_invalido" }, { status: 400 });
  }

  const alteracoes = filtrarCamposEditaveis(corpo, acesso.acessoTotal);
  if (Object.keys(alteracoes).length === 0) {
    return Response.json({ error: "nada_para_atualizar" }, { status: 400 });
  }

  if (acesso.acessoTotal) {
    const { error } = await sessao.supabase.from("clients").update(alteracoes).eq("id", id);
    if (error) return Response.json({ error: "erro_gravacao" }, { status: 500 });
    return Response.json({ ok: true });
  }

  // Cargo restrito não enxerga a tabela `clients`; a escrita passa pela função
  // SECURITY DEFINER, que só aceita campos de contato e confere o escritório.
  const { data, error } = await sessao.supabase.rpc("atualizar_cliente_basico", {
    p_id: id,
    p_phone: (alteracoes.phone as string) ?? null,
    p_whatsapp: (alteracoes.whatsapp as string) ?? null,
    p_email: (alteracoes.email as string) ?? null,
    p_cep: (alteracoes.cep as string) ?? null,
    p_address: (alteracoes.address as string) ?? null,
    p_city: (alteracoes.city as string) ?? null,
    p_state: (alteracoes.state as string) ?? null,
    p_status_contato: (alteracoes.status_contato as string) ?? null,
    p_stage: (alteracoes.stage as string) ?? null,
  });

  if (error) return Response.json({ error: "erro_gravacao" }, { status: 500 });
  if (data === false) return Response.json({ error: "nao_encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
