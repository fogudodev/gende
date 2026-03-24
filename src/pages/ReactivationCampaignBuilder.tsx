import { useState } from "react";
import { useCreateCampaign, useExecuteCampaign } from "@/lib/api/reactivation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ReactivationCampaignBuilder() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Oi {name} 💖 já faz um tempo desde sua última visita. Quer dar um tapa no visual? Aproveite os horários disponíveis desta semana!");
  const navigate = useNavigate();

  const createMutation = useCreateCampaign();
  const executeMutation = useExecuteCampaign();

  const handleCreateAndExecute = async () => {
    if (!name || !message) {
      toast.error("Preencha o nome e a mensagem da campanha.");
      return;
    }

    try {
      // Create campaign
      const campaign = await createMutation.mutateAsync({
        name,
        messageTemplate: message,
        segmentFilter: { status: ['high_priority', 'churn_risk'] } // Default to high risk customers for V1
      });

      // Execute immediately for simplicity in V1
      await executeMutation.mutateAsync(campaign.id);

      toast.success("Campanha criada e executada com sucesso!");
      navigate("/reactivation");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar campanha");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nova Campanha de Reativação</h1>
        <p className="text-muted-foreground">Configure a mensagem que será enviada para clientes elegíveis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Campanha</CardTitle>
          <CardDescription>Esta campanha atingirá automaticamente todos os clientes classificados com prioridade alta ou risco de churn pelo nosso motor de IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Campanha (Uso Interno)</label>
            <Input 
              placeholder="Ex: Reativação Fim de Mês" 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Modelos de Mensagem (WhatsApp)</label>
            <Textarea 
              rows={5}
              placeholder="Sua mensagem aqui..." 
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: <code className="bg-secondary px-1 rounded">{'{nome}'}</code>.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate("/reactivation")}>Cancelar</Button>
            <Button 
              onClick={handleCreateAndExecute} 
              disabled={createMutation.isPending || executeMutation.isPending}
            >
              {(createMutation.isPending || executeMutation.isPending) ? "Processando..." : "Criar e Executar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
