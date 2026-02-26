import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useBookings } from "@/hooks/useBookings";

const stages = [
  { key: "pending", title: "Pendentes", description: "Aguardando confirmação", color: "bg-warning" },
  { key: "confirmed", title: "Confirmados", description: "Prontos para atendimento", color: "bg-info" },
  { key: "completed", title: "Concluídos", description: "Serviço finalizado", color: "bg-success" },
  { key: "cancelled", title: "Cancelados", description: "Foram cancelados", color: "bg-destructive" },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const CustomerJourney = () => {
  const { data: bookings } = useBookings();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  // Group bookings by status
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = { pending: [], confirmed: [], completed: [], cancelled: [] };
    (bookings || []).forEach(b => {
      const status = b.status as string;
      if (map[status]) map[status].push(b);
      // no_show goes to cancelled
      if (status === "no_show" && map.cancelled) map.cancelled.push(b);
    });
    return map;
  }, [bookings]);

  // Unique clients from bookings
  const uniqueClients = useMemo(() => {
    const seen = new Map<string, { name: string; id: string }>();
    (bookings || []).forEach(b => {
      const name = b.client_name || b.clients?.name || "";
      if (name && !seen.has(name)) {
        seen.set(name, { name, id: b.id });
      }
    });
    return Array.from(seen.values());
  }, [bookings]);

  // Filter by selected client
  const filteredGrouped = useMemo(() => {
    if (!selectedClient) return grouped;
    const filtered: Record<string, any[]> = {};
    for (const key in grouped) {
      filtered[key] = grouped[key].filter(b =>
        (b.client_name || b.clients?.name || "") === selectedClient
      );
    }
    return filtered;
  }, [grouped, selectedClient]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass-card rounded-2xl p-4 md:p-6 lg:p-8"
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground font-display mb-1">
          Jornada do Cliente
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          {selectedClient ? `Filtrando: ${selectedClient}` : "Acompanhe o progresso dos agendamentos"}
        </p>
      </div>

      {/* Client avatars row */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {uniqueClients.map((client) => {
          const isSelected = selectedClient === client.name;
          return (
            <button
              key={client.id}
              onClick={() => setSelectedClient(isSelected ? null : client.name)}
              className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-semibold border-2 shadow-md hover:scale-110 transition-all cursor-pointer ${
                isSelected
                  ? "gradient-primary text-white border-primary ring-2 ring-primary/30 scale-110"
                  : "gradient-primary text-white border-background"
              }`}
              title={client.name}
            >
              {getInitials(client.name)}
            </button>
          );
        })}
        {uniqueClients.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum agendamento encontrado</p>
        )}
      </div>

      {/* Kanban stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stages.map((stage) => {
          const items = filteredGrouped[stage.key] || [];
          return (
            <div key={stage.key} className="flex flex-col">
              <div className="mb-2.5 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <h3 className="font-semibold text-foreground text-xs md:text-sm">
                  {stage.title}
                  <span className="ml-1.5 text-muted-foreground font-normal">({items.length})</span>
                </h3>
              </div>

              <div className="space-y-2 flex-1">
                {items.length === 0 ? (
                  <div className="bg-secondary/20 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Nenhum</p>
                  </div>
                ) : (
                  items.map((booking) => {
                    const name = booking.client_name || booking.clients?.name || "—";
                    return (
                      <div
                        key={booking.id}
                        className="bg-secondary/40 rounded-xl p-3 hover:bg-secondary/70 transition-all duration-200 border border-border/50 hover:border-primary/20 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${stage.color}/20 flex items-center justify-center text-[10px] md:text-xs font-bold flex-shrink-0`}
                          >
                            {getInitials(name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-medium text-foreground truncate">
                              {name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {booking.services?.name || "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CustomerJourney;
