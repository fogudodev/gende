import { useState } from "react";
import { useCreateUpsellCampaign, useUpsellOpportunities } from "@/lib/api/upsell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function UpsellConfig() {
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("Oi {{name}}! Vi que você agendou conosco. Que tal aproveitar e incluir o serviço de {{suggested_service}} (R$ {{price}})? Me avisa que eu já deixo tudo pronto! 💖");
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([]);

  const navigate = useNavigate();
  const createCampaign = useCreateUpsellCampaign();
  const { data: opportunities, isLoading } = useUpsellOpportunities();

  const toggleOpportunity = (id: string) => {
    setSelectedOpportunities(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!campaignName || !message || selectedOpportunities.length === 0) {
      toast.error("Preencha o nome, a mensagem e selecione pelo menos uma oportunidade.");
      return;
    }

    try {
      await createCampaign.mutateAsync({
        name: campaignName,
        message_template: message,
        opportunityIds: selectedOpportunities
      });
      toast.success("Campanha de Upsell criada com sucesso!");
      navigate("/upsell");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nova Campanha de Upsell</h1>
        <p className="text-muted-foreground">Selecione oportunidades detectadas e personalize a mensagem WhatsApp.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração da Campanha</CardTitle>
          <CardDescription>Defina o nome e o template da mensagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Campanha</label>
            <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Upsell Março - Hidratação" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template da Mensagem</label>
            <Textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tags: <code className="bg-secondary px-1">{'{{name}}'}</code>, <code className="bg-secondary px-1">{'{{suggested_service}}'}</code>, <code className="bg-secondary px-1">{'{{price}}'}</code>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oportunidades Detectadas</CardTitle>
          <CardDescription>Selecione os clientes para incluir na campanha.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !opportunities?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma oportunidade disponível. Use o botão "Escanear Agenda" na página de Oportunidades.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {opportunities.map((opp: any) => (
                <div key={opp.id} className="flex items-center gap-3 border p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <Checkbox
                    checked={selectedOpportunities.includes(opp.id)}
                    onCheckedChange={() => toggleOpportunity(opp.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{opp.client_name}</p>
                    <p className="text-xs text-muted-foreground">{opp.suggested_service_name} — R$ {Number(opp.suggested_price || 0).toFixed(2)}</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                    Score {opp.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-6 gap-2">
        <Button variant="outline" onClick={() => navigate("/upsell")}>Cancelar</Button>
        <Button onClick={handleSave} disabled={createCampaign.isPending || selectedOpportunities.length === 0}>
          {createCampaign.isPending ? "Criando..." : `Criar Campanha (${selectedOpportunities.length} clientes)`}
        </Button>
      </div>
    </div>
  );
}

