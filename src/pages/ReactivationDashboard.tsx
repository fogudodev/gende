import { useReactivationMetrics, useAnalyzedCustomers } from "@/lib/api/reactivation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Activity, Users, DollarSign, Target } from "lucide-react";

export default function ReactivationDashboard() {
  const { data: metrics, isLoading: loadingMetrics } = useReactivationMetrics();
  const { data: customers, isLoading: loadingCustomers } = useAnalyzedCustomers();
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'high_priority': return 'bg-red-500';
      case 'churn_risk': return 'bg-orange-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'high_priority': return 'Prioridade Alta';
      case 'churn_risk': return 'Risco de Churn';
      case 'warning': return 'Atenção';
      default: return 'Inativo';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Motor de Reativação</h1>
          <p className="text-muted-foreground">Recupere clientes inativos e aumente seu faturamento.</p>
        </div>
        <Button onClick={() => navigate("/reactivation/campaigns/new")}>
          Nova Campanha
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Executadas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_campaigns || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Elegíveis</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers?.filter((c: any) => c.reactivation_status !== 'inactive').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Com risco de churn</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_messages_sent || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Recuperada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.recovered_revenue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes em Risco (Análise IA)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCustomers ? (
            <div className="flex justify-center p-4">Carregando análise...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Última Visita</th>
                    <th className="px-4 py-3">Score IA (0-100)</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers?.slice(0, 50).map((client: any) => (
                    <tr key={client.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {client.name}
                        <div className="text-xs text-muted-foreground">{client.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        {client.last_completed_appointment_at 
                          ? new Date(client.last_completed_appointment_at).toLocaleDateString()
                          : 'Desconhecido'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-secondary h-2 rounded-full max-w-[100px]">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${client.reactivation_score}%` }}></div>
                          </div>
                          <span>{client.reactivation_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(client.reactivation_status)}>
                          {getStatusLabel(client.reactivation_status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {customers?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted-foreground">Nenhum cliente elegível encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
