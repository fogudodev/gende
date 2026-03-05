import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Star, Eye, EyeOff, MessageSquare, Loader2, Search } from "lucide-react";
import { useReviews, useToggleReviewVisibility } from "@/hooks/useReviews";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Reviews = () => {
  const { data: reviews, isLoading } = useReviews();
  const toggleVisibility = useToggleReviewVisibility();
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

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
    <DashboardLayout title="Avaliações" subtitle="Feedback dos seus clientes">
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
                  {search || ratingFilter !== "all" ? "Nenhuma avaliação encontrada com esses filtros" : "Nenhuma avaliação recebida ainda"}
                </p>
              </div>
            )}
            {filtered.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn("glass-card rounded-2xl p-5", !review.is_public && "opacity-60")}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm">{review.client_name}</p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={12} className={s <= review.rating ? "text-warning fill-warning" : "text-muted-foreground"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(review.created_at), "dd/MM/yyyy")}</p>
                    {review.comment && <p className="text-sm text-foreground mt-2">{review.comment}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={review.is_public ? "Ocultar" : "Tornar público"}
                        disabled={toggleVisibility.isPending}
                      >
                        {review.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {review.is_public ? "Ocultar avaliação?" : "Tornar avaliação pública?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {review.is_public
                            ? "Esta avaliação não será mais visível na sua página pública."
                            : "Esta avaliação ficará visível para todos na sua página pública."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => toggleVisibility.mutate({ id: review.id, is_public: !review.is_public })}
                        >
                          Confirmar
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
    </DashboardLayout>
  );
};

export default Reviews;
