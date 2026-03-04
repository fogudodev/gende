import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, Coupon } from "@/hooks/useCoupons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Ticket, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MAX_CODE_LENGTH = 30;

const sanitizeCode = (value: string) =>
  value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, MAX_CODE_LENGTH);

const Coupons = () => {
  const { data: coupons, isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage" as "percentage" | "fixed", discount_value: 10, max_uses: null as number | null, is_active: true, valid_until: "" as string, min_amount: 0,
  });

  const resetForm = () => {
    setForm({ code: "", description: "", discount_type: "percentage", discount_value: 10, max_uses: null, is_active: true, valid_until: "", min_amount: 0 });
    setEditing(null);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      max_uses: c.max_uses,
      is_active: c.is_active,
      valid_until: c.valid_until ? format(new Date(c.valid_until), "yyyy-MM-dd") : "",
      min_amount: c.min_amount ?? 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = sanitizeCode(form.code);
    if (!code) return toast.error("Código é obrigatório");
    if (code.length < 3) return toast.error("Código deve ter pelo menos 3 caracteres");

    const discountValue = Math.max(0, form.discount_value);
    if (form.discount_type === "percentage" && discountValue > 100) {
      return toast.error("Percentual não pode ser maior que 100%");
    }
    if (discountValue <= 0) return toast.error("Valor do desconto deve ser maior que zero");

    const payload = {
      code,
      description: form.description.trim() || undefined,
      discount_type: form.discount_type,
      discount_value: discountValue,
      max_uses: form.max_uses,
      is_active: form.is_active,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      min_amount: Math.max(0, form.min_amount),
    };

    try {
      if (editing) {
        await updateCoupon.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createCoupon.mutateAsync(payload);
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Já existe um cupom com este código");
      }
      // other errors already handled by hook toast
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCoupon.mutateAsync(deleteTarget);
    } finally {
      setDeleteTarget(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  return (
    <DashboardLayout title="Cupons">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
            <p className="text-muted-foreground text-sm">Crie e gerencie cupons promocionais</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} />Novo Cupom</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Código * <span className="text-xs text-muted-foreground">({form.code.length}/{MAX_CODE_LENGTH})</span></Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: sanitizeCode(e.target.value) })}
                    placeholder="Ex: DESCONTO10"
                    className="uppercase"
                    maxLength={MAX_CODE_LENGTH}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" maxLength={200} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo de desconto</Label>
                    <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as "percentage" | "fixed" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0.01}
                      max={form.discount_type === "percentage" ? 100 : undefined}
                      value={form.discount_value || ""}
                      onChange={(e) => {
                        let val = Number(e.target.value);
                        if (form.discount_type === "percentage") val = Math.min(100, val);
                        setForm({ ...form, discount_value: Math.max(0, val) });
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Máx. de usos</Label>
                    <Input type="number" min={0} value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : null })} placeholder="Ilimitado" />
                  </div>
                  <div className="space-y-2">
                    <Label>Válido até</Label>
                    <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor mínimo do pedido (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.min_amount || ""}
                    onChange={(e) => setForm({ ...form, min_amount: Math.max(0, Number(e.target.value)) })}
                    placeholder="0,00"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="coupon-active" className="cursor-pointer">Cupom ativo</Label>
                  <Switch id="coupon-active" checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                </div>
                <Button type="submit" className="w-full" disabled={createCoupon.isPending || updateCoupon.isPending}>
                  {editing ? "Salvar" : "Criar Cupom"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Card key={i} className="p-5 animate-pulse"><div className="h-16 bg-muted rounded" /></Card>)}
          </div>
        ) : coupons && coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map(c => (
              <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-bold text-lg tracking-wider">{c.code}</h3>
                      <button onClick={() => copyCode(c.code)} className="p-1 text-muted-foreground hover:text-foreground"><Copy size={12} /></button>
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"><Pencil size={14} /></button>
                    <button
                      onClick={() => setDeleteTarget(c.id)}
                      disabled={deleteCoupon.isPending}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-accent/10 text-accent border-accent/20">
                    {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `R$ ${Number(c.discount_value).toFixed(2)} OFF`}
                  </Badge>
                  <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativo" : "Inativo"}</Badge>
                  {c.max_uses != null && c.max_uses > 0 && <Badge variant="outline">{c.used_count}/{c.max_uses} usos</Badge>}
                </div>
                {c.valid_until && (
                  <p className="text-xs text-muted-foreground mt-2">Válido até {format(new Date(c.valid_until), "dd/MM/yyyy")}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="text-muted-foreground mb-4" size={40} />
            <h3 className="text-lg font-semibold mb-1">Nenhum cupom</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie cupons de desconto para seus clientes.</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus size={16} />Criar primeiro cupom</Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cupom?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O cupom será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCoupon.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCoupon.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Coupons;
