import { useState } from "react";
import { useCashRegisters } from "@/hooks/useCashRegister";
import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  CreditCard,
  QrCode,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type CashRegister = Tables<"cash_registers">;
type CashTransaction = Tables<"cash_transactions">;

interface Props {
  professionalId: string | undefined;
}

const paymentMethodLabel: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  card: "Cartão",
  other: "Outro",
};

const paymentMethodIcon: Record<string, typeof DollarSign> = {
  cash: Banknote,
  pix: QrCode,
  card: CreditCard,
  other: DollarSign,
};

const CashRegisterReport = ({ professionalId }: Props) => {
  const { data: registers } = useCashRegisters(professionalId, 50);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string | null>(null);

  const closedRegisters = (registers || []).filter((r: CashRegister) => r.status === "closed");

  const { data: selectedTransactions } = useQuery({
    queryKey: ["cash-transactions-report", selectedRegisterId],
    queryFn: async () => {
      const { data, error } = await api
        .from("cash_transactions")
        .select("*")
        .eq("cash_register_id", selectedRegisterId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CashTransaction[];
    },
    enabled: !!selectedRegisterId,
  });

  const selectedRegister = closedRegisters.find((r: CashRegister) => r.id === selectedRegisterId);

  const getPaymentTotals = (transactions: CashTransaction[]) => {
    const totals: Record<string, { entries: number; withdrawals: number }> = {};
    for (const tx of transactions) {
      const method = tx.payment_method || "other";
      if (!totals[method]) totals[method] = { entries: 0, withdrawals: 0 };
      if (tx.type === "entry") totals[method].entries += Number(tx.amount);
      else totals[method].withdrawals += Number(tx.amount);
    }
    return totals;
  };

  // Summary stats
  const totalRegisters = closedRegisters.length;
  const totalRevenue = closedRegisters.reduce((sum: number, r: CashRegister) => sum + Number(r.closing_amount || 0), 0);
  const totalDifference = closedRegisters.reduce((sum: number, r: CashRegister) => {
    if (r.expected_amount == null) return sum;
    return sum + (Number(r.closing_amount || 0) - Number(r.expected_amount));
  }, 0);

  if (!closedRegisters.length) {
    return (
      <Card className="p-6 text-center">
        <CalendarDays className="mx-auto text-muted-foreground mb-3" size={32} />
        <p className="text-sm text-muted-foreground">Nenhum caixa fechado para exibir no relatório</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Caixas fechados</p>
          <p className="text-2xl font-bold">{totalRegisters}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total fechado</p>
          <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Diferença acumulada</p>
          <p className={`text-2xl font-bold ${totalDifference >= 0 ? "text-success" : "text-destructive"}`}>
            {totalDifference >= 0 ? "+" : ""}R$ {totalDifference.toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Register List */}
      <div className="space-y-2">
        {closedRegisters.map((r: CashRegister) => {
          const diff = r.expected_amount != null ? Number(r.closing_amount || 0) - Number(r.expected_amount) : null;
          return (
            <Card
              key={r.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRegisterId(r.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <CalendarDays size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {format(new Date(r.opened_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.opened_at), "HH:mm")} — {r.closed_at ? format(new Date(r.closed_at), "HH:mm") : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold">R$ {Number(r.closing_amount || 0).toFixed(2)}</p>
                    {diff != null && diff !== 0 && (
                      <Badge variant={diff > 0 ? "default" : "destructive"} className="text-xs">
                        {diff > 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                        {diff > 0 ? "+" : ""}R$ {diff.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRegisterId} onOpenChange={(open) => { if (!open) setSelectedRegisterId(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Caixa — {selectedRegister && format(new Date(selectedRegister.opened_at), "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          {selectedRegister && selectedTransactions && (
            <div className="space-y-4 mt-2">
              {/* Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground">Abertura</p>
                  <p className="font-bold">R$ {Number(selectedRegister.opening_amount).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground">Fechamento</p>
                  <p className="font-bold">R$ {Number(selectedRegister.closing_amount || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Payment Method Totals */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Totais por forma de pagamento</h4>
                <div className="space-y-2">
                  {Object.entries(getPaymentTotals(selectedTransactions)).map(([method, totals]) => {
                    const Icon = paymentMethodIcon[method] || DollarSign;
                    return (
                      <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-muted-foreground" />
                          <span className="text-sm font-medium">{paymentMethodLabel[method] || method}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {totals.entries > 0 && (
                            <span className="text-success flex items-center gap-1">
                              <ArrowDownCircle size={12} /> +R$ {totals.entries.toFixed(2)}
                            </span>
                          )}
                          {totals.withdrawals > 0 && (
                            <span className="text-destructive flex items-center gap-1">
                              <ArrowUpCircle size={12} /> -R$ {totals.withdrawals.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transaction List */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Movimentações ({selectedTransactions.length})</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {selectedTransactions.map((tx: CashTransaction) => {
                    const Icon = paymentMethodIcon[tx.payment_method || "other"] || DollarSign;
                    const isEntry = tx.type === "entry";
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/10 border border-border text-sm">
                        <div className="flex items-center gap-2">
                          {isEntry ? (
                            <ArrowDownCircle size={12} className="text-success" />
                          ) : (
                            <ArrowUpCircle size={12} className="text-destructive" />
                          )}
                          <span className="truncate max-w-[200px]">{tx.description || (isEntry ? "Entrada" : "Sangria")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon size={12} className="text-muted-foreground" />
                          <span className={`font-semibold ${isEntry ? "text-success" : "text-destructive"}`}>
                            {isEntry ? "+" : "-"}R$ {Number(tx.amount).toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "HH:mm")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedRegister.notes && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{selectedRegister.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashRegisterReport;
