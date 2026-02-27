import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { messages } = await req.json();

    // Fetch professional data
    const { data: professional } = await supabase
      .from("professionals")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!professional) throw new Error("Professional not found");
    const pid = professional.id;

    // Fetch all business data in parallel
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: bookings },
      { data: clients },
      { data: services },
      { data: employees },
      { data: expenses },
      { data: commissions },
      { data: reviews },
      { data: products },
      { data: subscription },
    ] = await Promise.all([
      supabase.from("bookings").select("*").eq("professional_id", pid).gte("start_time", last30d).order("start_time", { ascending: false }),
      supabase.from("clients").select("*").eq("professional_id", pid),
      supabase.from("services").select("*").eq("professional_id", pid),
      supabase.from("salon_employees").select("*").eq("salon_id", pid),
      supabase.from("expenses").select("*").eq("professional_id", pid).gte("expense_date", startOfMonth.slice(0, 10)),
      supabase.from("commissions").select("*").eq("professional_id", pid).gte("created_at", last30d),
      supabase.from("reviews").select("*").eq("professional_id", pid).order("created_at", { ascending: false }).limit(50),
      supabase.from("products").select("*").eq("professional_id", pid),
      supabase.from("subscriptions").select("*").eq("professional_id", pid).single(),
    ]);

    // Compute key metrics
    const completedBookings = (bookings || []).filter((b: any) => b.status === "completed");
    const cancelledBookings = (bookings || []).filter((b: any) => b.status === "cancelled");
    const noShowBookings = (bookings || []).filter((b: any) => b.status === "no_show");
    const pendingBookings = (bookings || []).filter((b: any) => b.status === "pending");
    const totalRevenue = completedBookings.reduce((sum: number, b: any) => sum + Number(b.price), 0);
    const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const avgTicket = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;
    const avgRating = (reviews || []).length > 0
      ? (reviews || []).reduce((sum: number, r: any) => sum + r.rating, 0) / reviews!.length
      : 0;

    // Service popularity
    const serviceCount: Record<string, number> = {};
    completedBookings.forEach((b: any) => {
      if (b.service_id) serviceCount[b.service_id] = (serviceCount[b.service_id] || 0) + 1;
    });
    const servicePopularity = Object.entries(serviceCount)
      .map(([sid, count]) => {
        const svc = (services || []).find((s: any) => s.id === sid);
        return { name: svc?.name || sid, count, revenue: count * Number(svc?.price || 0) };
      })
      .sort((a, b) => b.count - a.count);

    // Employee performance
    const employeePerformance = (employees || []).map((emp: any) => {
      const empBookings = completedBookings.filter((b: any) => b.employee_id === emp.id);
      const empRevenue = empBookings.reduce((s: number, b: any) => s + Number(b.price), 0);
      const empCommissions = (commissions || []).filter((c: any) => c.employee_id === emp.id);
      const totalCommission = empCommissions.reduce((s: number, c: any) => s + Number(c.commission_amount), 0);
      return {
        name: emp.name,
        bookings: empBookings.length,
        revenue: empRevenue,
        commissionTotal: totalCommission,
        commissionPct: emp.commission_percentage,
      };
    });

    // Client insights
    const clientBookingCount: Record<string, number> = {};
    (bookings || []).forEach((b: any) => {
      if (b.client_id) clientBookingCount[b.client_id] = (clientBookingCount[b.client_id] || 0) + 1;
    });
    const topClients = Object.entries(clientBookingCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cid, count]) => {
        const c = (clients || []).find((cl: any) => cl.id === cid);
        return { name: c?.name || "Desconhecido", visits: count };
      });

    const businessContext = `
## DADOS DO NEGÓCIO - ${professional.business_name || professional.name}
Tipo: ${professional.account_type === "salon" ? "Salão" : "Autônomo"}
Plano: ${subscription?.plan_id || "Nenhum"}

### MÉTRICAS FINANCEIRAS (últimos 30 dias)
- Faturamento total: R$ ${totalRevenue.toFixed(2)}
- Despesas do mês: R$ ${totalExpenses.toFixed(2)}
- Lucro estimado: R$ ${(totalRevenue - totalExpenses).toFixed(2)}
- Ticket médio: R$ ${avgTicket.toFixed(2)}

### AGENDAMENTOS (últimos 30 dias)
- Total: ${(bookings || []).length}
- Concluídos: ${completedBookings.length}
- Cancelados: ${cancelledBookings.length}
- No-show: ${noShowBookings.length}
- Pendentes: ${pendingBookings.length}
- Taxa de conclusão: ${(bookings || []).length > 0 ? ((completedBookings.length / (bookings || []).length) * 100).toFixed(1) : 0}%
- Taxa de cancelamento: ${(bookings || []).length > 0 ? ((cancelledBookings.length / (bookings || []).length) * 100).toFixed(1) : 0}%

### SERVIÇOS MAIS POPULARES
${servicePopularity.slice(0, 10).map((s, i) => `${i + 1}. ${s.name}: ${s.count} agendamentos (R$ ${s.revenue.toFixed(2)})`).join("\n")}

### CLIENTES
- Total cadastrados: ${(clients || []).length}
- Top clientes por visitas: ${topClients.map(c => `${c.name} (${c.visits}x)`).join(", ") || "Nenhum"}

### EQUIPE (${(employees || []).length} membros)
${employeePerformance.map(e => `- ${e.name}: ${e.bookings} atendimentos, R$ ${e.revenue.toFixed(2)} faturamento, R$ ${e.commissionTotal.toFixed(2)} comissões (${e.commissionPct}%)`).join("\n") || "Sem equipe cadastrada"}

### AVALIAÇÕES
- Média: ${avgRating.toFixed(1)}/5 (${(reviews || []).length} avaliações)

### PRODUTOS
- Total: ${(products || []).length} produtos cadastrados
- Ativos: ${(products || []).filter((p: any) => p.is_active).length}
- Valor total em estoque: R$ ${(products || []).reduce((s: number, p: any) => s + (p.stock_quantity * p.price), 0).toFixed(2)}
`;

    const systemPrompt = `Você é o Assistente IA do Gende, um consultor de negócios especializado em salões de beleza e profissionais autônomos da área de beleza e estética. 

Seu papel é:
1. Analisar dados do negócio e fornecer insights acionáveis
2. Identificar oportunidades de crescimento e pontos de melhoria
3. Sugerir estratégias de marketing, retenção e upselling
4. Ajudar com análise financeira (margem, ROI, projeções)
5. Orientar sobre gestão de equipe e comissões
6. Dar recomendações baseadas em dados reais do negócio

Regras:
- Sempre responda em português brasileiro
- Seja direto e prático nas recomendações
- Use os dados fornecidos para embasar suas análises
- Quando não tiver dados suficientes, indique o que o dono deveria acompanhar
- Use emojis moderadamente para tornar a leitura agradável
- Formate com markdown (negrito, listas, headers) para clareza
- Nunca invente dados - use apenas o que foi fornecido

${businessContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("salon-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
