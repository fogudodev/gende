import { motion } from "framer-motion";
import { useProfessional } from "@/hooks/useProfessional";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const HeroSection = () => {
  const { data: professional } = useProfessional();
  const { data: stats } = useDashboardStats();
  const { currentPlan } = useFeatureAccess();

  const planLabel = currentPlan === "enterprise" ? "Enterprise" : currentPlan === "essencial" ? "Essencial" : "Sem plano";
  const displayName = professional?.business_name || professional?.name || "Profissional";
  const todayCount = stats?.todayCount ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative h-40 md:h-56 lg:h-64 rounded-2xl overflow-hidden glow-border"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-purple-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(336,100%,50%,0.15),_transparent_60%)]" />
      
      {/* Content */}
      <div className="relative h-full flex items-end p-5 md:p-8">
        <div className="flex-1">
          <div className="mb-2">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              {displayName} | {planLabel}
            </span>
          </div>
          <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-foreground font-display mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            Você tem <span className="text-primary font-semibold">{todayCount} agendamento{todayCount !== 1 ? "s" : ""}</span> hoje
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 w-16 h-16 md:w-24 md:h-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute bottom-0 right-1/4 w-32 h-32 rounded-full bg-purple-500/5 blur-3xl" />
    </motion.div>
  );
};

export default HeroSection;
