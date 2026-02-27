import { useState, useMemo } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useProfessionalLimits, useUpsertProfessionalLimits, useDeleteProfessionalLimits } from "@/hooks/useProfessionalLimits";
import { toast } from "sonner";
import { Loader2, Save, Search, Trash2, Plus, UserCog } from "lucide-react";
import { Input } from "@/components/ui/input";

const AdminProfessionalLimits = () => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    daily_reminders: null as number | null,
    daily_campaigns: null as number | null,
    campaign_max_contacts: null as number | null,
    campaign_min_interval_hours: null as number | null,
  });

  const { data: professionals, isLoading: loadingPros } = useQuery({
    queryKey: ["admin-professionals-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, email, business_name, account_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: limits, isLoading: loadingLimits } = useProfessionalLimits();
  const upsert = useUpsertProfessionalLimits();
  const deleteLimits = useDeleteProfessionalLimits();

  const limitsMap = useMemo(() => {
    const map: Record<string, any> = {};
    (limits || []).forEach((l: any) => { map[l.professional_id] = l; });
    return map;
  }, [limits]);

  const filtered = useMemo(() => {
    if (!professionals) return [];
    const s = search.toLowerCase();
    return professionals.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.business_name || "").toLowerCase().includes(s) ||
        p.email.toLowerCase().includes(s)
    );
  }, [professionals, search]);

  const startEdit = (proId: string) => {
    const existing = limitsMap[proId];
    setEditingId(proId);
    setForm({
      daily_reminders: existing?.daily_reminders ?? null,
      daily_campaigns: existing?.daily_campaigns ?? null,
      campaign_max_contacts: existing?.campaign_max_contacts ?? null,
      campaign_min_interval_hours: existing?.campaign_min_interval_hours ?? null,
    });
  };

  const handleSave = async (proId: string) => {
    try {
      await upsert.mutateAsync({ professional_id: proId, ...form });
      toast.success("Limites personalizados salvos");
      setEditingId(null);
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async (proId: string) => {
    try {
      await deleteLimits.mutateAsync(proId);
      toast.success("Limites personalizados removidos (voltou ao padrão do plano)");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const isLoading = loadingPros || loadingLimits;

  return (
    <AdminLayout title="Limites por Profissional" subtitle="Override de limites individuais (vazio = usa o padrão do plano)">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar profissional..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Valores vazios = padrão do plano. Use <strong className="text-foreground">-1</strong> para ilimitado.
          </p>

          {filtered.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">
              Nenhum profissional encontrado.
            </div>
          )}

          {filtered.map((pro) => {
            const hasOverride = !!limitsMap[pro.id];
            const isEditing = editingId === pro.id;
            const override = limitsMap[pro.id];

            return (
              <div key={pro.id} className="glass-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                      <UserCog size={16} className="text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">
                        {pro.business_name || pro.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        {pro.email} · {pro.account_type === "salon" ? "Salão" : "Autônomo"}
                      </p>
                    </div>
                    {hasOverride && (
                      <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        PERSONALIZADO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasOverride && !isEditing && (
                      <button
                        onClick={() => handleDelete(pro.id)}
                        className="text-xs text-destructive hover:underline flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Resetar
                      </button>
                    )}
                    {!isEditing ? (
                      <button
                        onClick={() => startEdit(pro.id)}
                        className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        <Plus size={12} /> {hasOverride ? "Editar" : "Personalizar"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSave(pro.id)}
                        disabled={upsert.isPending}
                        className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline disabled:opacity-50"
                      >
                        <Save size={12} /> Salvar
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {[
                      { key: "daily_reminders", label: "Lembretes/dia" },
                      { key: "daily_campaigns", label: "Campanhas/dia" },
                      { key: "campaign_max_contacts", label: "Contatos/campanha" },
                      { key: "campaign_min_interval_hours", label: "Intervalo (horas)" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                        <input
                          type="number"
                          value={(form as any)[key] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value);
                            setForm((prev) => ({ ...prev, [key]: val }));
                          }}
                          placeholder="Padrão do plano"
                          className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted-foreground/50"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!isEditing && hasOverride && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                    {[
                      { key: "daily_reminders", label: "Lembretes/dia" },
                      { key: "daily_campaigns", label: "Campanhas/dia" },
                      { key: "campaign_max_contacts", label: "Contatos/campanha" },
                      { key: "campaign_min_interval_hours", label: "Intervalo (horas)" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                        <p className="text-foreground font-semibold text-sm">
                          {override[key] === null
                            ? "—"
                            : override[key] === -1
                            ? "∞"
                            : override[key]}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProfessionalLimits;
