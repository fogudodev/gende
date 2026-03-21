import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { motion } from "framer-motion";
import { Search, MessageSquare, Clock, Send, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const useAdminMessageUsage = () => {
  return useQuery({
    queryKey: ["admin-message-usage"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const [usageRes, profsRes, subsRes, limitsRes] = await Promise.all([
        api.from("daily_message_usage").select("*").eq("usage_date", today),
        api.from("professionals").select("id, name, business_name, email"),
        api.from("subscriptions").select("professional_id, plan_id"),
        api.from("plan_limits").select("*"),
      ]);

      const usageMap = new Map((usageRes.data || []).map(u => [u.professional_id, u]));
      const subsMap = new Map((subsRes.data || []).map(s => [s.professional_id, s.plan_id]));
      const limitsMap = new Map((limitsRes.data || []).map(l => [l.plan_id, l]));

      return (profsRes.data || []).map(p => {
        const planId = subsMap.get(p.id) || "free";
        const limits = limitsMap.get(planId) || { daily_reminders: 5, daily_campaigns: 0, campaign_max_contacts: 0, campaign_min_interval_hours: 6 };
        const usage = usageMap.get(p.id);
        return {
          ...p,
          planId,
          limits,
          reminders_sent: usage?.reminders_sent || 0,
          campaigns_sent: usage?.campaigns_sent || 0,
        };
      });
    },
  });
};

const AdminMessageUsage = () => {
  const { data, isLoading } = useAdminMessageUsage();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const filtered = (data || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.business_name || "").toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  // Only show professionals who have usage today or sort by usage desc
  const sorted = [...filtered].sort((a, b) => 
    (b.reminders_sent + b.campaigns_sent) - (a.reminders_sent + a.campaigns_sent)
  );

  const planLabels: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro" };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Consumo de mensagens de cada profissional no dia de hoje.</p>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar profissional..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map((p, i) => {
          const reminderMax = p.limits.daily_reminders;
          const campaignMax = p.limits.daily_campaigns;
          const reminderPct = reminderMax === -1 ? 0 : reminderMax > 0 ? Math.min((p.reminders_sent / reminderMax) * 100, 100) : 0;
          const campaignPct = campaignMax === -1 ? 0 : campaignMax > 0 ? Math.min((p.campaigns_sent / campaignMax) * 100, 100) : 0;
          const hasUsage = p.reminders_sent > 0 || p.campaigns_sent > 0;

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn("glass-card rounded-2xl p-4 space-y-3", !hasUsage && "opacity-60")}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name || "Sem nome"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.business_name || p.email}</p>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                  p.planId === "pro" ? "bg-accent/10 text-accent" :
                  p.planId === "starter" ? "bg-blue-500/10 text-blue-500" :
                  "bg-muted text-muted-foreground"
                )}>
                  {planLabels[p.planId] || p.planId}
                </span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock size={10} /> Lembretes
                    </span>
                    <span className={cn("font-semibold", reminderPct >= 80 && reminderMax !== -1 ? "text-destructive" : "text-foreground")}>
                      {p.reminders_sent}{reminderMax === -1 ? " / ∞" : ` / ${reminderMax}`}
                    </span>
                  </div>
                  {reminderMax !== -1 ? (
                    <Progress value={reminderPct} className="h-1.5" />
                  ) : (
                    <div className="h-1.5 rounded-full bg-accent/20" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Send size={10} /> Campanhas
                    </span>
                    <span className={cn("font-semibold", campaignPct >= 80 && campaignMax !== -1 ? "text-destructive" : "text-foreground")}>
                      {p.campaigns_sent}{campaignMax === -1 ? " / ∞" : ` / ${campaignMax}`}
                    </span>
                  </div>
                  {campaignMax !== -1 ? (
                    <Progress value={campaignPct} className="h-1.5" />
                  ) : (
                    <div className="h-1.5 rounded-full bg-accent/20" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">Nenhum profissional encontrado</div>
      )}
      <p className="text-xs text-muted-foreground">{sorted.length} profissionais</p>
    </div>
  );
};

export default AdminMessageUsage;
