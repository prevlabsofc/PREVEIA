import Link from "next/link";
import { Zap } from "lucide-react";
import { daysUntil, type Lawyer } from "@/lib/types/lawyer";

export function TrialBanner({ lawyer }: { lawyer: Lawyer }) {
  const plan = (lawyer.plan ?? "").toString().toLowerCase();
  if (plan !== "trial") return null;

  const days = daysUntil(lawyer.trial_expires_at);
  if (days === null) return null;

  const used = lawyer.docs_trial_used ?? 0;
  const remaining = Math.max(0, 5 - used);
  const urgent = days <= 3 || remaining <= 1;

  const containerClass = urgent
    ? "border-b border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-200"
    : "border-b text-[#E8C24A]";

  const inlineStyle = urgent
    ? undefined
    : {
        background:
          "linear-gradient(to right, rgba(212,175,55,0.15), rgba(212,175,55,0.05))",
        borderBottomColor: "rgba(212,175,55,0.2)",
      };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 text-sm ${containerClass}`}
      style={inlineStyle}
    >
      <p className="flex items-center gap-2">
        <Zap className="h-4 w-4 shrink-0" />
        <span>
          Trial ativo —{" "}
          <strong className="font-semibold">
            {days} {days === 1 ? "dia restante" : "dias restantes"}
          </strong>{" "}
          • {used}/5 petições usadas
        </span>
      </p>
      <Link
        href="/assinatura"
        className="inline-flex h-8 items-center rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#F0D060] px-4 text-xs font-semibold text-black transition-transform hover:scale-[1.03]"
      >
        Assinar Agora
      </Link>
    </div>
  );
}
