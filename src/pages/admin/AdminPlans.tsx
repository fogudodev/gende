import AdminLayout from "@/components/layout/AdminLayout";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { Crown, CheckCircle2 } from "lucide-react";

const AdminPlans = () => {
  return (
    <AdminLayout title="Planos" subtitle="Planos disponíveis na plataforma">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {(Object.entries(STRIPE_PLANS) as [string, typeof STRIPE_PLANS[keyof typeof STRIPE_PLANS]][]).map(([id, plan]) => (
          <div key={id} className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-accent" />
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{plan.priceMonthly}<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
              <p className="text-sm text-muted-foreground">ou {plan.priceAnnual}/ano (2 meses grátis)</p>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-accent mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminPlans;
