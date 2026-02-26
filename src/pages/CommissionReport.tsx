import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useCommissions } from "@/hooks/useCommissions";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { useProfessional } from "@/hooks/useProfessional";
import { FileDown, Filter, DollarSign, Clock, CheckCircle2, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const CommissionReport = () => {
  const { data: professional } = useProfessional();
  const { data: commissions, isLoading } = useCommissions();
  const { data: employees } = useSalonEmployees();

  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!commissions) return [];
    return commissions.filter((c) => {
      const date = parseISO(c.created_at);
      const inRange = isWithinInterval(date, {
        start: parseISO(startDate),
        end: new Date(parseISO(endDate).getTime() + 86400000),
      });
      const matchEmployee = selectedEmployee === "all" || c.employee_id === selectedEmployee;
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return inRange && matchEmployee && matchStatus;
    });
  }, [commissions, startDate, endDate, selectedEmployee, statusFilter]);

  const totalPending = filtered.filter((c) => c.status === "pending").reduce((s, c) => s + c.commission_amount, 0);
  const totalPaid = filtered.filter((c) => c.status === "paid").reduce((s, c) => s + c.commission_amount, 0);
  const totalAll = filtered.reduce((s, c) => s + c.commission_amount, 0);

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees?.forEach((e) => (map[e.id] = e.name));
    return map;
  }, [employees]);

  const byEmployee = useMemo(() => {
    const map: Record<string, { name: string; total: number; pending: number; paid: number; count: number }> = {};
    filtered.forEach((c) => {
      if (!map[c.employee_id]) {
        map[c.employee_id] = { name: employeeMap[c.employee_id] || "—", total: 0, pending: 0, paid: 0, count: 0 };
      }
      map[c.employee_id].total += c.commission_amount;
      map[c.employee_id].count++;
      if (c.status === "pending") map[c.employee_id].pending += c.commission_amount;
      else if (c.status === "paid") map[c.employee_id].paid += c.commission_amount;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered, employeeMap]);

  const exportPDF = () => {
    const title = `Relatório de Comissões — ${format(parseISO(startDate), "dd/MM/yyyy")} a ${format(parseISO(endDate), "dd/MM/yyyy")}`;
    const win = window.open("", "_blank");
    if (!win) return;

    const rows = filtered
      .map(
        (c) =>
          `<tr>
            <td>${format(parseISO(c.created_at), "dd/MM/yyyy")}</td>
            <td>${employeeMap[c.employee_id] || "—"}</td>
            <td>R$ ${c.booking_amount.toFixed(2)}</td>
            <td>${c.commission_percentage}%</td>
            <td>R$ ${c.commission_amount.toFixed(2)}</td>
            <td>${c.status === "paid" ? "Pago" : "Pendente"}</td>
          </tr>`
      )
      .join("");

    const summaryRows = byEmployee
      .map(
        (e) =>
          `<tr><td>${e.name}</td><td>${e.count}</td><td>R$ ${e.pending.toFixed(2)}</td><td>R$ ${e.paid.toFixed(2)}</td><td><strong>R$ ${e.total.toFixed(2)}</strong></td></tr>`
      )
      .join("");

    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:30px;color:#222}
        h1{font-size:18px;margin-bottom:4px}
        h2{font-size:14px;color:#666;margin-bottom:20px}
        h3{font-size:15px;margin-top:30px;margin-bottom:8px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f5f5f5;font-weight:600}
        .stats{display:flex;gap:20px;margin-bottom:20px}
        .stat{border:1px solid #ddd;border-radius:8px;padding:12px 16px;flex:1}
        .stat-value{font-size:20px;font-weight:700}
        .stat-label{font-size:11px;color:#888}
        @media print{body{padding:10px}}
      </style>
    </head><body>
      <h1>${professional?.business_name || professional?.name || "Relatório"}</h1>
      <h2>${title}</h2>
      <div class="stats">
        <div class="stat"><div class="stat-value">R$ ${totalAll.toFixed(2)}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-value">R$ ${totalPending.toFixed(2)}</div><div class="stat-label">Pendente</div></div>
        <div class="stat"><div class="stat-value">R$ ${totalPaid.toFixed(2)}</div><div class="stat-label">Pago</div></div>
      </div>
      <h3>Resumo por Profissional</h3>
      <table><thead><tr><th>Profissional</th><th>Qtd</th><th>Pendente</th><th>Pago</th><th>Total</th></tr></thead><tbody>${summaryRows}</tbody></table>
      <h3>Detalhamento</h3>
      <table><thead><tr><th>Data</th><th>Profissional</th><th>Serviço</th><th>%</th><th>Comissão</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <DashboardLayout title="Relatório de Comissões" subtitle="Filtros por período, profissional e status">
      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Profissional</label>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="all">Todos</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Comissões", value: `R$ ${totalAll.toFixed(2)}`, icon: DollarSign },
          { label: "Pendentes", value: `R$ ${totalPending.toFixed(2)}`, icon: Clock },
          { label: "Pagas", value: `R$ ${totalPaid.toFixed(2)}`, icon: CheckCircle2 },
          { label: "Profissionais", value: String(byEmployee.length), icon: Users },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <s.icon size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Export button */}
      <div className="flex justify-end mb-4">
        <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <FileDown size={16} />
          Exportar PDF
        </button>
      </div>

      {/* Summary by employee */}
      {byEmployee.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Resumo por Profissional</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Profissional</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Qtd</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Pendente</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Pago</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {byEmployee.map((e, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 text-foreground">{e.name}</td>
                    <td className="py-2 text-right text-foreground">{e.count}</td>
                    <td className="py-2 text-right text-warning">R$ {e.pending.toFixed(2)}</td>
                    <td className="py-2 text-right text-success">R$ {e.paid.toFixed(2)}</td>
                    <td className="py-2 text-right font-semibold text-foreground">R$ {e.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Detail table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma comissão encontrada no período</div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Detalhamento ({filtered.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Data</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Profissional</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Serviço</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">%</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Comissão</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 text-foreground">{format(parseISO(c.created_at), "dd/MM/yy")}</td>
                    <td className="py-2 text-foreground">{employeeMap[c.employee_id] || "—"}</td>
                    <td className="py-2 text-right text-foreground">R$ {c.booking_amount.toFixed(2)}</td>
                    <td className="py-2 text-right text-foreground">{c.commission_percentage}%</td>
                    <td className="py-2 text-right font-medium text-foreground">R$ {c.commission_amount.toFixed(2)}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {c.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default CommissionReport;
