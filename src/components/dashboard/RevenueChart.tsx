import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fakeData = [
  { name: "Seg", receita: 420 },
  { name: "Ter", receita: 680 },
  { name: "Qua", receita: 530 },
  { name: "Qui", receita: 910 },
  { name: "Sex", receita: 1240 },
  { name: "Sáb", receita: 1580 },
  { name: "Dom", receita: 340 },
];

const weekTotal = fakeData.reduce((s, d) => s + d.receita, 0);

const RevenueChart = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="glass-card rounded-2xl p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground font-display">Receita da Semana</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Últimos 7 dias</p>
        </div>
        <div className="text-right">
          <p className="text-lg md:text-2xl font-bold text-foreground font-display">R$ {weekTotal.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] md:text-xs text-success font-medium">+18% vs semana anterior</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={fakeData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(336, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(336, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} hide />
          <Tooltip
            contentStyle={{
              background: "hsla(0, 0%, 7%, 0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsla(0, 0%, 100%, 0.1)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px -8px hsla(0, 0%, 0%, 0.5)",
              color: "hsl(0, 0%, 95%)",
            }}
            formatter={(value: number) => [`R$ ${value}`, "Receita"]}
          />
          <Area type="monotone" dataKey="receita" stroke="hsl(336, 100%, 50%)" strokeWidth={2.5} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RevenueChart;
