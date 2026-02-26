import { useServices } from "@/hooks/useServices";

const ServicesOverview = () => {
  const { data: services } = useServices();
  const list = (services || []).slice(0, 5);

  return (
    <div className="bg-card rounded-2xl p-4 md:p-6 lg:p-8 border border-border">
      <div className="mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-bold text-foreground">Serviços Recentes</h3>
      </div>

      {/* Mobile: cards / Desktop: table */}
      <div className="block md:hidden space-y-3">
        {list.map((service) => (
          <div key={service.id} className="bg-background rounded-xl p-3 border border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-foreground">{service.name}</p>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  service.active
                    ? "bg-[hsl(152,60%,42%)/0.15] text-[hsl(152,60%,42%)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {service.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{service.duration_minutes} min</span>
              <span className="font-semibold text-foreground">
                R$ {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Serviço</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Duração</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Preço</th>
            </tr>
          </thead>
          <tbody>
            {list.map((service) => (
              <tr key={service.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                <td className="py-3 px-4 text-sm text-foreground font-medium">{service.name}</td>
                <td className="py-3 px-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      service.active
                        ? "bg-[hsl(152,60%,42%)/0.15] text-[hsl(152,60%,42%)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {service.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{service.duration_minutes} min</td>
                <td className="py-3 px-4 text-sm text-foreground text-right">
                  R$ {service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum serviço cadastrado</p>
      )}
    </div>
  );
};

export default ServicesOverview;
