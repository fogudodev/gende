import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Clock, DollarSign, MoreVertical } from "lucide-react";

const services = [
  { name: "Corte Feminino", duration: 45, price: 80, category: "Cabelo", active: true },
  { name: "Coloração", duration: 120, price: 250, category: "Cabelo", active: true },
  { name: "Escova Progressiva", duration: 180, price: 350, category: "Cabelo", active: true },
  { name: "Manicure", duration: 40, price: 45, category: "Unhas", active: true },
  { name: "Pedicure", duration: 50, price: 55, category: "Unhas", active: true },
  { name: "Hidratação", duration: 60, price: 120, category: "Tratamento", active: false },
  { name: "Design de Sobrancelha", duration: 30, price: 40, category: "Estética", active: true },
  { name: "Corte Masculino", duration: 30, price: 50, category: "Cabelo", active: true },
];

const Services = () => {
  return (
    <DashboardLayout title="Serviços" subtitle="Gerencie seus serviços e preços">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2">
          {["Todos", "Cabelo", "Unhas", "Tratamento", "Estética"].map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                cat === "Todos"
                  ? "gradient-accent text-accent-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover-lift">
          <Plus size={16} />
          Novo Serviço
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {services.map((service, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="glass-card rounded-2xl p-5 hover-lift group"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{service.name}</h3>
                <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md mt-1 inline-block">
                  {service.category}
                </span>
              </div>
              <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted/50 transition-all">
                <MoreVertical size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock size={14} />
                <span>{service.duration} min</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <DollarSign size={14} className="text-accent" />
                <span>R$ {service.price}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  service.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {service.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Services;
