import { Plus } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";

const statusLabels: Record<string, { title: string; description: string }> = {
  pending: { title: "Pendentes", description: "Aguardando confirmação" },
  confirmed: { title: "Confirmados", description: "Prontos para atendimento" },
  completed: { title: "Concluídos", description: "Serviço finalizado" },
  cancelled: { title: "Cancelados", description: "Foram cancelados" },
};

const statusColors = [
  "bg-[hsl(38,70%,55%)]",
  "bg-[hsl(210,80%,55%)]",
  "bg-[hsl(152,60%,42%)]",
  "bg-[hsl(0,72%,51%)]",
];

const CustomerJourney = () => {
  const { data: bookings } = useBookings();

  const stages = Object.entries(statusLabels).map(([status, meta], idx) => {
    const items = (bookings || []).filter((b) => b.status === status).slice(0, 4);
    return { ...meta, status, colorIdx: idx, items };
  });

  return (
    <div className="bg-card rounded-2xl p-4 md:p-6 lg:p-8 border border-border/50">
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1">
          Jornada do Cliente
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          Acompanhe o progresso dos agendamentos
        </p>
      </div>

      {/* Kanban stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stages.map((stage, stageIdx) => (
          <div key={stage.status} className="flex flex-col">
            <div className="mb-3">
              <h3 className="font-semibold text-foreground text-sm md:text-base">
                {stage.title}
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({stage.items.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
            </div>

            <div className="space-y-2 flex-1">
              {stage.items.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-background rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-border/50 hover:border-accent/30 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full ${statusColors[stageIdx]} flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-sm flex-shrink-0`}
                    >
                      {(booking.client_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">
                        {booking.client_name || "Cliente"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {stage.items.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2">Nenhum agendamento</p>
              )}

              <button className="w-full py-2 rounded-xl border-2 border-dashed border-border hover:border-accent/40 text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerJourney;
