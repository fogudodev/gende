import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAllProfessionals } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, Users, Loader2, Ban, UserCheck, Globe, MessageCircle,
  BarChart3, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Eye, Shield,
} from "lucide-react";
import AdminCreateProfessional from "@/components/admin/AdminCreateProfessional";
import AdminCreateSupport from "@/components/admin/AdminCreateSupport";

const AdminUsers = () => {
  const { data: professionals, isLoading } = useAllProfessionals();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateSupport, setShowCreateSupport] = useState(false);
  const qc = useQueryClient();

  const filtered = (professionals || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.business_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleBlock = async (profId: string, currentlyBlocked: boolean) => {
    const updates: any = { is_blocked: !currentlyBlocked };
    if (!currentlyBlocked) {
      updates.blocked_reason = blockReason || "";
    } else {
      updates.blocked_reason = "";
    }
    const { error } = await supabase.from("professionals").update(updates).eq("id", profId);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      toast.success(currentlyBlocked ? "Profissional desbloqueado" : "Profissional bloqueado");
      setBlockReason("");
    }
  };

  const toggleFeature = async (profId: string, feature: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("professionals")
      .update({ [feature]: !currentValue } as any)
      .eq("id", profId);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      toast.success("Funcionalidade atualizada");
    }
  };

  const featureLabels: Record<string, { label: string; icon: any }> = {
    feature_whatsapp: { label: "WhatsApp", icon: MessageCircle },
    feature_public_page: { label: "Página Pública", icon: Globe },
    feature_reports: { label: "Relatórios", icon: BarChart3 },
  };

  return (
    <AdminLayout title="Usuários" subtitle="Gerencie profissionais e salões">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar profissional..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-accent text-accent-foreground text-sm font-semibold transition-all hover:opacity-90"
            >
              <Users size={16} />
              Cadastrar Profissional
            </button>
            <button
              onClick={() => setShowCreateSupport(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm font-semibold transition-all hover:bg-muted/80"
            >
              <Shield size={16} />
              Cadastrar Suporte
            </button>
          </div>

          <AdminCreateProfessional
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ["admin-professionals"] })}
          />
          <AdminCreateSupport
            open={showCreateSupport}
            onClose={() => setShowCreateSupport(false)}
            onCreated={() => qc.invalidateQueries({ queryKey: ["admin-professionals"] })}
          />

          <div className="space-y-3">
            {filtered.map((p) => {
              const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
              const isExpanded = expanded === p.id;
              const isBlocked = p.is_blocked;

              return (
                <div key={p.id} className={cn("glass-card rounded-2xl overflow-hidden transition-all", isBlocked && "opacity-60 ring-1 ring-destructive/30")}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : p.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      {isBlocked ? <Ban size={18} className="text-destructive" /> : <UserCheck size={18} className="text-accent" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{p.name || "Sem nome"}</span>
                        <span className="text-[10px] text-muted-foreground">{p.account_type === "salon" ? "Salão" : "Autônomo"}</span>
                        {isBlocked && <span className="text-[10px] font-bold uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">Bloqueado</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{p.email} · {p.business_name || "—"}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold shrink-0",
                      sub?.plan_id === "enterprise" ? "bg-accent/10 text-accent" :
                      sub?.plan_id === "essencial" ? "bg-blue-500/10 text-blue-500" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {(sub?.plan_id || "none").toUpperCase()}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-muted-foreground">Telefone:</span> <span className="text-foreground font-medium">{p.phone || "—"}</span></div>
                        <div><span className="text-muted-foreground">Slug:</span> <span className="text-foreground font-mono">{p.slug || "—"}</span></div>
                        <div><span className="text-muted-foreground">Criado em:</span> <span className="text-foreground">{format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}</span></div>
                        <div><span className="text-muted-foreground">Tipo:</span> <span className="text-foreground font-medium">{p.account_type === "salon" ? "Salão" : "Autônomo"}</span></div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funcionalidades</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(featureLabels).map(([key, { label, icon: Icon }]) => {
                            const enabled = (p as any)[key] !== false;
                            return (
                              <button
                                key={key}
                                onClick={() => toggleFeature(p.id, key, enabled)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  enabled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                                )}
                              >
                                <Icon size={12} />
                                {label}
                                {enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bloqueio</h4>
                        {!isBlocked ? (
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground mb-1 block">Motivo (opcional)</label>
                              <input
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                placeholder="Ex: Violação dos termos..."
                                className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                              />
                            </div>
                            <button
                              onClick={() => toggleBlock(p.id, false)}
                              className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1.5 shrink-0"
                            >
                              <Ban size={12} /> Bloquear
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {p.blocked_reason ? <>Motivo: <span className="text-foreground">{p.blocked_reason}</span></> : "Sem motivo informado"}
                            </div>
                            <button
                              onClick={() => toggleBlock(p.id, true)}
                              className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                            >
                              <UserCheck size={12} /> Desbloquear
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">Nenhum profissional encontrado</div>
          )}
          <p className="text-xs text-muted-foreground">{filtered.length} profissionais</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
