import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from "@/hooks/useProducts";
import { useCreateExpense } from "@/hooks/useExpenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package, Search, MinusCircle } from "lucide-react";
import { toast } from "sonner";

const Products = () => {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createExpense = useCreateExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [consumeDialog, setConsumeDialog] = useState<Product | null>(null);
  const [consumeQty, setConsumeQty] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", cost_price: "", stock_quantity: "", is_active: true, category: "Geral",
  });

  const resetForm = () => {
    setForm({ name: "", description: "", price: "", cost_price: "", stock_quantity: "", is_active: true, category: "Geral" });
    setEditing(null);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      cost_price: String(p.cost_price),
      stock_quantity: String(p.stock_quantity),
      is_active: p.is_active,
      category: p.category || "Geral",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    const price = Math.max(0, Number(form.price) || 0);
    const cost_price = Math.max(0, Number(form.cost_price) || 0);
    const stock_quantity = Math.max(0, Math.floor(Number(form.stock_quantity) || 0));
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, price, cost_price, stock_quantity, is_active: form.is_active, category: form.category.trim() || "Geral" };
    if (editing) {
      await updateProduct.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteProduct.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  const handleConsume = async () => {
    if (!consumeDialog || consumeQty < 1) return;
    // Re-fetch current stock to avoid stale data
    const freshProduct = products?.find(p => p.id === consumeDialog.id);
    const currentStock = freshProduct?.stock_quantity ?? consumeDialog.stock_quantity;
    if (consumeQty > currentStock) {
      toast.error("Quantidade maior que estoque disponível");
      return;
    }
    const totalCost = consumeDialog.cost_price * consumeQty;
    try {
      // Update stock first
      await updateProduct.mutateAsync({
        id: consumeDialog.id,
        stock_quantity: currentStock - consumeQty,
      });
      // Then register expense
      if (totalCost > 0) {
        await createExpense.mutateAsync({
          description: `Consumo: ${consumeQty}x ${consumeDialog.name}`,
          amount: totalCost,
          category: "Produtos",
          expense_date: new Date().toISOString().split("T")[0],
          employee_id: null,
        });
      }
      toast.success(`${consumeQty}x ${consumeDialog.name} consumido(s)`);
    } catch {
      toast.error("Erro ao registrar consumo. Verifique o estoque.");
    }
    setConsumeDialog(null);
    setConsumeQty(1);
  };

  const getMargin = (price: number, cost: number): string => {
    if (price <= 0) return "—";
    return ((price - cost) / price * 100).toFixed(0) + "%";
  };

  const filtered = products?.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <DashboardLayout title="Produtos">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Produtos</h1>
            <p className="text-muted-foreground text-sm">Gerencie os produtos do seu estabelecimento</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} />Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produto" required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Preço de venda (R$)</Label>
                    <Input type="number" step="0.01" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo (R$)</Label>
                    <Input type="number" step="0.01" min={0} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0,00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Estoque</Label>
                    <Input type="number" min={0} step={1} value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Geral" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                  Produto ativo
                </label>
                <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>
                  {editing ? "Salvar" : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-9" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Card key={i} className="p-5 animate-pulse"><div className="h-16 bg-muted rounded" /></Card>)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <Card key={p.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteTarget(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">R$ {Number(p.price).toFixed(2)}</Badge>
                  <Badge variant={p.stock_quantity === 0 ? "destructive" : p.stock_quantity <= 5 ? "default" : "secondary"} className={p.stock_quantity > 0 && p.stock_quantity <= 5 ? "bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20" : ""}>
                    {p.stock_quantity === 0 ? "Sem estoque" : p.stock_quantity <= 5 ? `⚠ ${p.stock_quantity} restante(s)` : `${p.stock_quantity} em estoque`}
                  </Badge>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                </div>
                {p.stock_quantity > 0 && (
                  <button
                    onClick={() => { setConsumeDialog(p); setConsumeQty(1); }}
                    className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:underline"
                  >
                    <MinusCircle size={13} /> Registrar consumo
                  </button>
                )}
                {p.cost_price > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Custo: R$ {Number(p.cost_price).toFixed(2)} · Margem: {getMargin(p.price, p.cost_price)}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="text-muted-foreground mb-4" size={40} />
            <h3 className="text-lg font-semibold mb-1">Nenhum produto</h3>
            <p className="text-muted-foreground text-sm mb-4">Cadastre os produtos que você vende.</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus size={16} />Adicionar produto</Button>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover produto?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Consume Dialog */}
        <Dialog open={!!consumeDialog} onOpenChange={(o) => { if (!o) setConsumeDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar Consumo</DialogTitle>
            </DialogHeader>
            {consumeDialog && (
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Produto: <span className="font-medium text-foreground">{consumeDialog.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">Estoque atual: {consumeDialog.stock_quantity} | Custo unitário: R$ {Number(consumeDialog.cost_price).toFixed(2)}</p>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" min={1} max={consumeDialog.stock_quantity} value={consumeQty} onChange={(e) => setConsumeQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Despesa gerada: R$ {(consumeDialog.cost_price * consumeQty).toFixed(2)}
                </p>
                <Button onClick={handleConsume} className="w-full" disabled={updateProduct.isPending || createExpense.isPending}>
                  Confirmar consumo
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Products;
