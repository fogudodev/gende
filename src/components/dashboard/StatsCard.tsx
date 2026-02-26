import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
}

const StatsCard = ({ title, value, change, changeType = "neutral", icon: Icon, delay = 0 }: StatsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card rounded-2xl p-4 md:p-6 hover-lift group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 md:space-y-3 flex-1 min-w-0">
          <p className="text-[11px] md:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-xl md:text-3xl font-bold text-foreground tracking-tight font-display">{value}</p>
          {change && (
            <p
              className={`text-[10px] md:text-xs font-medium ${
                changeType === "positive"
                  ? "text-success"
                  : changeType === "negative"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {change}
            </p>
          )}
        </div>
        <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl gradient-accent flex items-center justify-center stat-glow flex-shrink-0 group-hover:scale-110 transition-transform">
          <Icon size={18} className="text-accent-foreground md:hidden" />
          <Icon size={22} className="text-accent-foreground hidden md:block" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
