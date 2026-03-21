import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Star, Loader2, MessageSquare, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type PlatformReview = Tables<"platform_reviews"> & {
  professionals?: { name: string; business_name: string | null };
};

const AdminPlatformReviews = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-platform-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_reviews")
        .select("*, professionals:professional_id(name, business_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PlatformReview[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-platform-reviews"] });
      toast.success("Avaliação removida com sucesso");
    },
    onError: (e: Error) => toast.error("Erro ao remover: " + e.message),
  });

  const filtered = (reviews || []).filter(r => {
    const matchesSearch = !search || r.client_name.toLowerCase().includes(search.toLowerCase()) || r.comment?.toLowerCase().includes(search.toLowerCase());
    const matchesRating = ratingFilter === "all" || r.rating === Number(ratingFilter);
    return matchesSearch && matchesRating;
  });

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: (reviews || []).filter(r => r.rating === star).length,
    pct: reviews?.length ? ((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0,
  }));

  return (
    <AdminLayout title="Avaliações da Plataforma" subtitle="Feedback dos clientes sobre a experiência de agendamento">
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={20} className={s <= Math.round(Number(avgRating)) ? "text-warning fill-warning" : "text-muted-foreground"} />
                ))}
              </div>
              <p className="text-3xl font-bold text-foreground">{avgRating}</p>
              <p className="text-xs text-muted-foreground mt-1">{reviews?.length || 0} avaliações</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 col-span-2">
              <div className="space-y-2">
                {ratingCounts.map(r => (
                  <div key={r.star} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-6">{r.star}★</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Buscar por nome ou comentário..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filtrar estrelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="5">5 estrelas</SelectItem>
                <SelectItem value="4">4 estrelas</SelectItem>
                <SelectItem value="3">3 estrelas</SelectItem>
                <SelectItem value="2">2 estrelas</SelectItem>
                <SelectItem value="1">1 estrela</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews list */}
          <div className="space-y-4">
            {!filtered.length && (
              <div className="glass-card rounded-2xl p-12 text-center">
                <MessageSquare size={40} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {search || ratingFilter !== "all" ? "Nenhuma avaliação encontrada com esses filtros" : "Nenhuma avaliação da plataforma recebida ainda"}
                </p>
              </div>
            )}
            {filtered.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{review.client_name}</p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={12} className={s <= review.rating ? "text-warning fill-warning" : "text-muted-foreground"} />
                        ))}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {review.professionals?.business_name || review.professionals?.name || "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(review.created_at), "dd/MM/yyyy HH:mm")}</p>
                    {review.comment && <p className="text-sm text-foreground mt-2">{review.comment}</p>}
                    {review.client_phone && <p className="text-xs text-muted-foreground mt-1">📱 {review.client_phone}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Remover avaliação"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover avaliação?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A avaliação de "{review.client_name}" será removida permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(review.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminPlatformReviews;
