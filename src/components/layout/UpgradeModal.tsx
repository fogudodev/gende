import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STRIPE_PLANS, type PlanId } from "@/lib/stripe-plans";
import { Crown, CheckCircle2, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPlan?: PlanId | null;
  featureName?: string;
}

const UpgradeModal = ({ open, onOpenChange, requiredPlan, featureName }: UpgradeModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const handleCheckout = async (plan: typeof STRIPE_PLANS.essencial | typeof STRIPE_PLANS.enterprise) => {
    const priceId = billing === "annual" ? plan.priceIdAnnual : plan.priceId;
    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao iniciar checkout");
    }
    setLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Crown size={20} className="text-accent" />
            Upgrade necessário
          </DialogTitle>
        </DialogHeader>

        {featureName && (
          <p className="text-sm text-muted-foreground">
            O recurso <span className="font-semibold text-foreground">{featureName}</span> requer um plano superior.
          </p>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            onClick={() => setBilling("monthly")}
            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
              billing === "monthly"
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              billing === "annual"
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Zap size={12} /> Anual (2 meses grátis)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {(Object.entries(STRIPE_PLANS) as [PlanId, typeof STRIPE_PLANS[PlanId]][]).map(([id, plan]) => {
            const isRecommended = id === "enterprise";
            const price = billing === "annual" ? plan.priceAnnual : plan.priceMonthly;
            const period = billing === "annual" ? "/ano" : "/mês";

            return (
              <div
                key={id}
                className={`rounded-2xl border p-4 space-y-3 transition-all ${
                  isRecommended
                    ? "border-accent ring-1 ring-accent/30 bg-accent/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground text-sm">{plan.name}</h3>
                  {isRecommended && (
                    <span className="text-[9px] font-bold uppercase bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-foreground">
                  {price}
                  <span className="text-xs text-muted-foreground font-normal">{period}</span>
                </p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 6).map((f, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle2 size={10} className="text-accent mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={loading !== null}
                  className="w-full py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-semibold hover-lift disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                  ) : (
                    `Assinar ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
