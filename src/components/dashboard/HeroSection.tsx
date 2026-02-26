import { useProfessional } from "@/hooks/useProfessional";

const HeroSection = () => {
  const { data: professional } = useProfessional();

  return (
    <div className="relative h-48 md:h-64 lg:h-80 rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-gradient-to-br from-primary to-accent">
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/30 to-transparent flex items-end">
        <div className="p-5 md:p-8">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2">
            Bem-vindo, {professional?.name?.split(" ")[0] || "Profissional"}
          </h2>
          <p className="text-white/90 text-xs md:text-sm lg:text-base">
            Gerencie seus agendamentos, clientes e serviços com elegância
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
