import { motion } from "framer-motion";

const fakeServices = [
  { id: "1", name: "Corte + Escova", active: true, duration: 60, price: 120 },
  { id: "2", name: "Coloração Completa", active: true, duration: 120, price: 280 },
  { id: "3", name: "Manicure + Pedicure", active: true, duration: 90, price: 95 },
  { id: "4", name: "Hidratação Profunda", active: true, duration: 45, price: 85 },
  { id: "5", name: "Progressiva", active: false, duration: 180, price: 350 },
];

const ServicesOverview = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card rounded-2xl p-4 md:p-6 lg:p-8"
    >
      <div className="mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-bold text-foreground font-display">Serviços</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Top serviços cadastrados</p>
      </div>

      {/* Mobile: cards */}
      <div className="block md:hidden space-y-2">
        {fakeServices.map((service) => (
          <div key={service.id} className="bg-secondary/40 rounded-xl p-3 border border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-foreground">{service.name}</p>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  service.active
                    ? "bg-success/15 text-success border border-success/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {service.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{service.duration} min</span>
              <span className="font-semibold text-foreground">
                R$ {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Serviço</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duração</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preço</th>
            </tr>
          </thead>
          <tbody>
            {fakeServices.map((service) => (
              <tr key={service.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="py-3 px-4 text-sm text-foreground font-medium">{service.name}</td>
                <td className="py-3 px-4 text-sm">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      service.active
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {service.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{service.duration} min</td>
                <td className="py-3 px-4 text-sm text-foreground text-right font-medium">
                  R$ {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ServicesOverview;
