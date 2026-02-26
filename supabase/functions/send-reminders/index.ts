import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value || "");
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") || "";
  const EVOLUTION_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

  try {
    const now = new Date();
    const results: Array<{ type: string; bookingId: string; success: boolean; error?: string }> = [];

    // Get bookings needing 24h reminder (between 23-25 hours from now)
    const h24_start = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
    const h24_end = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    // Get bookings needing 3h reminder (between 2.5-3.5 hours from now)
    const h3_start = new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString();
    const h3_end = new Date(now.getTime() + 3.5 * 60 * 60 * 1000).toISOString();

    const { data: bookings24h } = await supabase
      .from("bookings")
      .select("id, professional_id, client_name, client_phone, start_time, service_id, services:service_id(name)")
      .in("status", ["pending", "confirmed"])
      .gte("start_time", h24_start)
      .lte("start_time", h24_end);

    const { data: bookings3h } = await supabase
      .from("bookings")
      .select("id, professional_id, client_name, client_phone, start_time, service_id, services:service_id(name)")
      .in("status", ["pending", "confirmed"])
      .gte("start_time", h3_start)
      .lte("start_time", h3_end);

    const allBookings = [
      ...((bookings24h || []).map(b => ({ ...b, triggerType: "reminder_24h" }))),
      ...((bookings3h || []).map(b => ({ ...b, triggerType: "reminder_3h" }))),
    ];

    // Group by professional to check limits
    const byProfessional: Record<string, typeof allBookings> = {};
    for (const b of allBookings) {
      if (!b.client_phone) continue;
      if (!byProfessional[b.professional_id]) byProfessional[b.professional_id] = [];
      byProfessional[b.professional_id].push(b);
    }

    for (const [profId, bookings] of Object.entries(byProfessional)) {
      // Check if already sent a reminder for these bookings (check logs)
      // Get professional data
      const { data: prof } = await supabase
        .from("professionals")
        .select("id, slug, reminder_message, business_name, name")
        .eq("id", profId)
        .single();

      if (!prof) continue;

      // Get WhatsApp instance
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_name, status")
        .eq("professional_id", profId)
        .single();

      if (!inst || inst.status !== "connected") continue;

      // Get automation config
      const { data: automations } = await supabase
        .from("whatsapp_automations")
        .select("*")
        .eq("professional_id", profId)
        .in("trigger_type", ["reminder_24h", "reminder_3h"])
        .eq("is_active", true);

      const activeAutomations = new Map((automations || []).map(a => [a.trigger_type, a]));

      // Get subscription to check plan
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("professional_id", profId)
        .single();

      const planId = sub?.plan_id || "free";

      // Get plan limits
      const { data: limits } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan_id", planId)
        .single();

      const dailyLimit = limits?.daily_reminders ?? 5;

      // Get today's usage
      const today = now.toISOString().split("T")[0];
      const { data: usage } = await supabase
        .from("daily_message_usage")
        .select("*")
        .eq("professional_id", profId)
        .eq("usage_date", today)
        .maybeSingle();

      let remindersSent = usage?.reminders_sent || 0;

      for (const booking of bookings) {
        // Check daily limit (-1 = unlimited)
        if (dailyLimit !== -1 && remindersSent >= dailyLimit) {
          results.push({ type: booking.triggerType, bookingId: booking.id, success: false, error: "Limite diário atingido" });
          continue;
        }

        const automation = activeAutomations.get(booking.triggerType);
        if (!automation) continue;

        // Check if already sent this reminder
        const { data: existingLog } = await supabase
          .from("whatsapp_logs")
          .select("id")
          .eq("booking_id", booking.id)
          .eq("automation_id", automation.id)
          .limit(1);

        if (existingLog && existingLog.length > 0) continue;

        // Build message
        const startDate = new Date(booking.start_time);
        const dataFormatted = startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const horarioFormatted = startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const serviceName = (booking as any).services?.name || "serviço";

        let messageTemplate = automation.message_template;
        if (prof.reminder_message) {
          messageTemplate = prof.reminder_message;
        }

        const finalMessage = replaceVars(messageTemplate, {
          nome: booking.client_name || "Cliente",
          servico: serviceName,
          data: dataFormatted,
          horario: horarioFormatted,
          link: prof.slug ? `gende.io/${prof.slug}` : "",
        });

        // Send via Evolution API
        const sendRes = await fetch(`${EVOLUTION_URL}/message/sendText/${inst.instance_name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
          body: JSON.stringify({ number: booking.client_phone, text: finalMessage }),
        });
        const sendData = await sendRes.json();

        // Log the message
        await supabase.from("whatsapp_logs").insert({
          professional_id: profId,
          automation_id: automation.id,
          booking_id: booking.id,
          recipient_phone: booking.client_phone,
          message_content: finalMessage,
          status: sendRes.ok ? "sent" : "failed",
          sent_at: sendRes.ok ? new Date().toISOString() : null,
          error_message: sendRes.ok ? null : JSON.stringify(sendData),
        });

        if (sendRes.ok) {
          remindersSent++;
        }

        results.push({ type: booking.triggerType, bookingId: booking.id, success: sendRes.ok });
      }

      // Update daily usage
      await supabase.from("daily_message_usage").upsert({
        professional_id: profId,
        usage_date: today,
        reminders_sent: remindersSent,
      }, { onConflict: "professional_id,usage_date" });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send reminders error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
