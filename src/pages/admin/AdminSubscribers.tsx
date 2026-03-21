import AdminLayout from "@/components/layout/AdminLayout";
import { useAllProfessionals, useIsAdmin } from "@/hooks/useAdmin";
import { useState } from "react";
import { Search, Crown, Loader2, Edit, X, Check, Lock, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PLANS = [
  { id: "none", label: "Sem plano" },
  { id: "essencial", label: "Essencial" },
  { id: "enterprise", label: "Enterprise" },
];

const DURATIONS = [
  { label: "1 mês", months: 1 },
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
];

const AdminSubscribers = () => {
  const { data: professionals, isLoading } = useAllProfessionals();
  const { data: isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "essencial" | "enterprise" | "none">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(1);
  
  // Auth code modal state (for support users)
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [pendingSaveProfId, setPendingSaveProfId] = useState<string | null>(null);

  const qc = useQueryClient();

  const allWithSub = (professionals || []).map(p => {
    const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
    return { ...p, sub };
  });

  const filtered = allWithSub
    .filter(p => {
      if (filter === "all") return true;
      return (p.sub?.plan_id || "none") === filter;
    })
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    all: allWithSub.length,
    essencial: allWithSub.filter(p => p.sub?.plan_id === "essencial").length,
    enterprise: allWithSub.filter(p => p.sub?.plan_id === "enterprise").length,
    none: allWithSub.filter(p => !p.sub?.plan_id || p.sub.plan_id === "none" || p.sub.plan_id === "free").length,
  };

  const updatePlan = useMutation({
    mutationFn: async ({ professionalId, planId, months }: { professionalId: string; planId: string; months: number }) => {
      const now = new Date();
      const periodEnd = addMonths(now, months);
      
      const updateData: any = {
        plan_id: planId,
        status: planId === "none" ? "cancelled" : "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
      };

      if (planId === "essencial") {
        updateData.max_clients = 100;
        updateData.max_services = 15;
        updateData.max_bookings_per_month = 200;
      } else if (planId === "enterprise") {
        updateData.max_clients = null;
        updateData.max_services = null;
        updateData.max_bookings_per_month = null;
      } else {
        updateData.max_clients = 30;
        updateData.max_services = 5;
        updateData.max_bookings_per_month = 50;
        updateData.current_period_start = null;
        updateData.current_period_end = null;
      }

      const { error } = await api
        .from("subscriptions")
        .update(updateData)
        .eq("professional_id", professionalId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      toast.success("Plano atualizado com sucesso!");
      setEditingId(null);
      setCodeVerified(false);
      setAuthCode("");
    },
    onError: () => toast.error("Erro ao atualizar plano"),
  });

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setSelectedPlan(p.sub?.plan_id || "none");
    setSelectedDuration(1);
    setCodeVerified(false);
    setAuthCode("");
  };

  const handleSave = (professionalId: string) => {
    // Support users need code verification
    if (!isAdmin && !codeVerified) {
      setPendingSaveProfId(professionalId);
      setShowCodeModal(true);
      return;
    }
    updatePlan.mutate({ professionalId, planId: selectedPlan, months: selectedDuration });
  };

  const verifyCode = async () => {
    if (!authCode.trim()) {
      toast.error("Digite o código de autorização");
      return;
    }
    setVerifyingCode(true);
    try {
      // Check if code exists and is not used
      const { data, error } = await api
        .from("admin_auth_codes")
        .select("*")
        .eq("code", authCode.trim().toUpperCase())
        .eq("is_used", false)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Código inválido ou já utilizado");
        return;
      }

      // Mark code as used
      await api
        .from("admin_auth_codes")
        .update({ is_used: true, used_at: new Date().toISOString(), used_by: user?.id })
        .eq("id", data.id);

      setCodeVerified(true);
      setShowCodeModal(false);
      toast.success("Código verificado com sucesso!");

      // Auto-save after verification
      if (pendingSaveProfId) {
        updatePlan.mutate({ professionalId: pendingSaveProfId, planId: selectedPlan, months: selectedDuration });
        setPendingSaveProfId(null);
      }
    } catch (err: any) {
      toast.error("Erro ao verificar código");
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <AdminLayout title="Assinantes" subtitle="Visão geral e gestão manual de assinaturas">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: counts.all, key: "all" as const },
              { label: "Essencial", value: counts.essencial, key: "essencial" as const },
              { label: "Enterprise", value: counts.enterprise, key: "enterprise" as const },
              { label: "Sem plano", value: counts.none, key: "none" as const },
            ].map(c => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={cn(
                  "glass-card rounded-xl p-4 text-left transition-all",
                  filter === c.key && "ring-1 ring-accent"
                )}
              >
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </button>
            ))}
          </div>

          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Plano</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Válido até</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">{p.name || p.business_name || "—"}</td>
                      <td className="p-4 text-muted-foreground">{p.email}</td>
                      <td className="p-4">
                        {editingId === p.id ? (
                          <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-muted border border-border text-xs text-foreground"
                          >
                            {PLANS.map(plan => (
                              <option key={plan.id} value={plan.id}>{plan.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold",
                            p.sub?.plan_id === "enterprise" ? "bg-accent/10 text-accent" :
                            p.sub?.plan_id === "essencial" ? "bg-blue-500/10 text-blue-500" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {(p.sub?.plan_id || "none").toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          p.sub?.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                        )}>
                          {p.sub?.status || "—"}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {editingId === p.id && selectedPlan !== "none" ? (
                          <select
                            value={selectedDuration}
                            onChange={(e) => setSelectedDuration(Number(e.target.value))}
                            className="px-2 py-1 rounded-lg bg-muted border border-border text-xs text-foreground"
                          >
                            {DURATIONS.map(d => (
                              <option key={d.months} value={d.months}>{d.label}</option>
                            ))}
                          </select>
                        ) : (
                          p.sub?.current_period_end
                            ? format(new Date(p.sub.current_period_end), "dd/MM/yy", { locale: ptBR })
                            : "—"
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSave(p.id)}
                              disabled={updatePlan.isPending}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                              title={!isAdmin ? "Requer código de autorização" : "Salvar"}
                            >
                              {updatePlan.isPending ? <Loader2 size={14} className="animate-spin" /> : !isAdmin ? <Lock size={14} /> : <Check size={14} />}
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setCodeVerified(false); }}
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                            title="Gerenciar plano"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Auth Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => { setShowCodeModal(false); setPendingSaveProfId(null); }} />
          <div className="relative glass-card rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Key size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Código de Autorização</h3>
                <p className="text-xs text-muted-foreground">Solicite ao administrador</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Para alterar plano ou validade, insira o código de autorização fornecido pelo administrador.
            </p>
            <input
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              maxLength={8}
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-center text-lg font-mono font-bold text-foreground tracking-[0.3em] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCodeModal(false); setPendingSaveProfId(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={verifyCode}
                disabled={verifyingCode || authCode.length < 4}
                className="flex-1 px-4 py-2.5 rounded-xl gradient-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifyingCode ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Verificar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminSubscribers;
