import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const userId = claims.claims.sub as string;

    // Get professional
    const { data: professional } = await supabase
      .from("professionals")
      .select("id, account_type")
      .eq("user_id", userId)
      .single();

    if (!professional) {
      return new Response(JSON.stringify({ error: "Professional not found" }), { status: 404, headers: corsHeaders });
    }

    // Check enterprise + salon
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("professional_id", professional.id)
      .single();

    const planId = subscription?.plan_id;
    const isEnterprise = planId === "enterprise" || planId === "prod_U3DrWGOLjl8pSx" || planId === "prod_U3KZFQMZF4cxPs";
    
    if (!isEnterprise || professional.account_type !== "salon") {
      return new Response(JSON.stringify({ error: "Google Calendar is only available for Enterprise salon accounts" }), { status: 403, headers: corsHeaders });
    }

    const { action } = await req.json();

    if (action === "get_auth_url") {
      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
      const scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" ");

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${professional.id}`;

      return new Response(JSON.stringify({ auth_url: authUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await serviceClient.from("google_calendar_tokens").delete().eq("professional_id", professional.id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "status") {
      const serviceClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: tokenData } = await serviceClient
        .from("google_calendar_tokens")
        .select("sync_enabled, last_synced_at, calendar_id, created_at")
        .eq("professional_id", professional.id)
        .single();

      return new Response(JSON.stringify({ connected: !!tokenData, ...(tokenData || {}) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
