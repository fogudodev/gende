import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useServicePackages, useClientPackages, useCreateServicePackage, useDeleteServicePackage, useCreateClientPackage, useUpdateClientPackage } from "@/hooks/useServicePackages";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";
import { Package, Plus, Trash2, Users, Gift, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ServicePackages = () => {
  const { enabled, isLoading: flagLoading } = useIsFeatureEnabled("service_packages");
  const { data: packages, isLoading } = useServicePackages();
  const { data: clientPackages } = useClientPackages();
  const { data: servicesData } = useServices();
  const { data: clientsData } = useClients();
  const createPkg = useCreateServicePackage();
  const deletePkg = useDeleteServicePackage();
  const createClientPkg = useCreateClientPackage();
  const updateClientPkg = useUpdateClientPackage();

  const services = servicesData || [];
  const clients = clientsData || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [sellPackageId, setSellPackageId] = useState<string | null>(null);

  // Create package form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [totalSessions, setTotalSessions] = useState("5");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");

  // Sell package form
  const [sellClientId, setSellClientId] = useState("");
  const [sellClientName, setSellClientName] = useState("");
  const [sellClientPhone, setSellClientPhone] = useState("");

  if (flagLoading) return null;

  if (!enabled) {
    return (
      <DashboardLayout title="Pacotes de Serviços" subtitle="Crie pacotes com desconto para fidelizar clientes">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Funcionalidade Indisponível</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            O sistema de pacotes de serviços ainda não foi ativado. Aguarde o lançamento desta funcionalidade.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const handleCreate = () => {
    if (!name || !totalSessions || !price) return;
    createPkg.mutate({
      name,
      description: description || null,
      service_id: serviceId || null,
      total_sessions: parseInt(totalSessions),
      price: parseFloat(price),
      original_price: parseFloat(originalPrice || price),
      is_active: true,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setName(""); setDescription(""); setServiceId(""); setTotalSessions("5"); setPrice(""); setOriginalPrice("");
      }
    });
  };

  const handleSell = () => {
    if (!sellPackageId) return;
    const pkg = packages?.find(p => p.id === sellPackageId);
    if (!pkg) return;
    const clientName = sellClientId
      ? clients.find(c => c.id === sellClientId)?.name || sellClientName
      : sellClientName;
    const clientPhone = sellClientId
      ? clients.find(c => c.id === sellClientId)?.phone || sellClientPhone
      : sellClientPhone;

    createClientPkg.mutate({
      client_id: sellClientId || null,
      package_id: pkg.id,
      client_name: clientName,
      client_phone: clientPhone || null,
      total_sessions: pkg.total_sessions,
      used_sessions: 0,
      amount_paid: pkg.price,
      status: "active",
      purchased_at: new Date().toISOString(),
      expires_at: null,
    }, {
      onSuccess: () => {
        setSellOpen(false);
        setSellPackageId(null);
        setSellClientId(""); setSellClientName(""); setSellClientPhone("");
      }
    });
  };

  const useSession = (cp: any) => {
    if (cp.used_sessions >= cp.total_sessions) return;
    updateClientPkg.mutate({
      id: cp.id,
      used_sessions: cp.used_sessions + 1,
      status: cp.used_sessions + 1 >= cp.total_sessions ? "completed" : "active",
    });
  };

  const discount = (pkg: any) => {
    if (!pkg.original_price || pkg.original_price <= 0) return 0;
    return Math.round((1 - pkg.price / pkg.original_price) * 100);
  };

  return (
    <DashboardLayout title="Pacotes de Serviços" subtitle="Crie pacotes com desconto para fidelizar clientes">
      <Tabs defaultValue="packages" className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="packages" className="gap-1.5"><Package size={14} /> Pacotes</TabsTrigger>
            <TabsTrigger value="sold" className="gap-1.5"><Users size={14} /> Vendidos</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Dialog open={sellOpen} onOpenChange={setSellOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Gift size={14} /> Vender Pacote
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Vender Pacote</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Pacote</Label>
                    <Select value={sellPackageId || ""} onValueChange={setSellPackageId}>
                      <SelectTrigger><SelectValue placeholder="Selecione um pacote" /></SelectTrigger>
                      <SelectContent>
                        {(packages || []).filter(p => p.is_active).map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {p.total_sessions} sessões — R$ {p.price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cliente existente (opcional)</Label>
                    <Select value={sellClientId} onValueChange={(v) => {
                      setSellClientId(v);
                      const c = clients.find(cl => cl.id === v);
                      if (c) { setSellClientName(c.name); setSellClientPhone(c.phone || ""); }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Selecione ou preencha abaixo" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Nome</Label>
                      <Input value={sellClientName} onChange={e => setSellClientName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input value={sellClientPhone} onChange={e => setSellClientPhone(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleSell} disabled={!sellPackageId || !sellClientName || createClientPkg.isPending} className="w-full">
                    {createClientPkg.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                    Confirmar Venda
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus size={14} /> Novo Pacote</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Pacote</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome do pacote</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pacote 10 Cortes" />
                  </div>
                  <div>
                    <Label>Descrição (opcional)</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <Label>Serviço vinculado (opcional)</Label>
                    <Select value={serviceId} onValueChange={setServiceId}>
                      <SelectTrigger><SelectValue placeholder="Qualquer serviço" /></SelectTrigger>
                      <SelectContent>
                        {services.filter(s => s.active).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Sessões</Label>
                      <Input type="number" min="1" value={totalSessions} onChange={e => setTotalSessions(e.target.value)} />
                    </div>
                    <div>
                      <Label>Preço original (R$)</Label>
                      <Input type="number" step="0.01" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="250.00" />
                    </div>
                    <div>
                      <Label>Preço pacote (R$)</Label>
                      <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="200.00" />
                    </div>
                  </div>
                  {originalPrice && price && parseFloat(originalPrice) > 0 && (
                    <p className="text-xs text-accent">
                      Desconto: {Math.round((1 - parseFloat(price) / parseFloat(originalPrice)) * 100)}%
                    </p>
                  )}
                  <Button onClick={handleCreate} disabled={!name || !price || createPkg.isPending} className="w-full">
                    {createPkg.isPending ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                    Criar Pacote
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="packages">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent" /></div>
          ) : !packages?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum pacote criado ainda</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {packages.map(pkg => {
                const svc = services.find(s => s.id === pkg.service_id);
                const d = discount(pkg);
                return (
                  <div key={pkg.id} className={cn(
                    "glass-card rounded-2xl p-4 space-y-2 border transition-all",
                    pkg.is_active ? "border-accent/20" : "border-border opacity-60"
                  )}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                        {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}
                      </div>
                      <button onClick={() => deletePkg.mutate(pkg.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {svc && <Badge variant="outline" className="text-xs">{svc.name}</Badge>}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">R$ {pkg.price.toFixed(2)}</span>
                      {d > 0 && (
                        <>
                          <span className="text-sm line-through text-muted-foreground">R$ {pkg.original_price.toFixed(2)}</span>
                          <Badge className="bg-accent/20 text-accent text-xs">-{d}%</Badge>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{pkg.total_sessions} sessões</p>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sold">
          {!clientPackages?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum pacote vendido ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientPackages.map(cp => {
                const remaining = cp.total_sessions - cp.used_sessions;
                const pkg = packages?.find(p => p.id === cp.package_id);
                return (
                  <div key={cp.id} className={cn(
                    "glass-card rounded-xl p-4 flex items-center justify-between gap-4 border transition-all",
                    cp.status === "completed" ? "border-border opacity-60" : "border-accent/20"
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{cp.client_name}</span>
                        {pkg && <Badge variant="outline" className="text-xs">{pkg.name}</Badge>}
                        <Badge variant={cp.status === "active" ? "default" : "secondary"} className="text-xs">
                          {cp.status === "active" ? "Ativo" : cp.status === "completed" ? "Concluído" : cp.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>R$ {cp.amount_paid.toFixed(2)}</span>
                        <span>{cp.used_sessions}/{cp.total_sessions} sessões usadas</span>
                        {remaining > 0 && <span className="text-accent">{remaining} restantes</span>}
                      </div>
                    </div>
                    {cp.status === "active" && remaining > 0 && (
                      <Button size="sm" variant="outline" onClick={() => useSession(cp)} disabled={updateClientPkg.isPending} className="gap-1 shrink-0">
                        <CheckCircle size={14} /> Usar sessão
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ServicePackages;
