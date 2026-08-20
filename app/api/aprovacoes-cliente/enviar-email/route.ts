import { enviarEmailAceite } from "@/lib/aprovacao-cliente";
import { sessaoComAcesso } from "@/lib/permissions/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reenvia o e-mail com a URL do aceite. O plaintext do token só existe no
 * escritório após a geração — esta rota recebe `url` + `to` da sessão atual
 * (não reconstrói o token a partir do hash).
 */
export async function POST(req: Request) {
  const contexto = await sessaoComAcesso(req);
  if (!contexto) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { acesso } = contexto;
  if (!acesso.acessoTotal && !acesso.legado) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const nomeCliente = typeof body?.nome === "string" ? body.nome : null;
  const escritorio = typeof body?.escritorio === "string" ? body.escritorio : null;

  if (!to || !url) {
    return Response.json({ error: "dados_invalidos" }, { status: 400 });
  }

  if (!url.includes("/aceite/")) {
    return Response.json({ error: "url_invalida" }, { status: 400 });
  }

  const ok = await enviarEmailAceite({
    to,
    nomeCliente,
    escritorio: escritorio || acesso.nome,
    url,
  });

  if (!ok) return Response.json({ error: "falha_email" }, { status: 500 });
  return Response.json({ ok: true });
}
