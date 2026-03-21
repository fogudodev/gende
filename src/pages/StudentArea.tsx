import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap, BookOpen, Award, Calendar, MapPin, Monitor, Clock,
  FileText, Download, ExternalLink, Loader2, Search, CheckCircle, AlertCircle,
  User, Mail, Phone, Blend, MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const modalityIcon = (m: string) => m === "online" ? <Monitor size={14} /> : m === "hybrid" ? <Blend size={14} /> : <MapPin size={14} />;
const modalityLabel = (m: string) => m === "online" ? "Online" : m === "hybrid" ? "Híbrido" : "Presencial";

const StudentArea = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"login" | "dashboard">("login");
  const [loading, setLoading] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [professional, setProfessional] = useState<any>(null);
  const [studentName, setStudentName] = useState("");

  // Auto-login via query params
  useEffect(() => {
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    if (email) {
      setLookupEmail(email);
      handleLookup(email, "");
    } else if (phone) {
      setLookupPhone(phone);
      handleLookup("", phone);
    }
  }, []);

  const handleLookup = async (email?: string, phone?: string) => {
    const e = email ?? lookupEmail;
    const p = phone ?? lookupPhone;
    if (!e.trim() && !p.trim()) return;
    setLoading(true);

    let query = supabase
      .from("course_enrollments")
      .select("*, courses(name, short_description, modality, workload_hours, has_certificate, cover_image_url, professional_id, syllabus, materials_included), course_classes(name, class_date, start_time, end_time, location, modality, online_link, status)")
      .in("enrollment_status", ["confirmed", "pending"]);

    if (e.trim()) {
      query = query.eq("student_email", e.trim().toLowerCase());
    } else {
      query = query.eq("student_phone", p.trim());
    }

    const { data, error } = await query.order("enrolled_at", { ascending: false });
    if (error || !data || data.length === 0) {
      setLoading(false);
      setEnrollments([]);
      return;
    }

    setEnrollments(data);
    setStudentName(data[0].student_name || "");

    // Load professional info
    const profId = data[0].courses?.professional_id;
    if (profId) {
      const { data: prof } = await supabase
        .from("professionals")
        .select("name, business_name, logo_url, phone, primary_color")
        .eq("id", profId)
        .single();
      setProfessional(prof);
    }

    // Load materials for enrolled courses
    const courseIds = [...new Set(data.map((d: any) => d.course_id))];
    if (courseIds.length > 0) {
      const { data: mats } = await supabase
        .from("course_materials")
        .select("*")
        .in("course_id", courseIds)
        .order("sort_order");
      setMaterials(mats || []);
    }

    // Load certificates
    const enrollmentIds = data.map((d: any) => d.id);
    if (enrollmentIds.length > 0) {
      const { data: certs } = await supabase
        .from("course_certificates")
        .select("*")
        .in("enrollment_id", enrollmentIds);
      setCertificates(certs || []);
    }

    setStep("dashboard");
    setLoading(false);
  };

  const primaryColor = professional?.primary_color || "hsl(var(--primary))";

  if (step === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap size={32} className="text-primary" />
            </div>
            <CardTitle className="text-2xl">Área do Aluno</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acesse seus cursos, materiais e certificados
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
            </div>
            <Button
              onClick={() => handleLookup()}
              disabled={loading || (!lookupEmail.trim() && !lookupPhone.trim())}
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
              Acessar meus cursos
            </Button>
            {enrollments.length === 0 && step === "login" && !loading && (lookupEmail || lookupPhone) && (
              <p className="text-sm text-destructive text-center">Nenhuma inscrição encontrada com esses dados.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {professional?.logo_url ? (
              <img src={professional.logo_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
            ) : (
              <GraduationCap size={24} className="text-primary" />
            )}
            <div>
              <p className="font-semibold text-sm text-foreground">{professional?.business_name || professional?.name || "Área do Aluno"}</p>
              <p className="text-[10px] text-muted-foreground">Olá, {studentName}!</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setStep("login"); setEnrollments([]); }}>
            Sair
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            <TabsTrigger value="courses" className="gap-1 text-xs"><BookOpen size={14} /> Cursos</TabsTrigger>
            <TabsTrigger value="materials" className="gap-1 text-xs"><FileText size={14} /> Materiais</TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1 text-xs"><Award size={14} /> Certificados</TabsTrigger>
          </TabsList>

          {/* Courses tab */}
          <TabsContent value="courses" className="space-y-4">
            {enrollments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum curso encontrado</p>
                </CardContent>
              </Card>
            ) : (
              enrollments.map((enr: any) => (
                <Card key={enr.id} className="overflow-hidden">
                  {enr.courses?.cover_image_url && (
                    <div className="h-32 overflow-hidden">
                      <img src={enr.courses.cover_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{enr.courses?.name}</h3>
                        {enr.courses?.short_description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{enr.courses.short_description}</p>
                        )}
                      </div>
                      <Badge variant={enr.enrollment_status === "confirmed" ? "default" : "outline"} className="shrink-0">
                        {enr.enrollment_status === "confirmed" ? "Confirmada" : "Pendente"}
                      </Badge>
                    </div>

                    {/* Class info */}
                    <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2">
                      <p className="font-semibold text-sm">{enr.course_classes?.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {enr.course_classes?.class_date &&
                            format(new Date(enr.course_classes.class_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {enr.course_classes?.start_time?.slice(0, 5)} - {enr.course_classes?.end_time?.slice(0, 5)}
                        </span>
                        {enr.course_classes?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {enr.course_classes.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {modalityIcon(enr.course_classes?.modality)} {modalityLabel(enr.course_classes?.modality)}
                        </span>
                      </div>

                      {/* Online link */}
                      {enr.course_classes?.online_link && enr.enrollment_status === "confirmed" && (
                        <a
                          href={enr.course_classes.online_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline mt-1"
                        >
                          <Monitor size={14} /> Acessar aula online
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    {/* Payment status */}
                    <div className="flex items-center gap-2 text-sm">
                      {enr.payment_status === "paid" ? (
                        <span className="flex items-center gap-1 text-success"><CheckCircle size={14} /> Pagamento confirmado</span>
                      ) : (
                        <span className="flex items-center gap-1 text-warning"><AlertCircle size={14} /> Pagamento {enr.payment_status === "pending" ? "pendente" : enr.payment_status}</span>
                      )}
                    </div>

                    {/* Syllabus */}
                    {enr.courses?.syllabus && (
                      <details className="group">
                        <summary className="text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors">
                          📚 Conteúdo programático
                        </summary>
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line pl-4 border-l-2 border-primary/20">
                          {enr.courses.syllabus}
                        </p>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Materials tab */}
          <TabsContent value="materials" className="space-y-4">
            {materials.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum material disponível</p>
                </CardContent>
              </Card>
            ) : (
              materials.map((mat: any) => (
                <Card key={mat.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{mat.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{mat.material_type}</p>
                    </div>
                    {mat.file_url && (
                      <a href={mat.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Download size={14} /> Baixar
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Certificates tab */}
          <TabsContent value="certificates" className="space-y-4">
            {certificates.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Award size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum certificado emitido</p>
                  <p className="text-xs text-muted-foreground mt-1">Certificados serão disponibilizados após a conclusão do curso</p>
                </CardContent>
              </Card>
            ) : (
              certificates.map((cert: any) => {
                const enr = enrollments.find((e: any) => e.id === cert.enrollment_id);
                return (
                  <Card key={cert.id} className="border-primary/20">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                        <Award size={24} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{enr?.courses?.name || "Certificado"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Emitido em {cert.issued_at ? format(new Date(cert.issued_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </p>
                      </div>
                      {cert.certificate_url && (
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1">
                            <Download size={14} /> Download
                          </Button>
                        </a>
                      )}
                      <Badge variant={cert.status === "sent" ? "secondary" : "default"} className="text-[10px]">
                        {cert.status === "issued" ? "Emitido" : cert.status === "sent" ? "Enviado" : "Pendente"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* WhatsApp CTA */}
        {professional?.phone && (
          <Card className="bg-muted/50">
            <CardContent className="p-4 flex items-center gap-3">
              <MessageCircle size={20} className="text-success shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Precisa de ajuda?</p>
                <p className="text-xs text-muted-foreground">Fale diretamente com a instrutora</p>
              </div>
              <a
                href={`https://wa.me/55${professional.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1">
                  <MessageCircle size={14} /> WhatsApp
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentArea;
