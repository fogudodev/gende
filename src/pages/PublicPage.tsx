import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Globe, ExternalLink, Palette, Image, Type } from "lucide-react";

const PublicPage = () => {
  return (
    <DashboardLayout title="Página Pública" subtitle="Personalize sua página de agendamento">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Globe size={20} className="text-accent" />
              <h3 className="font-semibold text-foreground">URL Personalizada</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">glow.app/</span>
              <input
                type="text"
                defaultValue="ana-beauty"
                className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </motion.div>

          {[
            { icon: Palette, title: "Cor Principal", description: "Escolha a cor que representa sua marca" },
            { icon: Image, title: "Logo e Foto", description: "Upload da logo e foto profissional" },
            { icon: Type, title: "Textos", description: "Título, descrição e mensagem de boas-vindas" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="glass-card rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover-lift"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <item.icon size={18} className="text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Preview</h3>
            <button className="flex items-center gap-1.5 text-sm text-accent hover:underline">
              <ExternalLink size={14} />
              Abrir
            </button>
          </div>
          <div className="aspect-[9/16] rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Preview da página pública</p>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default PublicPage;
