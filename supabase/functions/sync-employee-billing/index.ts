import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADDITIONAL_EMPLOYEE_PRICE_ID = "price_1T5EBbFjVGP9lWs0mTpdPlol";
const ADDITIONAL_EMPLOYEE_PRODUCT_ID = "prod_U3KrydRhlXjRr4";
const BASE_EMPLOYEES = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { activeEmployeeCount } = await req.json();
    if (typeof activeEmployeeCount !== "number") throw new Error("activeEmployeeCount is required");

    const extraEmployees = Math.max(0, activeEmployeeCount - BASE_EMPLOYEES);
    console.log(`[SYNC-EMPLOYEES] User ${user.email}, active: ${activeEmployeeCount}, extra: ${extraEmployees}`);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      console.log(`[SYNC-EMPLOYEES] No Stripe customer found for ${user.email}, skipping billing sync`);
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        reason: "No Stripe customer found",
        extra_employees: extraEmployees,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];

    // Find existing additional-employee item
    const existingItem = subscription.items.data.find(
      (item: any) => item.price.product === ADDITIONAL_EMPLOYEE_PRODUCT_ID
    );

    if (extraEmployees > 0) {
      if (existingItem) {
        // Update quantity
        await stripe.subscriptionItems.update(existingItem.id, {
          quantity: extraEmployees,
        });
        console.log(`[SYNC-EMPLOYEES] Updated item ${existingItem.id} to quantity ${extraEmployees}`);
      } else {
        // Add new item
        await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: ADDITIONAL_EMPLOYEE_PRICE_ID,
          quantity: extraEmployees,
        });
        console.log(`[SYNC-EMPLOYEES] Created new item with quantity ${extraEmployees}`);
      }
    } else if (existingItem) {
      // Remove item if no extra employees
      await stripe.subscriptionItems.del(existingItem.id, {
        proration_behavior: "create_prorations",
      });
      console.log(`[SYNC-EMPLOYEES] Removed extra employee item`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extra_employees: extraEmployees,
      additional_cost: extraEmployees * 7,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(`[SYNC-EMPLOYEES] Error: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
