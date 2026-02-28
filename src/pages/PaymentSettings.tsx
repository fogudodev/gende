import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePaymentConfig, useSavePaymentConfig, PaymentConfig } from "@/hooks/usePaymentConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CreditCard, QrCode, Banknote, Save } from "lucide-react";
import { toast } from "sonner";

const PaymentSettings = () => {
  const { data: config, isLoading } = usePaymentConfig();
  const saveConfig = useSavePaymentConfig();

  const [form, setForm] = useState({
    pix_key_type: "cpf" as string,
    pix_key: "",
    pix_beneficiary_name: "",
    signal_enabled: false,
    signal_type: "percentage" as "percentage" | "fixed",
    signal_value: 0,
    accept_pix: true,
    accept_cash: true,
    accept_card: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        pix_key_type: config.pix_key_type || "cpf",
        pix_key: config.pix_key || "",
        pix_beneficiary_name: config.pix_beneficiary_name || "",
        signal_enabled: config.signal_enabled,
        signal_type: config.signal_type,
        signal_value: config.signal_value,
        accept_pix: config.accept_pix,
        accept_cash: config.accept_cash,
        accept_card: config.accept_card,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.accept_pix && !form.pix_key.trim()) {
      return toast.error("Informe a chave PIX para aceitar pagamentos via PIX");
    }
    await saveConfig.mutateAsync(form);
  };

  const pixKeyLabels: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "Email",
    phone: "Telefone",
    random: "Chave aleatória",
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Pagamentos">
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Card key={i} className="p-6 animate-pulse"><div className="h-24 bg-muted rounded" /></Card>)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Pagamentos">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Configuração de Pagamento</h1>
          <p className="text-muted-foreground text-sm">Configure como você recebe pagamentos dos seus clientes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Métodos aceitos */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><CreditCard size={18} />Métodos de Pagamento Aceitos</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCode size={18} className="text-muted-foreground" />
                  <Label>PIX</Label>
                </div>
                <Switch checked={form.accept_pix} onCheckedChange={(v) => setForm({ ...form, accept_pix: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Banknote size={18} className="text-muted-foreground" />
                  <Label>Dinheiro</Label>
                </div>
                <Switch checked={form.accept_cash} onCheckedChange={(v) => setForm({ ...form, accept_cash: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-muted-foreground" />
                  <Label>Cartão</Label>
                </div>
                <Switch checked={form.accept_card} onCheckedChange={(v) => setForm({ ...form, accept_card: v })} />
              </div>
            </div>
          </Card>

          {/* Configuração PIX */}
          {form.accept_pix && (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><QrCode size={18} />Dados do PIX</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de chave</Label>
                  <Select value={form.pix_key_type} onValueChange={(v) => setForm({ ...form, pix_key_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(pixKeyLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} placeholder={`Sua chave ${pixKeyLabels[form.pix_key_type]}`} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome do beneficiário</Label>
                <Input value={form.pix_beneficiary_name} onChange={(e) => setForm({ ...form, pix_beneficiary_name: e.target.value })} placeholder="Nome que aparece no PIX" />
              </div>
            </Card>
          )}

          {/* Sinal/Entrada */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cobrança de Sinal (Entrada)</h2>
              <Switch checked={form.signal_enabled} onCheckedChange={(v) => setForm({ ...form, signal_enabled: v })} />
            </div>
            <p className="text-sm text-muted-foreground">Exija um pagamento antecipado para confirmar o agendamento na página pública.</p>

            {form.signal_enabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.signal_type} onValueChange={(v) => setForm({ ...form, signal_type: v as "percentage" | "fixed" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor do sinal</Label>
                  <Input type="number" step="0.01" min={0} max={form.signal_type === "percentage" ? 100 : undefined} value={form.signal_value} onChange={(e) => setForm({ ...form, signal_value: Number(e.target.value) })} />
                </div>
              </div>
            )}
          </Card>

          <Button type="submit" className="gap-2 w-full sm:w-auto" disabled={saveConfig.isPending}>
            <Save size={16} />
            Salvar Configurações
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSettings;
