import { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCourses, useCourseClasses, useCourseEnrollments } from "@/hooks/useCourses";
import { useProfessional } from "@/hooks/useProfessional";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Calendar, Users, DollarSign, TrendingUp, AlertTriangle, Zap, Sparkles, Lightbulb, Target, Copy, MessageCircle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

const CourseDashboard = () => {
  const { courses } = useCourses();
  const { classes } = useCourseClasses();
  const { enrollments } = useCourseEnrollments();
  const { data: professional } = useProfessional();

  const waitlistCount = useQuery({
    queryKey: ["course-waitlist-count", professional?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("course_waitlist")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", professional!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!professional?.id,
  });

  const stats = useMemo(() => {
    const courseList = courses.data || [];
    const classList = classes.data || [];
    const enrollList = enrollments.data || [];

    const activeCourses = courseList.filter((c: any) => c.status === "active").length;
    const openClasses = classList.filter((c: any) => c.status === "open").length;
    const totalStudents = enrollList.filter((e: any) => e.enrollment_status === "confirmed").length;
    const totalRevenue = enrollList
      .filter((e: any) => e.payment_status === "paid")
      .reduce((sum: number, e: any) => sum + Number(e.amount_paid || 0), 0);
    const pendingPayments = enrollList.filter((e: any) => e.payment_status === "pending").length;
    const almostFull = classList.filter((c: any) => {
      const remaining = c.max_students - c.enrolled_count;
      return remaining > 0 && remaining <= 3 && c.status === "open";
    });
    const lowOccupancy = classList.filter((c: any) => {
      const occupancy = c.max_students > 0 ? (c.enrolled_count / c.max_students) * 100 : 0;
      return occupancy < 30 && c.status === "open";
    });

    // Revenue by course
    const revByCourse: Record<string, { name: string; revenue: number; students: number }> = {};
    enrollList.forEach((e: any) => {
      if (e.payment_status === "paid") {
        const courseName = e.courses?.name || "—";
        if (!revByCourse[e.course_id]) revByCourse[e.course_id] = { name: courseName, revenue: 0, students: 0 };
        revByCourse[e.course_id].revenue += Number(e.amount_paid || 0);
        revByCourse[e.course_id].students += 1;
      }
    });
    const topCourses = Object.values(revByCourse).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return { activeCourses, openClasses, totalStudents, totalRevenue, pendingPayments, almostFull, lowOccupancy, topCourses };
  }, [courses.data, classes.data, enrollments.data]);

  const isLoading = courses.isLoading || classes.isLoading || enrollments.isLoading;

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard de Cursos">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="text-primary" /> Dashboard de Cursos</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard de Cursos">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="text-primary" size={28} />
            Dashboard de Cursos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral das suas formações</p>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap size={18} className="text-primary" />
                <span className="text-xs text-muted-foreground">Cursos Ativos</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stats.activeCourses}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-info" />
                <span className="text-xs text-muted-foreground">Turmas Abertas</span>
              </div>
              <p className="text-2xl font-bold text-info">{stats.openClasses}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-success" />
                <span className="text-xs text-muted-foreground">Alunos Inscritos</span>
              </div>
              <p className="text-2xl font-bold text-success">{stats.totalStudents}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-warning" />
                <span className="text-xs text-muted-foreground">Faturamento</span>
              </div>
              <p className="text-2xl font-bold text-warning">
                R$ {stats.totalRevenue.toFixed(2).replace(".", ",")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Zap size={16} className="text-primary" /> Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.pendingPayments > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 text-warning text-sm">
                  <DollarSign size={14} />
                  <span>{stats.pendingPayments} pagamento{stats.pendingPayments > 1 ? "s" : ""} pendente{stats.pendingPayments > 1 ? "s" : ""}</span>
                </div>
              )}
              {stats.almostFull.map((cls: any) => (
                <div key={cls.id} className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-sm">
                  <TrendingUp size={14} />
                  <span><strong>{cls.name}</strong> quase lotada! ({cls.enrolled_count}/{cls.max_students})</span>
                </div>
              ))}
              {stats.lowOccupancy.map((cls: any) => (
                <div key={cls.id} className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle size={14} />
                  <span><strong>{cls.name}</strong> com baixa ocupação ({cls.enrolled_count}/{cls.max_students})</span>
                </div>
              ))}
              {stats.pendingPayments === 0 && stats.almostFull.length === 0 && stats.lowOccupancy.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta no momento ✨</p>
              )}
            </CardContent>
          </Card>

          {/* Top Courses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Cursos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.topCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda registrada ainda</p>
              ) : (
                stats.topCourses.map((tc, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{tc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{tc.students} aluno{tc.students > 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">R$ {tc.revenue.toFixed(2).replace(".", ",")}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Class Occupancy */}
        {(classes.data || []).filter((c: any) => c.status === "open").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Users size={16} className="text-primary" /> Ocupação das Turmas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(classes.data || [])
                .filter((c: any) => c.status === "open")
                .map((cls: any) => {
                  const occ = cls.max_students > 0 ? Math.round((cls.enrolled_count / cls.max_students) * 100) : 0;
                  return (
                    <div key={cls.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{cls.courses?.name} — {cls.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0 ml-2">{cls.enrolled_count}/{cls.max_students}</span>
                      </div>
                      <Progress value={occ} className="h-2" />
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CourseDashboard;
