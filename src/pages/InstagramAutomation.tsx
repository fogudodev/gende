import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  useInstagramAccount,
  useInstagramMessages,
  useInstagramKeywords,
  useInstagramConnect,
  useInstagramStats,
} from "@/hooks/useInstagram";
import { useProfessional } from "@/hooks/useProfessional";
import { supabase } from "@/integrations/supabase/client";
import {
  Instagram,
  Loader2,
  Wifi,
  WifiOff,
  MessageCircle,
  Hash,
  BarChart3,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const InstagramAutomation = () => {
  const { data: account, isLoading: accountLoading } = useInstagramAccount();
  const { data: messages = [], isLoading: messagesLoading } = useInstagramMessages();
  const { data: keywords = [], addKeyword, deleteKeyword, toggleKeyword } = useInstagramKeywords();
  const { data: stats } = useInstagramStats();
  const { connect, disconnect } = useInstagramConnect();
  const { data: professional } = useProfessional();

  const [newKeyword, setNewKeyword] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [responseType, setResponseType] = useState("booking_link");
  const [manualAuthUrl, setManualAuthUrl] = useState<string | null>(() =>
    sessionStorage.getItem("instagram_manual_auth_url")
  );

  const isConnected = !!account;

  useEffect(() => {
    const syncManualAuthUrl = () => {
      setManualAuthUrl(sessionStorage.getItem("instagram_manual_auth_url"));
    };

    window.addEventListener("instagram-manual-auth-ready", syncManualAuthUrl);
    return () => {
      window.removeEventListener("instagram-manual-auth-ready", syncManualAuthUrl);
    };
  }, []);

  useEffect(() => {
    if (isConnected && manualAuthUrl) {
      sessionStorage.removeItem("instagram_manual_auth_url");
      setManualAuthUrl(null);
    }
  }, [isConnected, manualAuthUrl]);

  const handleConnect = () => {
    connect.mutate();
  };

  const handleCopyManualLink = async () => {
    if (!manualAuthUrl) return;

    try {
      await navigator.clipboard.writeText(manualAuthUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  };

  const handleDisconnect = () => {
    if (confirm("Deseja realmente desconectar o Instagram?")) {
      disconnect.mutate();
    }
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) {
      toast.error("Digite uma palavra-chave");
      return;
    }
    addKeyword.mutate({
      keyword: newKeyword.trim(),
      response_type: responseType,
      custom_response: newResponse.trim() || undefined,
    });
    setNewKeyword("");
    setNewResponse("");
  };

  const handleToggleAutoReply = async (enabled: boolean) => {
    if (!account) return;
    await supabase
      .from("instagram_accounts" as any)
      .update({ auto_reply_enabled: enabled } as any)
      .eq("id", account.id);
    toast.success(enabled ? "Respostas automáticas ativadas" : "Respostas automáticas desativadas");
  };

  const handleToggleCommentReply = async (enabled: boolean) => {
    if (!account) return;
    await supabase
      .from("instagram_accounts" as any)
      .update({ auto_comment_reply_enabled: enabled } as any)
      .eq("id", account.id);
    toast.success(enabled ? "Respostas a comentários ativadas" : "Respostas a comentários desativadas");
  };

  return (
    <DashboardLayout title="Automação Instagram" subtitle="DM Inteligente com IA">
      <div className="space-y-6">
        {/* Connection Status */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isConnected ? "bg-gradient-to-br from-pink-500 to-purple-600" : "bg-muted"}`}>
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Instagram Business</h3>
                {isConnected ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Wifi size={14} className="text-emerald-500" />
                    <span className="text-sm text-emerald-500 font-medium">Conectado</span>
                    <span className="text-sm text-muted-foreground">@{account.username}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <WifiOff size={14} className="text-red-500" />
                    <span className="text-sm text-red-500 font-medium">Desconectado</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              ) : (
                <Button
                  onClick={handleConnect}
                  disabled={connect.isPending}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {connect.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Instagram className="w-4 h-4 mr-2" />}
                  Conectar Instagram
                </Button>
              )}
            </div>
          </div>
        </Card>

        {!isConnected && (
          <Card className="p-6 border-dashed">
            <div className="text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="font-semibold text-foreground">Configure sua conta Instagram</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Para usar a automação de Instagram, você precisa conectar sua conta Instagram Business.
                Certifique-se de que sua conta Instagram está vinculada a uma Página do Facebook.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto space-y-2">
                <p className="text-sm font-medium text-foreground">Pré-requisitos:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Conta Instagram Business ou Criador</li>
                  <li>Página do Facebook vinculada ao Instagram</li>
                  <li>Permissões de administrador na Página</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {isConnected && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Recebidas</span>
                  <MessageCircle size={14} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.incoming || 0}</p>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Enviadas</span>
                  <Send size={14} className="text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.outgoing || 0}</p>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Agendamentos</span>
                  <Calendar size={14} className="text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.bookings || 0}</p>
              </Card>
              <Card className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Conversão</span>
                  <TrendingUp size={14} className="text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.conversionRate || 0}%</p>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="settings" className="space-y-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="settings">⚙️ Configurações</TabsTrigger>
                <TabsTrigger value="keywords">🔑 Palavras-chave</TabsTrigger>
                <TabsTrigger value="messages">💬 Histórico</TabsTrigger>
              </TabsList>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <Card className="p-5 space-y-4">
                  <h4 className="font-semibold text-foreground">Respostas Automáticas</h4>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Responder DMs automaticamente</p>
                      <p className="text-xs text-muted-foreground">
                        A IA responde mensagens diretas com base nos serviços do salão
                      </p>
                    </div>
                    <Switch
                      checked={account.auto_reply_enabled}
                      onCheckedChange={handleToggleAutoReply}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Responder comentários</p>
                      <p className="text-xs text-muted-foreground">
                        Envia DM automática quando detecta palavra-chave em comentários
                      </p>
                    </div>
                    <Switch
                      checked={account.auto_comment_reply_enabled}
                      onCheckedChange={handleToggleCommentReply}
                    />
                  </div>
                </Card>

                <Card className="p-5 space-y-3">
                  <h4 className="font-semibold text-foreground">Informações da Conta</h4>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Usuário:</span>
                      <p className="font-medium text-foreground">@{account.username}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nome:</span>
                      <p className="font-medium text-foreground">{account.account_name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Token expira em:</span>
                      <p className="font-medium text-foreground">
                        {account.token_expiration
                          ? format(new Date(account.token_expiration), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Keywords Tab */}
              <TabsContent value="keywords" className="space-y-4">
                <Card className="p-5 space-y-4">
                  <h4 className="font-semibold text-foreground">Adicionar Palavra-chave</h4>
                  <p className="text-xs text-muted-foreground">
                    Quando alguém comentar com essa palavra, o sistema envia uma DM automática.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Ex: agendar, preço, horário"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddKeyword} disabled={addKeyword.isPending} size="sm">
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Resposta personalizada (opcional — deixe vazio para usar mensagem padrão com link de agendamento)"
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    className="min-h-[60px]"
                  />
                </Card>

                <Card className="p-5 space-y-3">
                  <h4 className="font-semibold text-foreground">Palavras-chave ativas</h4>
                  <Separator />
                  {keywords.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhuma palavra-chave configurada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {keywords.map((kw: any) => (
                        <div key={kw.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Hash size={14} className="text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{kw.keyword}</p>
                              <p className="text-xs text-muted-foreground">
                                Disparada {kw.trigger_count}x •{" "}
                                {kw.response_type === "booking_link" ? "Link de agendamento" : "Resposta personalizada"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={kw.is_active}
                              onCheckedChange={(val) => toggleKeyword.mutate({ id: kw.id, is_active: val })}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteKeyword.mutate(kw.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="space-y-4">
                <Card className="p-5">
                  <h4 className="font-semibold text-foreground mb-4">Histórico de Conversas</h4>
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Nenhuma mensagem recebida ainda
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] p-3 rounded-xl text-sm ${
                              msg.direction === "outgoing"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {msg.direction === "incoming" && (
                                <span className="text-xs font-medium opacity-70">
                                  {msg.sender_username || msg.sender_id}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {msg.message_type === "dm"
                                  ? "DM"
                                  : msg.message_type === "comment"
                                  ? "Comentário"
                                  : "Auto DM"}
                              </Badge>
                            </div>
                            <p>{msg.message_text}</p>
                            <p className="text-[10px] opacity-60 mt-1">
                              {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default InstagramAutomation;
