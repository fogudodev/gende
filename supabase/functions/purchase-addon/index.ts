import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Addon packages configuration
const ADDON_PACKAGES: Record<string, { type: "reminders" | "campaigns" | "contacts"; quantity: number; priceId: string }> = {
  "price_1T7H4vFjVGP9lWs0BKNJX8I3": { type: "reminders", quantity: 10, priceId: "price_1T7H4vFjVGP9lWs0BKNJX8I3" },
  "price_1T7H6MFjVGP9lWs0Wcq9WHwV": { type: "reminders", quantity: 25, priceId: "price_1T7H6MFjVGP9lWs0Wcq9WHwV" },
  "price_1T7H8fFjVGP9lWs0zrDZP5GZ": { type: "reminders", quantity: 50, priceId: "price_1T7H8fFjVGP9lWs0zrDZP5GZ" },
  "price_1T7H9mFjVGP9lWs0hzVB3sCh": { type: "campaigns", quantity: 5, priceId: "price_1T7H9mFjVGP9lWs0hzVB3sCh" },
  "price_1T7HAuFjVGP9lWs09jVeY1Vy": { type: "campaigns", quantity: 15, priceId: "price_1T7HAuFjVGP9lWs09jVeY1Vy" },
  "price_1T7HBAFjVGP9lWs04LhAdYG3": { type: "campaigns", quantity: 30, priceId: "price_1T7HBAFjVGP9lWs04LhAdYG3" },
  "price_1T7HCrFjVGP9lWs01wIiaQQR": { type: "contacts", quantity: 20, priceId: "price_1T7HCrFjVGP9lWs01wIiaQQR" },
  "price_1T7HE0FjVGP9lWs0rFMVyMZx": { type: "contacts", quantity: 50, priceId: "price_1T7HE0FjVGP9lWs0rFMVyMZx" },
  "price_1T7HEGFjVGP9lWs0GkXJXdHA": { type: "contacts", quantity: 100, priceId: "price_1T7HEGFjVGP9lWs0GkXJXdHA" },
};

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const { action, ...params } = await req.json();

    if (action === "create-checkout") {
      const { priceId, professionalId } = params;
      const addon = ADDON_PACKAGES[priceId];
      if (!addon) throw new Error("Pacote inválido");

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      // Find or create Stripe customer
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      let customerId: string | undefined;
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }

      const origin = req.headers.get("origin") || "https://gende.io";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/campaigns?addon_success=true&type=${addon.type}&qty=${addon.quantity}`,
        cancel_url: `${origin}/campaigns`,
        metadata: {
          professional_id: professionalId,
          addon_type: addon.type,
          addon_quantity: String(addon.quantity),
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify-payment") {
      const { sessionId, professionalId } = params;

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return new Response(JSON.stringify({ success: false, error: "Pagamento não confirmado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const addonType = session.metadata?.addon_type;
      const addonQuantity = parseInt(session.metadata?.addon_quantity || "0");
      const metaProfId = session.metadata?.professional_id;

      if (!addonType || !addonQuantity || metaProfId !== professionalId) {
        throw new Error("Metadata inválida");
      }

      // Credit the extras
      const columnMap: Record<string, string> = {
        reminders: "extra_reminders_purchased",
        campaigns: "extra_campaigns_purchased",
        contacts: "extra_contacts_purchased",
      };
      const column = columnMap[addonType];

      // Get current value
      const { data: currentLimits } = await supabase
        .from("professional_limits")
        .select("*")
        .eq("professional_id", professionalId)
        .maybeSingle();

      if (currentLimits) {
        const currentValue = (currentLimits as any)[column] || 0;
        await supabase
          .from("professional_limits")
          .update({ [column]: currentValue + addonQuantity })
          .eq("professional_id", professionalId);
      } else {
        await supabase
          .from("professional_limits")
          .insert({
            professional_id: professionalId,
            [column]: addonQuantity,
          });
      }

      return new Response(JSON.stringify({ success: true, type: addonType, quantity: addonQuantity }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Purchase addon error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
