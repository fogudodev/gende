import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Seg", receita: 420 },
  { name: "Ter", receita: 680 },
  { name: "Qua", receita: 530 },
  { name: "Qui", receita: 890 },
  { name: "Sex", receita: 1200 },
  { name: "Sáb", receita: 1450 },
  { name: "Dom", receita: 320 },
];

const RevenueChart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Receita da Semana</h3>
          <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">R$ 5.490</p>
          <p className="text-xs font-medium text-success">+18% vs semana anterior</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38 70% 55%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(38 70% 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 15% 90%)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(25 10% 50%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(25 10% 50%)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100% / 0.9)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsl(0 0% 100% / 0.2)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px -8px hsl(25 30% 12% / 0.15)",
            }}
            formatter={(value: number) => [`R$ ${value}`, "Receita"]}
          />
          <Area
            type="monotone"
            dataKey="receita"
            stroke="hsl(38 70% 55%)"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RevenueChart;
