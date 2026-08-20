import { createHash, randomBytes, timingSafeEqual } from "crypto";

import { mascararCpf } from "@/lib/permissions/cargos";
import {
  ACEITE_VALIDADE_DIAS,
  type SnapshotAceite,
  type StatusAprovacao,
} from "@/lib/aprovacao-cliente-shared";

export type { SnapshotAceite, StatusAprovacao };
export {
  ACEITE_VALIDADE_DIAS,
  linkWhatsAppAceite,
  rotuloZona,
  telefoneParaWaMe,
  urlPublicaAceite,
} from "@/lib/aprovacao-cliente-shared";

export type ClienteParaSnapshot = {
  id: string;
  name?: string | null;
  cpf?: string | null;
  profession?: string | null;
  zone?: string | null;
  zona?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
};

/** Token criptograficamente aleatório (32 bytes → 64 hex). */
export function gerarTokenAceite(): string {
  return randomBytes(32).toString("hex");
}

export function hashTokenAceite(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Comparação em tempo constante do hash (hex). */
export function tokensIguais(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

const TOKEN_HEX = /^[a-f0-9]{64}$/i;

export function tokenFormatoValido(token: string): boolean {
  return TOKEN_HEX.test(token);
}

/** IP do cliente atrás do proxy da Vercel. */
export function ipDaRequisicao(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const primeiro = forwarded.split(",")[0]?.trim();
    if (primeiro) return primeiro.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return null;
}

export function userAgentDaRequisicao(req: Request): string | null {
  const ua = req.headers.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 512);
}

/**
 * Monta o snapshot sem CPF integral, RG, dados bancários nem notas brutas
 * longas. `resumo_caso` é um recorte curto e opcional das observações.
 */
export function montarSnapshotAceite(
  cliente: ClienteParaSnapshot,
  meta: { escritorioNome?: string | null; advogadoNome?: string | null }
): SnapshotAceite {
  const notes = typeof cliente.notes === "string" ? cliente.notes.trim() : "";
  const resumo =
    notes.length === 0
      ? null
      : notes.length > 600
        ? `${notes.slice(0, 597)}...`
        : notes;

  return {
    cliente_id: String(cliente.id),
    nome: cliente.name?.trim() || null,
    cpf_mascarado: mascararCpf(cliente.cpf),
    profissao: cliente.profession?.trim() || null,
    zona: (cliente.zone || cliente.zona)?.trim() || null,
    cidade: cliente.city?.trim() || null,
    estado: cliente.state?.trim() || null,
    endereco: cliente.address?.trim() || null,
    telefone: (cliente.whatsapp || cliente.phone)?.trim() || null,
    email: cliente.email?.trim() || null,
    escritorio_nome: meta.escritorioNome?.trim() || null,
    advogado_nome: meta.advogadoNome?.trim() || null,
    resumo_caso: resumo,
    gerado_em: new Date().toISOString(),
  };
}

export function expiresEmDias(dias = ACEITE_VALIDADE_DIAS): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString();
}

export function estaExpirado(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/** Delay fixo para reduzir vazamento de timing token existe vs inválido. */
export async function atrasoUniforme(ms = 80): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** E-mail de revisão via Resend (mesmo padrão visual das outras rotas). */
export async function enviarEmailAceite(opts: {
  to: string;
  nomeCliente: string | null;
  escritorio: string | null;
  url: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const nome = opts.nomeCliente || "Cliente";
  const escritorio = opts.escritorio || "seu escritório";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: Georgia, serif; background: #0A0A0A; color: #fff; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 32px; font-weight: bold; margin: 0;">
        <span style="color: #fff;">Mar</span><span style="color: #D4AF37;">ple</span>
      </h1>
      <p style="color: #888; font-size: 12px; letter-spacing: 3px; margin: 4px 0 0;">REVISÃO DO SEU CASO</p>
    </div>
    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2); border-radius: 16px; padding: 32px;">
      <h2 style="color: #D4AF37; font-size: 20px; margin: 0 0 16px;">Olá, ${escapeHtml(nome)}</h2>
      <p style="color: #ccc; line-height: 1.7; margin: 0 0 16px;">
        <strong style="color:#fff;">${escapeHtml(escritorio)}</strong> solicitou que você revise e confirme
        os dados do seu caso antes do protocolo/ajuizamento.
      </p>
      <p style="color: #aaa; line-height: 1.6; margin: 0 0 24px; font-size: 14px;">
        O link é pessoal, temporário e de uso único. Não compartilhe com terceiros.
      </p>
      <div style="text-align: center;">
        <a href="${opts.url}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37, #F0D060); color: #000; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px;">
          Revisar e confirmar →
        </a>
      </div>
    </div>
    <p style="color: #555; font-size: 11px; text-align: center; margin-top: 24px;">
      © ${new Date().getFullYear()} Marple · Este e-mail foi enviado a pedido do escritório responsável pelo seu caso.
    </p>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@marple.com.br",
      to: opts.to,
      subject: `Revisão dos dados do seu caso — ${escritorio}`,
      html,
    });
    return true;
  } catch {
    return false;
  }
}
