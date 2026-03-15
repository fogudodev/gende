import { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCourses, useCourseClasses, useCourseEnrollments } from "@/hooks/useCourses";
import { DollarSign, TrendingUp, Users, CreditCard, AlertTriangle, PieChart, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const CourseFinance = () => {
  const { courses } = useCourses();
  const { classes } = useCourseClasses();
  const { enrollments } = useCourseEnrollments();

  const stats = useMemo(() => {
    const enrollList = enrollments.data || [];
    const classList = classes.data || [];

    const totalRevenue = enrollList
      .filter((e: any) => e.payment_status === "paid")
      .reduce((sum: number, e: any) => sum + Number(e.amount_paid || 0), 0);

    const pendingRevenue = enrollList
      .filter((e: any) => e.payment_status === "pending" && e.enrollment_status === "confirmed")
      .reduce((sum: number, e: any) => {
        const course = (courses.data || []).find((c: any) => c.id === e.course_id);
        return sum + Number(course?.price || 0);
      }, 0);

    const paidCount = enrollList.filter((e: any) => e.payment_status === "paid").length;
    const pendingCount = enrollList.filter((e: any) => e.payment_status === "pending").length;
    const overdueCount = enrollList.filter((e: any) => e.payment_status === "overdue").length;
    const refundedCount = enrollList.filter((e: any) => e.payment_status === "refunded").length;

    // Revenue by course
    const revByCourse: Record<string, { name: string; revenue: number; paid: number; pending: number; expected: number }> = {};
    enrollList.forEach((e: any) => {
      const courseName = e.courses?.name || "—";
      if (!revByCourse[e.course_id]) {
        const course = (courses.data || []).find((c: any) => c.id === e.course_id);
        revByCourse[e.course_id] = { name: courseName, revenue: 0, paid: 0, pending: 0, expected: Number(course?.price || 0) };
      }
      if (e.payment_status === "paid") {
        revByCourse[e.course_id].revenue += Number(e.amount_paid || 0);
        revByCourse[e.course_id].paid += 1;
      }
      if (e.payment_status === "pending") {
        revByCourse[e.course_id].pending += 1;
      }
    });
    const courseBreakdown = Object.values(revByCourse).sort((a, b) => b.revenue - a.revenue);

    // Revenue by class
    const revByClass: Record<string, { name: string; courseName: string; revenue: number; students: number }> = {};
    enrollList.forEach((e: any) => {
      if (e.payment_status === "paid") {
        const cls = classList.find((c: any) => c.id === e.class_id);
        if (!revByClass[e.class_id]) {
          revByClass[e.class_id] = {
            name: cls?.name || e.course_classes?.name || "—",
            courseName: e.courses?.name || "—",
            revenue: 0,
            students: 0,
          };
        }
        revByClass[e.class_id].revenue += Number(e.amount_paid || 0);
        revByClass[e.class_id].students += 1;
      }
    });
    const classBreakdown = Object.values(revByClass).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Payment method breakdown
    const byMethod: Record<string, number> = {};
    enrollList.filter((e: any) => e.payment_status === "paid").forEach((e: any) => {
      const method = e.payment_method || "não informado";
      byMethod[method] = (byMethod[method] || 0) + Number(e.amount_paid || 0);
    });

    return { totalRevenue, pendingRevenue, paidCount, pendingCount, overdueCount, refundedCount, courseBreakdown, classBreakdown, byMethod };
  }, [courses.data, classes.data, enrollments.data]);

  const isLoading = courses.isLoading || classes.isLoading || enrollments.isLoading;

  if (isLoading) {
    return (
      <DashboardLayout title="Financeiro de Cursos">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="text-primary" /> Financeiro de Cursos</h1>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const methodLabels: Record<string, string> = {
    pix: "PIX", card: "Cartão", cash: "Dinheiro", transfer: "Transferência", other: "Outro", "não informado": "Não informado"
  };

  return (
    <DashboardLayout title="Financeiro de Cursos">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="text-primary" size={28} />
            Financeiro de Cursos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe o faturamento dos seus cursos</p>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-success" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebido</span>
              </div>
              <p className="text-xl font-bold text-success">R$ {stats.totalRevenue.toFixed(2).replace(".", ",")}</p>
              <p className="text-[10px] text-muted-foreground">{stats.paidCount} pagamento{stats.paidCount !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-warning" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendente</span>
              </div>
              <p className="text-xl font-bold text-warning">R$ {stats.pendingRevenue.toFixed(2).replace(".", ",")}</p>
              <p className="text-[10px] text-muted-foreground">{stats.pendingCount} pendente{stats.pendingCount !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-destructive" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Vencidos</span>
              </div>
              <p className="text-xl font-bold text-destructive">{stats.overdueCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard size={16} className="text-info" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Reembolsos</span>
              </div>
              <p className="text-xl font-bold text-info">{stats.refundedCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Revenue by course */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 size={16} className="text-primary" /> Faturamento por Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.courseBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda ainda</p>
              ) : (
                stats.courseBreakdown.map((c, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <span className="text-sm font-bold text-primary shrink-0 ml-2">R$ {c.revenue.toFixed(2).replace(".", ",")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{c.paid} pago{c.paid !== 1 ? "s" : ""}</span>
                      {c.pending > 0 && <Badge variant="outline" className="text-[9px]">{c.pending} pendente{c.pending !== 1 ? "s" : ""}</Badge>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Payment methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><PieChart size={16} className="text-primary" /> Por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(stats.byMethod).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
              ) : (
                Object.entries(stats.byMethod).map(([method, amount]) => {
                  const pct = stats.totalRevenue > 0 ? (amount / stats.totalRevenue) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{methodLabels[method] || method}</span>
                        <span className="text-muted-foreground">R$ {amount.toFixed(2).replace(".", ",")}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top classes */}
        {stats.classBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> Turmas Mais Lucrativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.classBreakdown.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.courseName} · {c.students} aluno{c.students !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">R$ {c.revenue.toFixed(2).replace(".", ",")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CourseFinance;
