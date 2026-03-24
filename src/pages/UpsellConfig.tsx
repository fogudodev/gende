import { useState } from "react";
import { useCreateUpsellRule } from "@/lib/api/upsell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function UpsellConfig() {
  const [triggerServiceId, setTriggerService] = useState("");
  const [offerServiceId, setOfferService] = useState("");
  const [discount, setDiscount] = useState("0");
  const [daysBefore, setDaysBefore] = useState("1");
  const [message, setMessage] = useState("Oi {nome}! Vi que amanhã você tem o serviço de {servico_agendado} aqui comigo. Que tal aproveitar e agendar junto um(a) {servico_oferta} com {desconto} de desconto? Me avisa que eu já deixo tudo pronto! 💖");
  
  const navigate = useNavigate();
  const createMutation = useCreateUpsellRule();

  // Load services for the dropdown
  const { data: services } = useQuery({
    queryKey: ['servicesCombo'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/services`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      return res.json();
    }
  });

  const handleSave = async () => {
    if (!triggerServiceId || !offerServiceId || !message) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        trigger_service_id: triggerServiceId,
        offer_service_id: offerServiceId,
        discount_percentage: Number(discount),
        days_before_appointment: Number(daysBefore),
        message_template: message
      });
      toast.success("Regra de Upsell criada com sucesso!");
      navigate("/upsell");
    } catch(err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Regras de Cross-sell / Upsell</h1>
        <p className="text-muted-foreground">Vincule serviços para gerar ofertas automáticas na véspera.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Combinação</CardTitle>
          <CardDescription>Crie uma oportunidade lógica. (Ex: Luzes ➡️ Pede Tonalização)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço Agendado (Gatilho)</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={triggerServiceId} onChange={e => setTriggerService(e.target.value)}>
                <option value="">Selecione...</option>
                {services?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-600">Serviço Ofertado (+ Ticket)</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-emerald-50 px-3 py-2 text-sm ring-offset-background" value={offerServiceId} onChange={e => setOfferService(e.target.value)}>
                <option value="">Selecione...</option>
                {services?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desconto Isca (%)</label>
              <Input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias Antes (Disparo via WhatsApp)</label>
              <Input type="number" min="1" max="30" value={daysBefore} onChange={e => setDaysBefore(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Template da Mensagem</label>
            <Textarea 
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tags: <code className="bg-secondary px-1">{'{nome}'}</code>, <code className="bg-secondary px-1">{'{servico_agendado}'}</code>, <code className="bg-secondary px-1">{'{servico_oferta}'}</code>, <code className="bg-secondary px-1">{'{desconto}'}</code>
            </p>
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => navigate("/upsell")}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Criar Regra"}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
