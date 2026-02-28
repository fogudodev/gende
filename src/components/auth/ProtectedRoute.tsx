import { ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfessional } from "@/hooks/useProfessional";
import { useReceptionEmployee } from "@/hooks/useReceptionEmployee";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useIsAdmin } from "@/hooks/useAdmin";
import { ShieldAlert } from "lucide-react";
import UpgradeModal from "@/components/layout/UpgradeModal";
import type { FeatureKey } from "@/lib/stripe-plans";

const ROUTE_TO_FEATURE: Record<string, FeatureKey> = {
  "/": "dashboard",
  "/bookings": "bookings",
  "/services": "services",
  "/clients": "clients",
  "/automations": "automations",
  "/campaigns": "campaigns",
  "/finance": "finance",
  "/public-page": "public-page",
  "/products": "products",
  "/coupons": "coupons",
  "/reports": "reports",
  "/reviews": "reviews",
  "/settings": "settings",
  "/team": "team",
  "/payment-settings": "payment-settings",
  "/commission-report": "commission-report",
  "/team-performance": "team-performance",
  "/support-chat": "support-chat",
  "/payment-chat": "payment-chat",
  "/ai-assistant": "ai-assistant",
  "/cash-register": "cash-register",
};

const ROUTE_TO_LABEL: Record<string, string> = {
  "/automations": "WhatsApp",
  "/campaigns": "Campanhas",
  "/finance": "Financeiro",
  "/public-page": "Página Pública",
  "/products": "Produtos",
  "/coupons": "Cupons",
  "/reports": "Relatórios",
  "/team": "Equipe",
  "/payment-settings": "Pagamento",
  "/commission-report": "Comissões",
  "/team-performance": "Desempenho",
  "/support-chat": "Chat Suporte",
  "/payment-chat": "Chat Pagamento",
  "/ai-assistant": "Assistente IA",
  "/cash-register": "Caixa",
};

// Routes accessible by reception employees
const RECEPTION_ROUTES = [
  "/", "/bookings", "/clients", "/cash-register", "/automations",
];

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const { data: professional, isLoading: profLoading } = useProfessional();
  const { data: reception, isLoading: receptionLoading } = useReceptionEmployee();
  const { isLocked, requiredPlan, isLoading: planLoading } = useFeatureAccess();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const location = useLocation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading || profLoading || receptionLoading || planLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Reception employee flow
  if (reception && !professional) {
    if (!RECEPTION_ROUTES.includes(location.pathname)) {
      return <Navigate to="/bookings" replace />;
    }
    return <>{children}</>;
  }

  if (professional?.is_blocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Conta Bloqueada</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi suspensa pelo administrador.
            {professional.blocked_reason && (
              <> Motivo: <span className="text-foreground font-medium">{professional.blocked_reason}</span></>
            )}
          </p>
          <button
            onClick={() => signOut()}
            className="px-6 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  // Admin bypasses all plan restrictions
  const featureKey = ROUTE_TO_FEATURE[location.pathname];
  if (featureKey && !isAdmin && isLocked(featureKey)) {
    const label = ROUTE_TO_LABEL[location.pathname] || featureKey;
    const plan = requiredPlan(featureKey);

    return (
      <>
        <UpgradeModal
          open={!upgradeOpen}
          onOpenChange={(open) => {
            if (!open) setUpgradeOpen(true);
          }}
          requiredPlan={plan}
          featureName={label}
        />
        {upgradeOpen && <Navigate to="/" replace />}
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
