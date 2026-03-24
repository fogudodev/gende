import { useUpsellMetrics } from "@/lib/api/upsell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Activity, LayoutList, DollarSign, Target, Settings, Zap } from "lucide-react";
import { toast } from "sonner";

export default function UpsellDashboard() {
  const { data: metrics, isLoading: loadingMetrics } = useUpsellMetrics();
  const navigate = useNavigate();

  const conversionRate = metrics?.total_offers_sent > 0 
    ? ((metrics.successful_upsells / metrics.total_offers_sent) * 100).toFixed(1) 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upsell Inteligente</h1>
          <p className="text-muted-foreground">Aumente o ticket médio da sua carteira ativa com ofertas cirúrgicas.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/upsell/opportunities")}>
            <Zap className="w-4 h-4 mr-2" />
            Explorar Oportunidades
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades Pendentes</CardTitle>
            <LayoutList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.active_opportunities || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ofertas Enviadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_offers_sent || 0}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% de conversão</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upsells Bem-sucedidos</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.successful_upsells || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Oculta Recuperada</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.incremental_revenue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
