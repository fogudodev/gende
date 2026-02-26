import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getEvolutionHeaders = () => ({
  "Content-Type": "application/json",
  apikey: Deno.env.get("EVOLUTION_API_KEY") || "",
});

const EVOLUTION_URL = () => Deno.env.get("EVOLUTION_API_URL") || "";

/**
 * Replace template variables in a message string.
 * Supported: {nome}, {servico}, {data}, {horario}, {link}
 */
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

  try {
    const { action, ...params } = await req.json();

    // Auth check for non-webhook actions
    if (action !== "webhook") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header");
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (error || !userData.user) throw new Error("Unauthorized");
    }

    let result;

    switch (action) {
      case "create-instance": {
        const { instanceName, professionalId } = params;
        const res = await fetch(`${EVOLUTION_URL()}/instance/create`, {
          method: "POST",
          headers: getEvolutionHeaders(),
          body: JSON.stringify({
            instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });
        const data = await res.json();

        await supabase.from("whatsapp_instances").upsert({
          professional_id: professionalId,
          instance_name: instanceName,
          instance_id: data.instance?.instanceName || instanceName,
          status: "connecting",
          qr_code: data.qrcode?.base64 || "",
        }, { onConflict: "professional_id" });

        result = data;
        break;
      }

      case "get-qrcode": {
        const { instanceName } = params;
        const res = await fetch(`${EVOLUTION_URL()}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: getEvolutionHeaders(),
        });
        result = await res.json();
        break;
      }

      case "check-status": {
        const { instanceName } = params;
        const res = await fetch(`${EVOLUTION_URL()}/instance/connectionState/${instanceName}`, {
          method: "GET",
          headers: getEvolutionHeaders(),
        });
        const data = await res.json();

        if (params.professionalId) {
          const status = data.instance?.state === "open" ? "connected" : "disconnected";
          await supabase.from("whatsapp_instances")
            .update({ status })
            .eq("professional_id", params.professionalId);
        }

        result = data;
        break;
      }

      case "send-message": {
        const { instanceName, phone, message } = params;
        const res = await fetch(`${EVOLUTION_URL()}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: getEvolutionHeaders(),
          body: JSON.stringify({
            number: phone,
            text: message,
          }),
        });
        result = await res.json();
        break;
      }

      case "trigger-automation": {
        const { professionalId, bookingId, triggerType } = params;

        // Get professional with custom messages
        const { data: prof } = await supabase
          .from("professionals")
          .select("id, slug, welcome_message, reminder_message, confirmation_message, business_name, name")
          .eq("id", professionalId)
          .single();

        if (!prof) {
          result = { success: false, error: "Profissional não encontrado" };
          break;
        }

        // Get WhatsApp instance
        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status")
          .eq("professional_id", professionalId)
          .single();

        if (!inst || inst.status !== "connected") {
          result = { success: false, error: "WhatsApp não conectado" };
          break;
        }

        // Get automation config
        const { data: automation } = await supabase
          .from("whatsapp_automations")
          .select("*")
          .eq("professional_id", professionalId)
          .eq("trigger_type", triggerType)
          .eq("is_active", true)
          .maybeSingle();

        if (!automation) {
          result = { success: false, error: "Automação não ativa ou não encontrada" };
          break;
        }

        // Get booking details
        const { data: booking } = await supabase
          .from("bookings")
          .select("*, services:service_id(name)")
          .eq("id", bookingId)
          .single();

        if (!booking) {
          result = { success: false, error: "Agendamento não encontrado" };
          break;
        }

        const phone = booking.client_phone;
        if (!phone) {
          result = { success: false, error: "Cliente sem telefone" };
          break;
        }

        // Build the link
        const slug = prof.slug || "";
        const bookingLink = slug ? `gende.io/${slug}` : "";

        // Format date/time
        const startDate = new Date(booking.start_time);
        const dataFormatted = startDate.toLocaleDateString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric"
        });
        const horarioFormatted = startDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit", minute: "2-digit"
        });

        const serviceName = (booking as any).services?.name || "serviço";

        const templateVars: Record<string, string> = {
          nome: booking.client_name || "Cliente",
          servico: serviceName,
          data: dataFormatted,
          horario: horarioFormatted,
          link: bookingLink,
        };

        // Choose the right template based on trigger type
        let messageTemplate = automation.message_template;

        // Override with professional's custom messages if available
        if (triggerType === "booking_created" && prof.confirmation_message) {
          messageTemplate = prof.confirmation_message;
          // Append slug link
          if (bookingLink) {
            messageTemplate += `\n\n📅 Agende novamente: ${bookingLink}`;
          }
        } else if ((triggerType === "reminder_24h" || triggerType === "reminder_3h") && prof.reminder_message) {
          messageTemplate = prof.reminder_message;
        } else if (triggerType === "post_service" && prof.welcome_message) {
          // welcome_message is used as a greeting/thank you for post-service
          messageTemplate = prof.welcome_message;
          if (bookingLink) {
            messageTemplate += `\n\n📅 Agende novamente: ${bookingLink}`;
          }
        } else if (triggerType === "reactivation_30d") {
          // Use welcome_message with link for reactivation
          if (prof.welcome_message) {
            messageTemplate = prof.welcome_message;
          }
          if (bookingLink) {
            messageTemplate += `\n\n✨ Sentimos sua falta! Agende pelo link: ${bookingLink}`;
          }
        }

        const finalMessage = replaceVars(messageTemplate, templateVars);

        // Send the message
        const sendRes = await fetch(`${EVOLUTION_URL()}/message/sendText/${inst.instance_name}`, {
          method: "POST",
          headers: getEvolutionHeaders(),
          body: JSON.stringify({ number: phone, text: finalMessage }),
        });
        const sendData = await sendRes.json();

        // Log the message
        await supabase.from("whatsapp_logs").insert({
          professional_id: professionalId,
          automation_id: automation.id,
          booking_id: bookingId,
          recipient_phone: phone,
          message_content: finalMessage,
          status: sendRes.ok ? "sent" : "failed",
          sent_at: sendRes.ok ? new Date().toISOString() : null,
          error_message: sendRes.ok ? null : JSON.stringify(sendData),
        });

        result = { success: sendRes.ok, data: sendData };
        break;
      }

      case "notify-commission": {
        const { professionalId, employeeId, commissionAmount, bookingAmount, percentage } = params;

        const { data: employee } = await supabase
          .from("salon_employees")
          .select("name, phone")
          .eq("id", employeeId)
          .single();

        if (!employee?.phone) {
          result = { success: false, error: "Funcionário sem telefone cadastrado" };
          break;
        }

        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status")
          .eq("professional_id", professionalId)
          .single();

        if (!inst || inst.status !== "connected") {
          result = { success: false, error: "WhatsApp não conectado" };
          break;
        }

        const msg = `💰 *Nova comissão pendente!*\n\nOlá ${employee.name}! Você tem uma nova comissão:\n\n💇 Valor do serviço: R$ ${Number(bookingAmount).toFixed(2)}\n📊 Percentual: ${percentage}%\n💵 Sua comissão: *R$ ${Number(commissionAmount).toFixed(2)}*\n\nAguarde o repasse pelo gestor. 😊`;

        const sendRes = await fetch(`${EVOLUTION_URL()}/message/sendText/${inst.instance_name}`, {
          method: "POST",
          headers: getEvolutionHeaders(),
          body: JSON.stringify({ number: employee.phone, text: msg }),
        });
        const sendData = await sendRes.json();

        await supabase.from("whatsapp_logs").insert({
          professional_id: professionalId,
          recipient_phone: employee.phone,
          message_content: msg,
          status: sendRes.ok ? "sent" : "failed",
          sent_at: sendRes.ok ? new Date().toISOString() : null,
          error_message: sendRes.ok ? null : JSON.stringify(sendData),
        });

        result = { success: sendRes.ok, data: sendData };
        break;
      }

      case "notify-commission-paid": {
        const { professionalId, employeeIds, totalAmount } = params;

        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status")
          .eq("professional_id", professionalId)
          .single();

        if (!inst || inst.status !== "connected") {
          result = { success: false, error: "WhatsApp não conectado" };
          break;
        }

        const results: Array<{ employeeId: string; success: boolean }> = [];

        for (const empId of employeeIds) {
          const { data: employee } = await supabase
            .from("salon_employees")
            .select("name, phone")
            .eq("id", empId)
            .single();

          if (!employee?.phone) {
            results.push({ employeeId: empId, success: false });
            continue;
          }

          const msg = `✅ *Comissão paga!*\n\nOlá ${employee.name}! Suas comissões foram pagas.\n\n💵 Valor total: *R$ ${Number(totalAmount).toFixed(2)}*\n\nObrigado pelo excelente trabalho! 🎉`;

          const sendRes = await fetch(`${EVOLUTION_URL()}/message/sendText/${inst.instance_name}`, {
            method: "POST",
            headers: getEvolutionHeaders(),
            body: JSON.stringify({ number: employee.phone, text: msg }),
          });
          const sendData = await sendRes.json();

          await supabase.from("whatsapp_logs").insert({
            professional_id: professionalId,
            recipient_phone: employee.phone,
            message_content: msg,
            status: sendRes.ok ? "sent" : "failed",
            sent_at: sendRes.ok ? new Date().toISOString() : null,
            error_message: sendRes.ok ? null : JSON.stringify(sendData),
          });

          results.push({ employeeId: empId, success: sendRes.ok });
        }

        result = { success: true, results };
        break;
      }

      case "webhook": {
        const { data: webhookData } = params;
        if (webhookData?.event === "messages.upsert") {
          const message = webhookData.data;
          const text = message?.message?.conversation?.toUpperCase()?.trim();
          const phone = message?.key?.remoteJid?.replace("@s.whatsapp.net", "");

          if (text && phone) {
            const { data: bookings } = await supabase
              .from("bookings")
              .select("id, status, professional_id")
              .eq("client_phone", phone)
              .eq("status", "pending")
              .order("start_time", { ascending: true })
              .limit(1);

            if (bookings && bookings.length > 0) {
              const booking = bookings[0];
              if (text === "CONFIRMAR" || text === "1") {
                await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
              } else if (text === "CANCELAR" || text === "2") {
                await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
              }
            }
          }
        }
        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("WhatsApp function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
