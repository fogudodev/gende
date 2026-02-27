import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfessional } from "@/hooks/useProfessional";
import { useReceptionEmployee } from "@/hooks/useReceptionEmployee";
import {
  useOpenCashRegister,
  useCashRegisters,
  useCashTransactions,
  useOpenCashRegisterMutation,
  useCloseCashRegisterMutation,
  useAddCashTransaction,
} from "@/hooks/useCashRegister";
import CashRegisterReport from "@/components/cash-register/CashRegisterReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  Plus,
  Minus,
  Lock,
  Unlock,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CreditCard,
  QrCode,
  Clock,
  Loader2,
  FileBarChart,
} from "lucide-react";
import { format } from "date-fns";

const CashRegister = () => {
  const { data: professional } = useProfessional();
  const { data: reception } = useReceptionEmployee();
  const profId = professional?.id || reception?.salon_id;
  const employeeId = reception?.id || undefined;

  const { data: openRegister, isLoading: loadingOpen } = useOpenCashRegister(profId);
  const { data: registers } = useCashRegisters(profId);
  const { data: transactions } = useCashTransactions(openRegister?.id);

  const openMutation = useOpenCashRegisterMutation();
  const closeMutation = useCloseCashRegisterMutation();
  const addTransaction = useAddCashTransaction();

  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "entry",
    amount: "",
    payment_method: "cash",
    description: "",
  });

  const handleOpenCash = () => {
    if (!profId) return;
    openMutation.mutate({
      professionalId: profId,
      openedBy: employeeId,
      openingAmount: Number(openingAmount) || 0,
    });
    setOpeningAmount("");
  };

  const handleCloseCash = () => {
    if (!openRegister) return;
    const expected = Number(openRegister.opening_amount) + totalEntries - totalWithdrawals;
    closeMutation.mutate({
      id: openRegister.id,
      closingAmount: Number(closingAmount) || 0,
      expectedAmount: expected,
      notes: closingNotes,
    });
    setCloseDialogOpen(false);
    setClosingAmount("");
    setClosingNotes("");
  };

  const handleAddTransaction = () => {
    if (!openRegister || !profId) return;
    addTransaction.mutate({
      cash_register_id: openRegister.id,
      professional_id: profId,
      type: txForm.type,
      amount: Number(txForm.amount) || 0,
      payment_method: txForm.payment_method,
      description: txForm.description,
      created_by: employeeId,
    });
    setTxDialogOpen(false);
    setTxForm({ type: "entry", amount: "", payment_method: "cash", description: "" });
  };

  const totalEntries = (transactions || [])
    .filter((t: any) => t.type === "entry")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const totalWithdrawals = (transactions || [])
    .filter((t: any) => t.type === "withdrawal")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const currentBalance = Number(openRegister?.opening_amount || 0) + totalEntries - totalWithdrawals;

  const paymentMethodLabel: Record<string, string> = {
    cash: "Dinheiro",
    pix: "PIX",
    card: "Cartão",
    other: "Outro",
  };

  const paymentMethodIcon: Record<string, any> = {
    cash: Banknote,
    pix: QrCode,
    card: CreditCard,
    other: DollarSign,
  };

  if (loadingOpen) {
    return (
      <DashboardLayout title="Caixa">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Caixa">
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList>
          <TabsTrigger value="daily" className="gap-2">
            <DollarSign size={14} />
            Caixa do Dia
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileBarChart size={14} />
            Relatório
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          {/* Open Cash Register */}
          {!openRegister ? (
            <Card className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Lock size={28} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Caixa Fechado</h2>
                  <p className="text-sm text-muted-foreground mt-1">Abra o caixa para começar a registrar movimentações</p>
                </div>
                <div className="w-full max-w-xs space-y-3">
                  <div>
                    <Label className="text-sm">Valor inicial (troco)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  <Button onClick={handleOpenCash} className="w-full gap-2" disabled={openMutation.isPending}>
                    <Unlock size={16} />
                    Abrir Caixa
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Active Cash Register */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Unlock size={18} className="text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Abertura</p>
                      <p className="font-bold text-lg">R$ {Number(openRegister.opening_amount).toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <ArrowDownCircle size={18} className="text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Entradas</p>
                      <p className="font-bold text-lg text-success">R$ {totalEntries.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo Atual</p>
                      <p className="font-bold text-lg">R$ {currentBalance.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => { setTxForm({ ...txForm, type: "entry" }); setTxDialogOpen(true); }} className="gap-2">
                  <Plus size={16} />
                  Registrar Entrada
                </Button>
                <Button variant="outline" onClick={() => { setTxForm({ ...txForm, type: "withdrawal" }); setTxDialogOpen(true); }} className="gap-2">
                  <Minus size={16} />
                  Sangria
                </Button>
                <Button variant="destructive" onClick={() => setCloseDialogOpen(true)} className="gap-2 ml-auto">
                  <Lock size={16} />
                  Fechar Caixa
                </Button>
              </div>

              {/* Transactions */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  Movimentações do Dia
                </h3>
                {!transactions?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação registrada</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {transactions.map((tx: any) => {
                      const Icon = paymentMethodIcon[tx.payment_method] || DollarSign;
                      const isEntry = tx.type === "entry";
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEntry ? "bg-success/10" : "bg-destructive/10"}`}>
                              {isEntry ? <ArrowDownCircle size={14} className="text-success" /> : <ArrowUpCircle size={14} className="text-destructive" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tx.description || (isEntry ? "Entrada" : "Sangria")}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Icon size={12} />
                                <span>{paymentMethodLabel[tx.payment_method] || tx.payment_method}</span>
                                <span>• {format(new Date(tx.created_at), "HH:mm")}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`font-bold ${isEntry ? "text-success" : "text-destructive"}`}>
                            {isEntry ? "+" : "-"}R$ {Number(tx.amount).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="report">
          <CashRegisterReport professionalId={profId} />
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <Dialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{txForm.type === "entry" ? "Registrar Entrada" : "Registrar Sangria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={txForm.payment_method} onValueChange={(v) => setTxForm({ ...txForm, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                placeholder="Ex: Pagamento corte masculino"
              />
            </div>
            <Button onClick={handleAddTransaction} className="w-full" disabled={!txForm.amount || addTransaction.isPending}>
              {txForm.type === "entry" ? "Registrar Entrada" : "Registrar Sangria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Abertura</span>
                <span>R$ {Number(openRegister?.opening_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entradas</span>
                <span className="text-success">+R$ {totalEntries.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sangrias</span>
                <span className="text-destructive">-R$ {totalWithdrawals.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-bold">
                <span>Esperado</span>
                <span>R$ {currentBalance.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <Label>Valor real em caixa *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Input
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button variant="destructive" onClick={handleCloseCash} className="w-full" disabled={!closingAmount || closeMutation.isPending}>
              <Lock size={16} className="mr-2" />
              Confirmar Fechamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CashRegister;
