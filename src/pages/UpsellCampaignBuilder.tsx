import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCreateUpsellCampaign, useExecuteUpsellCampaign } from "@/lib/api/upsell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Save } from "lucide-react";

export default function UpsellCampaignBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const opportunityIds = location.state?.opportunityIds || [];

  const [name, setName] = useState("Oferta Cross-sell Limitada");
  const [template, setTemplate] = useState("Oii {{name}} ✨ vi que você já tem horário agendado aqui pra semana. Que tal se presentear com um {{suggested_service}} pra ficar perfeito? Deixo o horário reservado pra você?");

  const createMutation = useCreateUpsellCampaign();
  const executeMutation = useExecuteUpsellCampaign();

  const handleDispatch = async () => {
    try {
      // 1. Create Campaign
      const campaign = await createMutation.mutateAsync({ name, message_template: template, opportunityIds });
      
      // 2. Execute Batch
      const result = await executeMutation.mutateAsync(campaign.id);
      
      toast.success(`Campanha iniciada! ${result.processed} mensagens enviadas com sucesso.`);
      navigate("/upsell");
    } catch (err: any) {
      toast.error(err.message || "Erro ao executar campanha");
    }
  };

  if (opportunityIds.length === 0) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Nenhuma oportunidade selecionada</h2>
        <Button onClick={() => navigate("/upsell/opportunities")}>Voltar para Oportunidades</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Criar Oferta</h1>
        <p className="text-muted-foreground">Você selecionou {opportunityIds.length} clientes com alto potencial de Upsell.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração da Oferta</CardTitle>
          <CardDescription>Personalize a abordagem. A IA substituirá as tags automaticamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Campanha Interna</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem de Abordagem (WhatsApp)</label>
            <Textarea 
              rows={6}
              value={template}
              onChange={e => setTemplate(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
              Tags disponíveis: 
              <span className="bg-secondary px-2 py-0.5 rounded">{'{{name}}'}</span>
              <span className="bg-secondary px-2 py-0.5 rounded">{'{{suggested_service}}'}</span>
              <span className="bg-secondary px-2 py-0.5 rounded">{'{{price}}'}</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md mt-6">
            <h3 className="font-semibold text-emerald-800 mb-2">Simulação (Exemplo)</h3>
            <p className="text-sm text-emerald-900 leading-relaxed italic border-l-4 border-emerald-400 pl-3">
              "{template.replace('{{name}}', 'Maria').replace('{{suggested_service}}', 'Hidratação Profunda').replace('{{price}}', 'R$ 80')}"
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/upsell/opportunities")}>
          Cancelar
        </Button>
        <Button onClick={handleDispatch} disabled={createMutation.isPending || executeMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
          <Send className="w-4 h-4 mr-2" />
          {createMutation.isPending || executeMutation.isPending ? "Processando e Enviando..." : "Disparar Oferta via WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
