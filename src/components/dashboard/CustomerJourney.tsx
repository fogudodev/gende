import { Plus } from "lucide-react";
import { motion } from "framer-motion";

const fakeBookings = {
  pending: [
    { id: "1", name: "Mariana Silva", initials: "MS" },
    { id: "2", name: "João Oliveira", initials: "JO" },
    { id: "3", name: "Carla Souza", initials: "CS" },
  ],
  confirmed: [
    { id: "4", name: "Juliana Costa", initials: "JC" },
    { id: "5", name: "Pedro Santos", initials: "PS" },
    { id: "6", name: "Ana Lima", initials: "AL" },
    { id: "7", name: "Bruno Dias", initials: "BD" },
  ],
  completed: [
    { id: "8", name: "Fernanda Gomes", initials: "FG" },
    { id: "9", name: "Rafael Rocha", initials: "RR" },
  ],
  cancelled: [
    { id: "10", name: "Patrícia Martins", initials: "PM" },
  ],
};

const stages = [
  { key: "pending", title: "Pendentes", description: "Aguardando confirmação", color: "bg-warning" },
  { key: "confirmed", title: "Confirmados", description: "Prontos para atendimento", color: "bg-info" },
  { key: "completed", title: "Concluídos", description: "Serviço finalizado", color: "bg-success" },
  { key: "cancelled", title: "Cancelados", description: "Foram cancelados", color: "bg-destructive" },
];

const CustomerJourney = () => {
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
          Acompanhe o progresso dos agendamentos
        </p>
      </div>

      {/* Avatars row */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {Object.values(fakeBookings).flat().slice(0, 8).map((b, i) => (
          <div
            key={b.id}
            className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full gradient-primary flex items-center justify-center text-white text-[10px] md:text-xs font-semibold border-2 border-background shadow-md hover:scale-110 transition-transform cursor-pointer"
          >
            {b.initials}
          </div>
        ))}
        <button className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Kanban stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stages.map((stage) => {
          const items = fakeBookings[stage.key as keyof typeof fakeBookings];
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
                {items.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-secondary/40 rounded-xl p-3 hover:bg-secondary/70 transition-all duration-200 border border-border/50 hover:border-primary/20 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${stage.color}/20 flex items-center justify-center text-[10px] md:text-xs font-bold flex-shrink-0`}
                        style={{ color: `hsl(var(--${stage.color.replace("bg-", "")}))` }}
                      >
                        {booking.initials}
                      </div>
                      <p className="text-xs md:text-sm font-medium text-foreground truncate">
                        {booking.name}
                      </p>
                    </div>
                  </div>
                ))}

                <button className="w-full py-2 rounded-xl border border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors text-[10px] md:text-xs flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" />
                  Adicionar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CustomerJourney;
