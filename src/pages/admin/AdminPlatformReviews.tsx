import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface PlatformReview {
  id: string;
  professional_id: string;
  booking_id: string | null;
  client_name: string;
  client_phone: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  professionals?: { name: string; business_name: string | null };
}

const AdminPlatformReviews = () => {
  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ["admin-platform-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_reviews" as any)
        .select("*, professionals:professional_id(name, business_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PlatformReview[];
    },
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("platform_reviews" as any).delete().eq("id", id);
    if (!error) { toast.success("Avaliação removida"); refetch(); }
    else toast.error("Erro ao remover");
  };

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

          {/* Reviews list */}
          <div className="space-y-4">
            {!(reviews || []).length && (
              <div className="glass-card rounded-2xl p-12 text-center">
                <MessageSquare size={40} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma avaliação da plataforma recebida ainda</p>
              </div>
            )}
            {(reviews || []).map((review, i) => (
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
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="Remover avaliação"
                  >
                    <Trash2 size={16} />
                  </button>
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
