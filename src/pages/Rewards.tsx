import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Gift, Trophy, Users, TrendingUp, Coins, Target, Star,
  Plus, Trash2, AlertTriangle, Award, Crown,
  Gem, Medal, UserPlus, Zap, Calendar, ArrowRight
} from "lucide-react";
import {
  useLoyaltyConfig, useSaveLoyaltyConfig,
  useCashbackRules, useCreateCashbackRule, useToggleCashbackRule, useDeleteCashbackRule,
  useLoyaltyLevels, useCreateLoyaltyLevel, useDeleteLoyaltyLevel,
  useClientLoyalties, useClientReferrals,
  useLoyaltyChallenges, useCreateChallenge, useToggleChallenge, useDeleteChallenge,
  useRewardsDashboardStats, useClientCashbacks,
} from "@/hooks/useRewards";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const levelIcons: Record<string, any> = {
  Bronze: Medal,
  Prata: Star,
  Ouro: Crown,
  Black: Gem,
};

const retentionColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  at_risk: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  lost: "bg-red-500/10 text-red-500 border-red-500/20",
};

const retentionLabels: Record<string, string> = {
  active: "Ativo",
  at_risk: "Em risco",
  lost: "Perdido",
  new: "Novo",
};

// ─── Dashboard Tab ──────────────────────────────────────────────
const DashboardTab = () => {
  const stats = useRewardsDashboardStats();

  const cards = [
    { label: "Cashback Concedido", value: formatCurrency(stats.totalCashbackGiven), icon: Coins, color: "text-emerald-500" },
    { label: "Cashback Utilizado", value: formatCurrency(stats.totalCashbackUsed), icon: TrendingUp, color: "text-blue-500" },
    { label: "Saldo Ativo", value: formatCurrency(stats.totalActiveBalance), icon: Gift, color: "text-amber-500" },
    { label: "Clientes Ativos", value: stats.activeClients, icon: Users, color: "text-violet-500" },
    { label: "Clientes em Risco", value: stats.atRiskClients, icon: AlertTriangle, color: "text-red-500" },
    { label: "Indicações Realizadas", value: stats.totalReferrals, icon: UserPlus, color: "text-pink-500" },
    { label: "Desafios Ativos", value: stats.activeChallenges, icon: Target, color: "text-cyan-500" },
    { label: "Clientes com Saldo", value: stats.clientsWithCashback, icon: Award, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-border/50">
              <CardContent className="pt-5 pb-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-muted ${c.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                    <p className="text-lg font-bold text-foreground">{c.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Clientes em Risco de Perda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AtRiskClientsList />
        </CardContent>
      </Card>
    </div>
  );
};

const AtRiskClientsList = () => {
  const { data: loyalties, isLoading } = useClientLoyalties();
  const { data: clients } = useClients();

  const atRisk = loyalties?.filter((l) => l.retention_status === "at_risk" || l.retention_status === "lost") || [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (atRisk.length === 0) return <p className="text-sm text-muted-foreground">🎉 Nenhum cliente em risco no momento!</p>;

  return (
    <div className="space-y-2">
      {atRisk.slice(0, 10).map((l) => {
        const client = clients?.find((c: any) => c.id === l.client_id);
        return (
          <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                {(client?.name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{client?.name || "Cliente"}</p>
                <p className="text-xs text-muted-foreground">
                  {l.total_visits} visitas • {formatCurrency(l.total_spent)} gasto
                </p>
              </div>
            </div>
            <Badge variant="outline" className={retentionColors[l.retention_status] || "bg-muted text-muted-foreground"}>
              {retentionLabels[l.retention_status] || l.retention_status}
            </Badge>
          </div>
        );
      })}
    </div>
  );
};

// ─── Cashback Tab ───────────────────────────────────────────────
const CashbackTab = () => {
  const { data: config, isLoading: configLoading } = useLoyaltyConfig();
  const saveConfig = useSaveLoyaltyConfig();
  const { data: rules } = useCashbackRules();
  const createRule = useCreateCashbackRule();
  const toggleRule = useToggleCashbackRule();
  const deleteRule = useDeleteCashbackRule();
  const { data: services } = useServices();
  const [newRule, setNewRule] = useState({ name: "", rule_type: "service", cashback_percent: 5, service_id: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Local state for default cashback to avoid saving on every keystroke
  const [localPercent, setLocalPercent] = useState<number>(5);
  useEffect(() => {
    if (config?.default_cashback_percent != null) {
      setLocalPercent(config.default_cashback_percent);
    }
  }, [config?.default_cashback_percent]);

  if (configLoading) {
    return <p className="text-sm text-muted-foreground p-4">Carregando configurações...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Cashback Inteligente</p>
            <p className="text-sm text-muted-foreground">Ative para conceder cashback automático nos serviços</p>
          </div>
          <Switch
            checked={config?.cashback_enabled || false}
            onCheckedChange={(v) => saveConfig.mutate({ cashback_enabled: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Cashback Padrão (%)</Label>
              <p className="text-xs text-muted-foreground">Percentual aplicado quando não há regra específica</p>
            </div>
            <Input
              type="number"
              className="w-24"
              value={localPercent}
              onChange={(e) => setLocalPercent(Number(e.target.value))}
              onBlur={() => {
                const clamped = Math.min(100, Math.max(0, localPercent));
                setLocalPercent(clamped);
                if (clamped !== config?.default_cashback_percent) {
                  saveConfig.mutate({ default_cashback_percent: clamped });
                }
              }}
              min={0}
              max={100}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Regras de Cashback</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus size={14} /> Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Regra de Cashback</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Nome da regra</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="Ex: Cashback em horários ociosos"
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={newRule.rule_type} onValueChange={(v) => setNewRule({ ...newRule, rule_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Serviço específico</SelectItem>
                      <SelectItem value="time_slot">Horário ocioso</SelectItem>
                      <SelectItem value="online_booking">Agendamento online</SelectItem>
                      <SelectItem value="combo">Combo de serviços</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRule.rule_type === "service" && (
                  <div>
                    <Label>Serviço</Label>
                    <Select value={newRule.service_id} onValueChange={(v) => setNewRule({ ...newRule, service_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar serviço" /></SelectTrigger>
                      <SelectContent>
                        {(services || []).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Cashback (%)</Label>
                  <Input
                    type="number"
                    value={newRule.cashback_percent}
                    onChange={(e) => setNewRule({ ...newRule, cashback_percent: Number(e.target.value) })}
                    min={1}
                    max={100}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!newRule.name || newRule.cashback_percent <= 0 || newRule.cashback_percent > 100 || createRule.isPending}
                  onClick={() => {
                    createRule.mutate({
                      name: newRule.name,
                      rule_type: newRule.rule_type,
                      cashback_percent: newRule.cashback_percent,
                      service_id: newRule.service_id || null,
                    } as any);
                    setNewRule({ name: "", rule_type: "service", cashback_percent: 5, service_id: "" });
                    setDialogOpen(false);
                  }}
                >
                  Criar Regra
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!rules?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma regra criada ainda.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Coins size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.cashback_percent}% • {r.rule_type === "service" ? "Serviço" : r.rule_type === "time_slot" ? "Horário" : r.rule_type === "online_booking" ? "Online" : "Combo"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => toggleRule.mutate({ id: r.id, is_active: v })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => deleteRule.mutate(r.id)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Levels Tab ─────────────────────────────────────────────────
const LevelsTab = () => {
  const { data: config } = useLoyaltyConfig();
  const saveConfig = useSaveLoyaltyConfig();
  const { data: levels } = useLoyaltyLevels();
  const createLevel = useCreateLoyaltyLevel();
  const deleteLevel = useDeleteLoyaltyLevel();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLevel, setNewLevel] = useState({
    name: "", min_visits: 0, min_spent: 0, cashback_bonus_percent: 0, color: "#CD7F32", sort_order: 0,
  });

  const defaultLevels = [
    { name: "Bronze", min_visits: 3, min_spent: 200, cashback_bonus_percent: 2, color: "#CD7F32", sort_order: 1 },
    { name: "Prata", min_visits: 8, min_spent: 600, cashback_bonus_percent: 5, color: "#C0C0C0", sort_order: 2 },
    { name: "Ouro", min_visits: 15, min_spent: 1500, cashback_bonus_percent: 8, color: "#FFD700", sort_order: 3 },
    { name: "Black", min_visits: 30, min_spent: 3000, cashback_bonus_percent: 12, color: "#1a1a2e", sort_order: 4 },
  ];

  const [creatingDefaults, setCreatingDefaults] = useState(false);
  const handleCreateDefaults = async () => {
    setCreatingDefaults(true);
    for (const l of defaultLevels) {
      await createLevel.mutateAsync(l as any);
    }
    setCreatingDefaults(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Sistema de Níveis</p>
            <p className="text-sm text-muted-foreground">Gamificação automática baseada em frequência e gasto</p>
          </div>
          <Switch
            checked={config?.levels_enabled || false}
            onCheckedChange={(v) => saveConfig.mutate({ levels_enabled: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Níveis de Fidelidade</CardTitle>
          <div className="flex gap-2">
            {!levels?.length && (
              <Button size="sm" variant="outline" onClick={handleCreateDefaults} disabled={creatingDefaults} className="gap-1.5">
                <Zap size={14} /> {creatingDefaults ? "Criando..." : "Criar Padrão"}
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus size={14} /> Novo Nível
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Nível de Fidelidade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <Label>Nome</Label>
                    <Input value={newLevel.name} onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })} placeholder="Ex: Diamante" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Mín. Visitas</Label>
                      <Input type="number" value={newLevel.min_visits} onChange={(e) => setNewLevel({ ...newLevel, min_visits: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Mín. Gasto (R$)</Label>
                      <Input type="number" value={newLevel.min_spent} onChange={(e) => setNewLevel({ ...newLevel, min_spent: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Bônus Cashback (%)</Label>
                      <Input type="number" value={newLevel.cashback_bonus_percent} onChange={(e) => setNewLevel({ ...newLevel, cashback_bonus_percent: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Cor</Label>
                      <Input type="color" value={newLevel.color} onChange={(e) => setNewLevel({ ...newLevel, color: e.target.value })} />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!newLevel.name}
                    onClick={() => {
                      createLevel.mutate(newLevel as any);
                      setNewLevel({ name: "", min_visits: 0, min_spent: 0, cashback_bonus_percent: 0, color: "#CD7F32", sort_order: (levels?.length || 0) + 1 });
                      setDialogOpen(false);
                    }}
                  >
                    Criar Nível
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!levels?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum nível criado. Clique em "Criar Padrão" para começar.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {levels.map((l) => {
                const LevelIcon = levelIcons[l.name] || Trophy;
                return (
                  <div
                    key={l.id}
                    className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{ background: l.color, filter: "blur(20px)" }} />
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: l.color + "20" }}>
                        <LevelIcon size={20} style={{ color: l.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{l.name}</p>
                        <p className="text-xs text-muted-foreground">+{l.cashback_bonus_percent}% cashback bônus</p>
                      </div>
                      <Button size="icon" variant="ghost" className="ml-auto" onClick={() => deleteLevel.mutate(l.id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>≥ {l.min_visits} visitas</span>
                      <span>≥ {formatCurrency(l.min_spent)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Referrals Tab ──────────────────────────────────────────────
const ReferralsTab = () => {
  const { data: config } = useLoyaltyConfig();
  const saveConfig = useSaveLoyaltyConfig();
  const { data: referrals } = useClientReferrals();
  const { data: clients } = useClients();

  // Local state for referral amounts - save onBlur instead of every keystroke
  const [localReward, setLocalReward] = useState<number>(20);
  const [localBonus, setLocalBonus] = useState<number>(20);

  useEffect(() => {
    if (config?.referral_reward_amount != null) setLocalReward(config.referral_reward_amount);
    if (config?.referral_new_client_bonus != null) setLocalBonus(config.referral_new_client_bonus);
  }, [config?.referral_reward_amount, config?.referral_new_client_bonus]);

  const completedReferrals = referrals?.filter((r) => r.status === "completed") || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Sistema de Indicações</p>
            <p className="text-sm text-muted-foreground">Clientes indicam amigos e ambos ganham crédito</p>
          </div>
          <Switch
            checked={config?.referral_enabled || false}
            onCheckedChange={(v) => saveConfig.mutate({ referral_enabled: v })}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <Label>Recompensa para quem indica (R$)</Label>
            <Input
              type="number"
              className="mt-1.5"
              value={localReward}
              onChange={(e) => setLocalReward(Number(e.target.value))}
              onBlur={() => {
                if (localReward !== config?.referral_reward_amount) {
                  saveConfig.mutate({ referral_reward_amount: localReward });
                }
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <Label>Bônus para novo cliente (R$)</Label>
            <Input
              type="number"
              className="mt-1.5"
              value={localBonus}
              onChange={(e) => setLocalBonus(Number(e.target.value))}
              onBlur={() => {
                if (localBonus !== config?.referral_new_client_bonus) {
                  saveConfig.mutate({ referral_new_client_bonus: localBonus });
                }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus size={16} className="text-pink-500" />
            Indicações Realizadas ({completedReferrals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!completedReferrals.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma indicação concluída ainda.</p>
          ) : (
            <div className="space-y-2">
              {completedReferrals.slice(0, 20).map((r) => {
                const referrer = clients?.find((c: any) => c.id === r.referrer_client_id);
                const referred = clients?.find((c: any) => c.id === r.referred_client_id);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <UserPlus size={16} className="text-pink-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {referrer?.name || "?"} <ArrowRight className="inline w-3 h-3 mx-1" /> {referred?.name || "?"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(r.reward_amount)} de recompensa
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Concluída
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Challenges Tab ─────────────────────────────────────────────
const ChallengesTab = () => {
  const { data: config } = useLoyaltyConfig();
  const saveConfig = useSaveLoyaltyConfig();
  const { data: challenges } = useLoyaltyChallenges();
  const createChallenge = useCreateChallenge();
  const toggleChallenge = useToggleChallenge();
  const deleteChallenge = useDeleteChallenge();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: "", description: "", challenge_type: "visits", target_value: 3,
    reward_type: "cashback", reward_value: 50, reward_description: "",
    starts_at: new Date().toISOString().slice(0, 10),
    ends_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Desafios de Fidelidade</p>
            <p className="text-sm text-muted-foreground">Crie metas gamificadas para engajar clientes</p>
          </div>
          <Switch
            checked={config?.challenges_enabled || false}
            onCheckedChange={(v) => saveConfig.mutate({ challenges_enabled: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Desafios</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus size={14} /> Novo Desafio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Desafio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <Label>Título</Label>
                  <Input value={newChallenge.title} onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })} placeholder="Ex: Faça 3 serviços este mês" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={newChallenge.description} onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })} placeholder="Descrição opcional" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={newChallenge.challenge_type} onValueChange={(v) => setNewChallenge({ ...newChallenge, challenge_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visits">Visitas</SelectItem>
                        <SelectItem value="spend">Valor gasto</SelectItem>
                        <SelectItem value="referrals">Indicações</SelectItem>
                        <SelectItem value="services">Serviços</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Meta</Label>
                    <Input type="number" value={newChallenge.target_value} onChange={(e) => setNewChallenge({ ...newChallenge, target_value: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Recompensa</Label>
                    <Select value={newChallenge.reward_type} onValueChange={(v) => setNewChallenge({ ...newChallenge, reward_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cashback">Cashback (R$)</SelectItem>
                        <SelectItem value="discount">Desconto (%)</SelectItem>
                        <SelectItem value="free_service">Serviço grátis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor da Recompensa</Label>
                    <Input type="number" value={newChallenge.reward_value} onChange={(e) => setNewChallenge({ ...newChallenge, reward_value: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início</Label>
                    <Input type="date" value={newChallenge.starts_at} onChange={(e) => setNewChallenge({ ...newChallenge, starts_at: e.target.value })} />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input type="date" value={newChallenge.ends_at} onChange={(e) => setNewChallenge({ ...newChallenge, ends_at: e.target.value })} />
                  </div>
                </div>
                <Button
                  className="w-full"
                  disabled={!newChallenge.title || createChallenge.isPending}
                  onClick={() => {
                    createChallenge.mutate({
                      ...newChallenge,
                      starts_at: new Date(newChallenge.starts_at).toISOString(),
                      ends_at: new Date(newChallenge.ends_at).toISOString(),
                    } as any);
                    setDialogOpen(false);
                  }}
                >
                  {createChallenge.isPending ? "Criando..." : "Criar Desafio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!challenges?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum desafio criado ainda.</p>
          ) : (
            <div className="space-y-3">
              {challenges.map((ch) => (
                <div key={ch.id} className="p-4 rounded-xl border border-border/60 bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Target size={18} className="text-cyan-500" />
                      <div>
                        <p className="font-medium text-foreground">{ch.title}</p>
                        {ch.description && <p className="text-xs text-muted-foreground mt-0.5">{ch.description}</p>}
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>Meta: {ch.target_value} {ch.challenge_type === "visits" ? "visitas" : ch.challenge_type === "spend" ? "R$" : ch.challenge_type === "referrals" ? "indicações" : "serviços"}</span>
                          <span>Recompensa: {ch.reward_type === "cashback" ? formatCurrency(ch.reward_value) : ch.reward_type === "discount" ? `${ch.reward_value}%` : "Serviço grátis"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="inline w-3 h-3 mr-1" />
                          {new Date(ch.starts_at).toLocaleDateString("pt-BR")} → {new Date(ch.ends_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ch.is_active}
                        onCheckedChange={(v) => toggleChallenge.mutate({ id: ch.id, is_active: v })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => deleteChallenge.mutate(ch.id)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Ranking Tab ────────────────────────────────────────────────
const RankingTab = () => {
  const { data: cashbacks } = useClientCashbacks();
  const { data: loyalties } = useClientLoyalties();
  const { data: clients } = useClients();
  const { data: levels } = useLoyaltyLevels();

  const sortedBySpent = [...(loyalties || [])].sort((a, b) => b.total_spent - a.total_spent).slice(0, 20);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Ranking de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sortedBySpent.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado de fidelidade ainda.</p>
          ) : (
            <div className="space-y-2">
              {sortedBySpent.map((l, idx) => {
                const client = clients?.find((c: any) => c.id === l.client_id);
                const level = levels?.find((lv) => lv.id === l.level_id);
                const cashback = cashbacks?.find((c) => c.client_id === l.client_id);
                const LevelIcon = level ? (levelIcons[level.name] || Trophy) : Star;
                return (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{client?.name || "Cliente"}</p>
                        {level && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: level.color + "40", color: level.color }}>
                            <LevelIcon className="w-2.5 h-2.5 mr-0.5" /> {level.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {l.total_visits} visitas • {formatCurrency(l.total_spent)} gasto
                        {cashback && cashback.balance > 0 && ` • ${formatCurrency(cashback.balance)} saldo`}
                      </p>
                    </div>
                    <Badge variant="outline" className={retentionColors[l.retention_status] || "bg-muted text-muted-foreground"}>
                      {retentionLabels[l.retention_status] || l.retention_status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────
const Rewards = () => {
  return (
    <DashboardLayout title="Gende Rewards" subtitle="Fidelidade inteligente para seus clientes">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gift className="text-primary" size={26} />
              Gende Rewards
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fidelidade inteligente • Cashback • Gamificação • Indicações
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <TrendingUp size={14} /> Painel
            </TabsTrigger>
            <TabsTrigger value="cashback" className="gap-1.5 text-xs">
              <Coins size={14} /> Cashback
            </TabsTrigger>
            <TabsTrigger value="levels" className="gap-1.5 text-xs">
              <Trophy size={14} /> Níveis
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1.5 text-xs">
              <UserPlus size={14} /> Indicações
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-1.5 text-xs">
              <Target size={14} /> Desafios
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1.5 text-xs">
              <Award size={14} /> Ranking
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard"><DashboardTab /></TabsContent>
            <TabsContent value="cashback"><CashbackTab /></TabsContent>
            <TabsContent value="levels"><LevelsTab /></TabsContent>
            <TabsContent value="referrals"><ReferralsTab /></TabsContent>
            <TabsContent value="challenges"><ChallengesTab /></TabsContent>
            <TabsContent value="ranking"><RankingTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Rewards;
