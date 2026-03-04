import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const { action, ...params } = await req.json();

    switch (action) {
      case "create-campaign": {
        const { professionalId, name, message, clientIds } = params;

        // Get professional's plan
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("professional_id", professionalId)
          .single();

        const planId = sub?.plan_id || "free";

        // Get plan limits
        const { data: limits } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan_id", planId)
          .single();

        if (!limits) throw new Error("Limites do plano não encontrados");

        // Get professional extras
        const { data: profLimits } = await supabase
          .from("professional_limits")
          .select("*")
          .eq("professional_id", professionalId)
          .maybeSingle();

        const extraCampaigns = profLimits?.extra_campaigns_purchased || 0;
        const extraContacts = profLimits?.extra_contacts_purchased || 0;

        // Check daily campaign count
        const today = new Date().toISOString().split("T")[0];
        const { data: usage } = await supabase
          .from("daily_message_usage")
          .select("*")
          .eq("professional_id", professionalId)
          .eq("usage_date", today)
          .maybeSingle();

        const campaignsSent = usage?.campaigns_sent || 0;

        if (limits.daily_campaigns !== -1 && campaignsSent >= limits.daily_campaigns) {
          return new Response(JSON.stringify({
            success: false,
            error: `Limite diário de campanhas atingido (${limits.daily_campaigns} por dia no plano ${planId})`
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Check interval between campaigns
        const { data: lastCampaign } = await supabase
          .from("campaigns")
          .select("started_at")
          .eq("professional_id", professionalId)
          .not("started_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastCampaign?.started_at) {
          const lastTime = new Date(lastCampaign.started_at).getTime();
          const minInterval = (limits.campaign_min_interval_hours || 6) * 60 * 60 * 1000;
          if (Date.now() - lastTime < minInterval) {
            const hoursLeft = ((minInterval - (Date.now() - lastTime)) / (60 * 60 * 1000)).toFixed(1);
            return new Response(JSON.stringify({
              success: false,
              error: `Aguarde ${hoursLeft}h antes de enviar outra campanha (intervalo mínimo: ${limits.campaign_min_interval_hours}h)`
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }

        // Get clients
        let clients;
        if (clientIds && clientIds.length > 0) {
          const { data } = await supabase
            .from("clients")
            .select("id, name, phone")
            .eq("professional_id", professionalId)
            .in("id", clientIds)
            .not("phone", "is", null);
          clients = data;
        } else {
          const { data } = await supabase
            .from("clients")
            .select("id, name, phone")
            .eq("professional_id", professionalId)
            .not("phone", "is", null)
            .not("phone", "eq", "");
          clients = data;
        }

        if (!clients || clients.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "Nenhum cliente com telefone encontrado" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Enforce contact limit
        const maxContacts = limits.campaign_max_contacts;
        if (maxContacts !== -1 && clients.length > maxContacts) {
          clients = clients.slice(0, maxContacts);
        }

        // Create campaign
        const { data: campaign, error: campError } = await supabase
          .from("campaigns")
          .insert({
            professional_id: professionalId,
            name,
            message,
            status: "sending",
            target_type: clientIds?.length ? "selected" : "all_clients",
            total_contacts: clients.length,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (campError) throw campError;

        // Insert contacts
        const contacts = clients.map(c => ({
          campaign_id: campaign.id,
          client_id: c.id,
          phone: c.phone,
          client_name: c.name,
          status: "pending",
        }));

        await supabase.from("campaign_contacts").insert(contacts);

        // Get WhatsApp instance
        const { data: inst } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status")
          .eq("professional_id", professionalId)
          .single();

        if (!inst || inst.status !== "connected") {
          await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
          return new Response(JSON.stringify({ success: false, error: "WhatsApp não conectado" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Get professional info for variables
        const { data: prof } = await supabase
          .from("professionals")
          .select("slug, name, business_name")
          .eq("id", professionalId)
          .single();

        // Send messages
        let sentCount = 0;
        let failedCount = 0;

        for (const contact of contacts) {
          const finalMessage = replaceVars(message, {
            nome: contact.client_name || "Cliente",
            link: prof?.slug ? `https://gende.io/${prof.slug}` : "",
            negocio: prof?.business_name || prof?.name || "",
          });

          try {
            const sendRes = await fetch(`${EVOLUTION_URL}/message/sendText/${inst.instance_name}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
              body: JSON.stringify({ number: contact.phone, text: finalMessage }),
            });

            if (sendRes.ok) {
              sentCount++;
              await supabase.from("campaign_contacts")
                .update({ status: "sent", sent_at: new Date().toISOString() })
                .eq("campaign_id", campaign.id)
                .eq("phone", contact.phone);
            } else {
              failedCount++;
              const errData = await sendRes.json();
              await supabase.from("campaign_contacts")
                .update({ status: "failed", error_message: JSON.stringify(errData) })
                .eq("campaign_id", campaign.id)
                .eq("phone", contact.phone);
            }
          } catch (e) {
            failedCount++;
            await supabase.from("campaign_contacts")
              .update({ status: "failed", error_message: e.message })
              .eq("campaign_id", campaign.id)
              .eq("phone", contact.phone);
          }

          // Small delay between messages to avoid rate limiting
          await new Promise(r => setTimeout(r, 1000));
        }

        // Update campaign
        await supabase.from("campaigns").update({
          status: "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        }).eq("id", campaign.id);

        // Update daily usage
        await supabase.from("daily_message_usage").upsert({
          professional_id: professionalId,
          usage_date: today,
          campaigns_sent: campaignsSent + 1,
          reminders_sent: usage?.reminders_sent || 0,
        }, { onConflict: "professional_id,usage_date" });

        return new Response(JSON.stringify({
          success: true,
          campaignId: campaign.id,
          sent: sentCount,
          failed: failedCount,
          total: clients.length,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get-limits": {
        const { professionalId } = params;

        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("professional_id", professionalId)
          .single();

        const planId = sub?.plan_id || "free";

        const { data: limits } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan_id", planId)
          .single();

        const today = new Date().toISOString().split("T")[0];
        const { data: usage } = await supabase
          .from("daily_message_usage")
          .select("*")
          .eq("professional_id", professionalId)
          .eq("usage_date", today)
          .maybeSingle();

        return new Response(JSON.stringify({
          planId,
          limits: limits || { daily_reminders: 5, daily_campaigns: 0, campaign_max_contacts: 0, campaign_min_interval_hours: 6 },
          usage: { reminders_sent: usage?.reminders_sent || 0, campaigns_sent: usage?.campaigns_sent || 0 },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Campaign error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
