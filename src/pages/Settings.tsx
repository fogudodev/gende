import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { User, Bell, CreditCard, Globe, Shield, Palette } from "lucide-react";

const sections = [
  { icon: User, title: "Perfil", description: "Dados pessoais e informações do negócio" },
  { icon: Bell, title: "Notificações", description: "Preferências de alertas e lembretes" },
  { icon: CreditCard, title: "Assinatura", description: "Plano atual, pagamentos e faturamento" },
  { icon: Globe, title: "Página Pública", description: "URL, cores e personalização da página" },
  { icon: Shield, title: "Segurança", description: "Senha, autenticação e sessões" },
  { icon: Palette, title: "Aparência", description: "Tema, idioma e exibição" },
];

const Settings = () => {
  return (
    <DashboardLayout title="Configurações" subtitle="Gerencie sua conta">
      <div className="max-w-3xl space-y-4">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover-lift group"
          >
            <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
              <section.icon size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
