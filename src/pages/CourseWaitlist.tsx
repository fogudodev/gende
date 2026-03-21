import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCourses, useCourseClasses } from "@/hooks/useCourses";
import { useProfessional } from "@/hooks/useProfessional";
import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Clock, Search, Users, Bell, TrendingUp, Lightbulb, UserPlus, Trash2, Loader2, AlertTriangle, Sparkles, Copy, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CourseWaitlist = () => {
  const { data: professional } = useProfessional();
  const { courses } = useCourses();
  const { classes } = useCourseClasses();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const waitlist = useQuery({
    queryKey: ["course-waitlist", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("course_waitlist")
        .select("*, course_classes(name, class_date, course_id, max_students, enrolled_count, courses(name))")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });

  const removeFromWaitlist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.from("course_waitlist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-waitlist"] });
      toast({ title: "Removido da lista de espera" });
    },
  });

  const markNotified = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("course_waitlist")
        .update({ notified: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-waitlist"] });
      toast({ title: "Marcado como notificado" });
    },
  });

  const filtered = (waitlist.data || []).filter((w: any) => {
    const matchSearch =
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.phone?.includes(search) ||
      w.email?.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === "all" || w.class_id === classFilter;
    return matchSearch && matchClass;
  });

  // Smart insights
  const insights = useMemo(() => {
    const wl = waitlist.data || [];
    const cl = classes.data || [];
    const results: { type: "warning" | "suggestion" | "insight"; icon: any; text: string; action?: string }[] = [];

    // Group by class
    const byClass: Record<string, { count: number; className: string; courseName: string; classId: string }> = {};
    wl.forEach((w: any) => {
      if (!byClass[w.class_id]) {
        byClass[w.class_id] = {
          count: 0,
          className: w.course_classes?.name || "—",
          courseName: w.course_classes?.courses?.name || "—",
          classId: w.class_id,
        };
      }
      byClass[w.class_id].count++;
    });

    // High demand classes (5+ waiting)
    Object.values(byClass).forEach((b) => {
      if (b.count >= 5) {
        results.push({
          type: "suggestion",
          icon: TrendingUp,
          text: `"${b.courseName} — ${b.className}" tem ${b.count} pessoas na fila. Considere abrir uma nova turma!`,
          action: "Abrir nova turma",
        });
      } else if (b.count >= 3) {
        results.push({
          type: "insight",
          icon: Lightbulb,
          text: `${b.count} interessados em "${b.className}". A demanda está crescendo!`,
        });
      }
    });

    // Total accumulation alert
    if (wl.length >= 10) {
      results.push({
        type: "warning",
        icon: AlertTriangle,
        text: `Você tem ${wl.length} pessoas na lista de espera total. Não perca essas oportunidades de venda!`,
      });
    }

    // Unnotified count
    const unnotified = wl.filter((w: any) => !w.notified).length;
    if (unnotified > 0) {
      results.push({
        type: "insight",
        icon: Bell,
        text: `${unnotified} pessoa${unnotified > 1 ? "s" : ""} ainda não ${unnotified > 1 ? "foram notificadas" : "foi notificada"}.`,
      });
    }

    return results;
  }, [waitlist.data, classes.data]);

  const generateWhatsAppMessage = (entry: any) => {
    const courseName = entry.course_classes?.courses?.name || "nosso curso";
    return `Olá ${entry.name}! 🎉 Temos uma novidade para você: acabou de abrir vaga na turma "${entry.course_classes?.name}" do curso *${courseName}*. Quer garantir sua vaga? Responda aqui!`;
  };

  const copyMessage = (entry: any) => {
    navigator.clipboard.writeText(generateWhatsAppMessage(entry));
    toast({ title: "Mensagem copiada!" });
  };

  const openWhatsApp = (entry: any) => {
    const msg = encodeURIComponent(generateWhatsAppMessage(entry));
    const phone = entry.phone?.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const stats = {
    total: (waitlist.data || []).length,
    notified: (waitlist.data || []).filter((w: any) => w.notified).length,
    pending: (waitlist.data || []).filter((w: any) => !w.notified).length,
    classes: new Set((waitlist.data || []).map((w: any) => w.class_id)).size,
  };

  return (
    <DashboardLayout title="Lista de Espera">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Clock className="text-primary" size={28} />
            Lista de Espera Inteligente
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie interessados e converta demanda em vendas</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Na fila</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-warning">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Não notificados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-success">{stats.notified}</p>
              <p className="text-[10px] text-muted-foreground">Notificados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-info">{stats.classes}</p>
              <p className="text-[10px] text-muted-foreground">Turmas</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                Insights Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.map((insight, i) => {
                const Icon = insight.icon;
                const colorClass =
                  insight.type === "warning" ? "text-warning bg-warning/10" :
                  insight.type === "suggestion" ? "text-primary bg-primary/10" :
                  "text-info bg-info/10";
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${colorClass}`}>
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <p className="text-sm flex-1">{insight.text}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, telefone ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {(classes.data || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.courses?.name} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Waitlist Table */}
        {waitlist.isLoading ? (
          <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lista de espera vazia</h3>
              <p className="text-muted-foreground text-sm">Quando turmas lotarem, interessados aparecerão aqui</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Contato</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{w.name}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="text-xs text-muted-foreground">{w.phone}</p>
                        <p className="text-[10px] text-muted-foreground">{w.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-medium">{w.course_classes?.courses?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{w.course_classes?.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={w.notified ? "secondary" : "outline"} className="text-[10px]">
                          {w.notified ? "Notificado" : "Aguardando"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {format(new Date(w.created_at), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {w.phone && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openWhatsApp(w)} title="Enviar WhatsApp">
                              <MessageCircle size={14} className="text-success" />
                            </Button>
                          )}
                          {!w.notified && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markNotified.mutate(w.id)} title="Marcar como notificado">
                              <Bell size={14} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyMessage(w)} title="Copiar mensagem">
                            <Copy size={14} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 size={14} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover da lista?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {w.name} será removido da lista de espera.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeFromWaitlist.mutate(w.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CourseWaitlist;
