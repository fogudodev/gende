import { motion } from "framer-motion";
import { MessageSquare, Send, Users, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCampaignLimits } from "@/hooks/useCampaigns";

const MessageUsage = () => {
  const { data, isLoading } = useCampaignLimits();

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const limits = data.limits || { daily_reminders: 0, daily_campaigns: 0, campaign_max_contacts: 0, campaign_min_interval_hours: 6 };
  const usage = data.usage || { reminders_sent: 0, campaigns_sent: 0 };
  const planId = data.planId || "free";
  const planLabels: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro" };

  const items = [
    {
      label: "Lembretes hoje",
      used: usage.reminders_sent,
      max: limits.daily_reminders,
      icon: Clock,
    },
    {
      label: "Campanhas hoje",
      used: usage.campaigns_sent,
      max: limits.daily_campaigns,
      icon: Send,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-5 md:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center stat-glow">
            <MessageSquare size={18} className="text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Uso de Mensagens</h3>
            <p className="text-[10px] text-muted-foreground">Plano {planLabels[planId] || planId}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isUnlimited = item.max === -1;
          const pct = isUnlimited ? 0 : item.max > 0 ? Math.min((item.used / item.max) * 100, 100) : 0;
          const isNearLimit = !isUnlimited && pct >= 80;

          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                  <item.icon size={12} />
                  {item.label}
                </span>
                <span className={`font-semibold ${isNearLimit ? "text-destructive" : "text-foreground"}`}>
                  {item.used}{isUnlimited ? " / ∞" : ` / ${item.max}`}
                </span>
              </div>
              {!isUnlimited && (
                <Progress
                  value={pct}
                  className="h-2"
                />
              )}
              {isUnlimited && (
                <div className="h-2 rounded-full bg-accent/20 overflow-hidden">
                  <div className="h-full bg-accent/40 rounded-full w-full" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
        Máx. {limits.campaign_max_contacts === -1 ? "∞" : limits.campaign_max_contacts} contatos/campanha · Intervalo mín. {limits.campaign_min_interval_hours}h
      </div>
    </motion.div>
  );
};

export default MessageUsage;
