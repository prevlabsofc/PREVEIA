import Link from "next/link";
import { redirect } from "next/navigation";
import { ControladoriaDashboard } from "@/components/controladoria/ControladoriaDashboard";
import { podeAcessarControladoria } from "@/lib/permissions/controladoria";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ControladoriaPage() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lawyer, error } = await supabase
    .from("lawyers")
    .select("cargo, role, office_role")
    .eq("id", user.id)
    .maybeSingle();

  // Coluna cargo ainda não existe: cai no legado (owner ≈ sócio).
  let authz = lawyer;
  if (error?.code === "42703") {
    const { data: legado } = await supabase
      .from("lawyers")
      .select("role, office_role")
      .eq("id", user.id)
      .maybeSingle();
    authz = legado ? { ...legado, cargo: null } : null;
  }

  if (!podeAcessarControladoria(authz)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#D4AF37" }}>
          403
        </p>
        <h1 className="text-2xl font-black text-white mb-2">Acesso restrito</h1>
        <p className="text-sm text-gray-400 mb-6">
          A Controladoria está disponível apenas para sócios e administradores do escritório.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
          style={{
            background: "rgba(212,175,55,0.15)",
            color: "#D4AF37",
            border: "1px solid rgba(212,175,55,0.35)",
          }}
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  return <ControladoriaDashboard />;
}
