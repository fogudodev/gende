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

        // Save instance to DB
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

        // Update status in DB
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

      case "notify-commission": {
        const { professionalId, employeeId, commissionAmount, bookingAmount, percentage } = params;

        // Get employee phone
        const { data: employee } = await supabase
          .from("salon_employees")
          .select("name, phone")
          .eq("id", employeeId)
          .single();

        if (!employee?.phone) {
          result = { success: false, error: "Funcionário sem telefone cadastrado" };
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

        const msg = `💰 *Nova comissão pendente!*\n\nOlá ${employee.name}! Você tem uma nova comissão:\n\n💇 Valor do serviço: R$ ${Number(bookingAmount).toFixed(2)}\n📊 Percentual: ${percentage}%\n💵 Sua comissão: *R$ ${Number(commissionAmount).toFixed(2)}*\n\nAguarde o repasse pelo gestor. 😊`;

        const sendRes = await fetch(`${EVOLUTION_URL()}/message/sendText/${inst.instance_name}`, {
          method: "POST",
          headers: getEvolutionHeaders(),
          body: JSON.stringify({ number: employee.phone, text: msg }),
        });
        const sendData = await sendRes.json();

        // Log the message
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

      case "webhook": {
        // Handle incoming WhatsApp messages
        const { data: webhookData } = params;
        if (webhookData?.event === "messages.upsert") {
          const message = webhookData.data;
          const text = message?.message?.conversation?.toUpperCase()?.trim();
          const phone = message?.key?.remoteJid?.replace("@s.whatsapp.net", "");

          if (text && phone) {
            // Find booking by phone
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
