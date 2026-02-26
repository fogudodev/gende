import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Search, Phone, Mail, CalendarDays } from "lucide-react";

const clients = [
  { name: "Ana Silva", phone: "(11) 99999-1234", email: "ana@email.com", visits: 12, lastVisit: "22/02/2026" },
  { name: "Maria Santos", phone: "(11) 98888-5678", email: "maria@email.com", visits: 8, lastVisit: "20/02/2026" },
  { name: "Julia Oliveira", phone: "(11) 97777-9012", email: "julia@email.com", visits: 24, lastVisit: "25/02/2026" },
  { name: "Carla Lima", phone: "(11) 96666-3456", email: "carla@email.com", visits: 5, lastVisit: "18/02/2026" },
  { name: "Beatriz Costa", phone: "(11) 95555-7890", email: "beatriz@email.com", visits: 15, lastVisit: "24/02/2026" },
  { name: "Fernanda Alves", phone: "(11) 94444-2345", email: "fernanda@email.com", visits: 3, lastVisit: "10/02/2026" },
];

const Clients = () => {
  return (
    <DashboardLayout title="Clientes" subtitle="Base de clientes e histórico">
      <div className="flex items-center justify-between mb-8">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            className="pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 w-[320px] transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover-lift">
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_100px_120px] gap-4 px-6 py-3 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Cliente</span>
          <span>Telefone</span>
          <span>Email</span>
          <span>Visitas</span>
          <span>Última Visita</span>
        </div>
        {clients.map((client, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="grid grid-cols-[1fr_1fr_1fr_100px_120px] gap-4 px-6 py-4 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer items-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                {client.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-foreground">{client.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone size={13} />
              {client.phone}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail size={13} />
              {client.email}
            </div>
            <span className="text-sm font-semibold text-foreground">{client.visits}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays size={13} />
              {client.lastVisit}
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Clients;
