import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STRIPE_PLANS, type PlanId } from "@/lib/stripe-plans";
import { Crown, CheckCircle2, Loader2, Zap, CreditCard, QrCode, Copy, Check, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface PlanRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "plans" | "pix";

const PIX_KEY = "21997240995";
const PIX_TIMEOUT_SECONDS = 180; // 3 minutes

const PlanRenewalModal = ({ open, onOpenChange }: PlanRenewalModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [step, setStep] = useState<Step>("plans");
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(PIX_TIMEOUT_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const navigate = useNavigate();
  const { currentPlan } = useFeatureAccess();

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("plans");
      setSelectedPlan(null);
      setTimeLeft(PIX_TIMEOUT_SECONDS);
      setTimerActive(false);
      setCopied(false);
    }
  }, [open]);

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

  const handlePixSelect = (planId: PlanId) => {
    setSelectedPlan(planId);
    setStep("pix");
    setTimeLeft(PIX_TIMEOUT_SECONDS);
    setTimerActive(true);
  };

  const handleCopyKey = useCallback(() => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleSendReceipt = () => {
    onOpenChange(false);
    navigate("/payment-chat");
  };

  const handleRetryPix = () => {
    setTimeLeft(PIX_TIMEOUT_SECONDS);
    setTimerActive(true);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = (timeLeft / PIX_TIMEOUT_SECONDS) * 100;
  const timerExpired = timeLeft <= 0;

  const selectedPlanData = selectedPlan ? STRIPE_PLANS[selectedPlan] : null;
  const selectedPrice = selectedPlanData
    ? billing === "annual"
      ? selectedPlanData.priceAnnual
      : selectedPlanData.priceMonthly
    : "";

  if (step === "pix") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <QrCode size={20} className="text-accent" />
              Pagamento via PIX
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-4">
            <div className="bg-accent/5 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Plano selecionado</p>
              <p className="font-bold text-foreground">
                {selectedPlanData?.name} — {selectedPrice}
                <span className="text-xs text-muted-foreground font-normal">
                  {billing === "annual" ? "/ano" : "/mês"}
                </span>
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <QRCodeSVG
                  value={`00020126580014br.gov.bcb.pix0136${PIX_KEY}5204000053039865802BR5925GENDE6009SAO PAULO62070503***6304`}
                  size={180}
                  level="M"
                />
              </div>
            </div>

            {/* Copy key */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Chave PIX (Telefone)</p>
              <button
                onClick={handleCopyKey}
                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              >
                <span className="font-mono font-bold text-foreground text-sm">{PIX_KEY}</span>
                {copied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} className="text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Timer */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-center gap-2">
                <Clock size={14} className={timerExpired ? "text-destructive" : "text-accent"} />
                <span className={`font-mono font-bold text-lg ${timerExpired ? "text-destructive" : "text-foreground"}`}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2"
              />
              {timerExpired ? (
                <div className="space-y-2">
                  <p className="text-xs text-destructive font-medium">
                    Tempo expirado! Gere um novo pagamento.
                  </p>
                  <button
                    onClick={handleRetryPix}
                    className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover-lift"
                  >
                    Gerar novo pagamento
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Realize o pagamento dentro do prazo
                </p>
              )}
            </div>

            {/* Send receipt button */}
            {!timerExpired && (
              <button
                onClick={handleSendReceipt}
                className="w-full py-3 rounded-xl gradient-accent text-accent-foreground text-sm font-semibold hover-lift flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} />
                Já paguei — Enviar comprovante
              </button>
            )}

            <button
              onClick={() => setStep("plans")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar aos planos
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Crown size={20} className="text-accent" />
            {currentPlan === "none" ? "Escolha seu plano" : "Renovar / Upgrade"}
          </DialogTitle>
        </DialogHeader>

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
          {(Object.entries(STRIPE_PLANS) as [PlanId, (typeof STRIPE_PLANS)[PlanId]][]).map(
            ([id, plan]) => {
              const isCurrent = id === currentPlan;
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
                    <div className="flex items-center gap-1.5">
                      {isRecommended && (
                        <span className="text-[9px] font-bold uppercase bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[9px] font-bold uppercase bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          Atual
                        </span>
                      )}
                    </div>
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

                  <div className="space-y-2 pt-1">
                    {/* Stripe (Credit card) */}
                    <button
                      onClick={() => handleCheckout(plan)}
                      disabled={loading !== null}
                      className="w-full py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-semibold hover-lift disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard size={13} />
                          Cartão de Crédito
                        </>
                      )}
                    </button>

                    {/* PIX */}
                    <button
                      onClick={() => handlePixSelect(id)}
                      className="w-full py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <QrCode size={13} />
                      Pagar com PIX
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanRenewalModal;
