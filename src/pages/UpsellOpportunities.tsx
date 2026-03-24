import { useState } from "react";
import { useUpsellOpportunities, useTriggerOpportunities } from "@/lib/api/upsell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { Target, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function UpsellOpportunities() {
  const { data: opportunities, isLoading } = useUpsellOpportunities();
  const triggerScan = useTriggerOpportunities();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!opportunities) return;
    if (checked) setSelectedIds(new Set(opportunities.map((o: any) => o.id)));
    else setSelectedIds(new Set());
  };

  const handleGenerateScan = async () => {
    try {
      const res = await triggerScan.mutateAsync();
      toast.success(`${res.created} novas oportunidades mapeadas na agenda!`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao escanear a agenda");
    }
  };

  const handleCreateCampaign = () => {
    if (selectedIds.size === 0) return toast.error("Selecione pelo menos um cliente para criar a campanha.");
    navigate("/upsell/campaigns/new", { state: { opportunityIds: Array.from(selectedIds) } });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oportunidades de Upsell</h1>
          <p className="text-muted-foreground">Listagem de clientes com alta propensão a aumentar o ticket.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateScan} disabled={triggerScan.isPending}>
            <Zap className="mr-2 h-4 w-4" />
            Escanear Agenda
          </Button>
          <Button onClick={handleCreateCampaign} disabled={selectedIds.size === 0}>
            Criar Campanha Inteligente ({selectedIds.size})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score de Clientes</CardTitle>
          <CardDescription>Critérios: Recência, Frequência e Histórico de Serviços</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <Checkbox
                      checked={opportunities?.length > 0 && selectedIds.size === opportunities?.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Serviço Sugerido</th>
                  <th className="px-4 py-3">Valor Estimado</th>
                  <th className="px-4 py-3 text-center">Score (IA)</th>
                  <th className="px-4 py-3">Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8">Carregando oportunidades...</td></tr>
                ) : opportunities?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8">Nenhuma oportunidade detectada no momento. Escaneie a agenda.</td></tr>
                ) : (
                  opportunities?.map((opp: any) => (
                    <tr key={opp.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <Checkbox
                          checked={selectedIds.has(opp.id)}
                          onCheckedChange={(c) => handleToggle(opp.id, c as boolean)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {opp.client_name}
                        <div className="text-xs text-muted-foreground">{opp.client_phone}</div>
                      </td>
                      <td className="px-4 py-3 text-emerald-600 font-medium">+{opp.suggested_service_name}</td>
                      <td className="px-4 py-3">R$ {Number(opp.suggested_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs ring-4 ring-white">
                          {opp.score}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={opp.priority === 'high' ? 'default' : 'secondary'} className={opp.priority === 'high' ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                          {opp.priority.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
