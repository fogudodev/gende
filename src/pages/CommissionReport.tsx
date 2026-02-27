import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useCommissions } from "@/hooks/useCommissions";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { useProfessional } from "@/hooks/useProfessional";
import { FileDown, Filter, DollarSign, Clock, CheckCircle2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

const CommissionReport = () => {
  const { data: professional } = useProfessional();
  const { data: commissions, isLoading } = useCommissions();
  const { data: employees } = useSalonEmployees();

  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

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
    <DashboardLayout title="Comissões" subtitle="Controle de repasses da equipe">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: totalAll, icon: DollarSign, color: "text-primary" },
          { label: "Pendentes", value: totalPending, icon: Clock, color: "text-yellow-400" },
          { label: "Pagas", value: totalPaid, icon: CheckCircle2, color: "text-green-400" },
          { label: "Profissionais", value: null, count: byEmployee.length, icon: Users, color: "text-muted-foreground" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {s.value !== null ? `R$ ${s.value.toFixed(2)}` : s.count}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Filters + Export */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl mb-6 overflow-hidden"
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filtros</span>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(startDate), "dd/MM")} — {format(parseISO(endDate), "dd/MM")}
              {selectedEmployee !== "all" && ` • ${employeeMap[selectedEmployee] || ""}`}
              {statusFilter !== "all" && ` • ${statusFilter === "paid" ? "Pago" : "Pendente"}`}
            </span>
          </div>
          {showFilters ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>

        {showFilters && (
          <div className="px-5 pb-4 pt-1 border-t border-border/30">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Profissional</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                >
                  <option value="all">Todos</option>
                  {employees?.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="paid">Pago</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Summary by Employee - Card layout */}
      {byEmployee.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Resumo por Profissional</h3>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 text-xs">
              <FileDown size={14} />
              Exportar PDF
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {byEmployee.map((e, i) => {
              const paidPct = e.total > 0 ? (e.paid / e.total) * 100 : 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                  className="glass-card rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{e.name}</p>
                        <p className="text-[11px] text-muted-foreground">{e.count} comiss{e.count === 1 ? "ão" : "ões"}</p>
                      </div>
                    </div>
                    <p className="text-base font-bold text-foreground">R$ {e.total.toFixed(2)}</p>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Pago: R$ {e.paid.toFixed(2)}</span>
                      <span>Pendente: R$ {e.pending.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Detail - Card layout for mobile, table for desktop */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma comissão encontrada no período</div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-sm font-semibold text-foreground mb-3">Detalhamento ({filtered.length})</h3>

          {/* Mobile: Card list */}
          <div className="sm:hidden space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="glass-card rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {(employeeMap[c.employee_id] || "—").charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{employeeMap[c.employee_id] || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{format(parseISO(c.created_at), "dd/MM/yyyy")}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === "paid" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                    {c.status === "paid" ? "Pago" : "Pendente"}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <div className="text-xs text-muted-foreground">
                    Serviço R$ {c.booking_amount.toFixed(2)} × {c.commission_percentage}%
                  </div>
                  <p className="text-sm font-bold text-foreground">R$ {c.commission_amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden sm:block glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Data</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Profissional</th>
                  <th className="text-right px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Serviço</th>
                  <th className="text-right px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">%</th>
                  <th className="text-right px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Comissão</th>
                  <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`border-b border-border/30 hover:bg-muted/10 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="px-5 py-3 text-foreground">{format(parseISO(c.created_at), "dd/MM/yyyy")}</td>
                    <td className="px-5 py-3 text-foreground font-medium">{employeeMap[c.employee_id] || "—"}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">R$ {c.booking_amount.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{c.commission_percentage}%</td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">R$ {c.commission_amount.toFixed(2)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.status === "paid" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                        {c.status === "paid" ? <><CheckCircle2 size={11} /> Pago</> : <><Clock size={11} /> Pendente</>}
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
