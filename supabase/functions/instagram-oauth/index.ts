import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);

  // Step 1: Generate OAuth URL
  if (req.method === "POST") {
    try {
      // Authenticate user
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = claims.claims.sub;
      const body = await req.json();
      const action = body.action;

      const META_APP_ID = Deno.env.get("META_APP_ID");
      const META_APP_SECRET = Deno.env.get("META_APP_SECRET");

      if (!META_APP_ID || !META_APP_SECRET) {
        return new Response(
          JSON.stringify({ error: "Meta App não configurado. Configure META_APP_ID e META_APP_SECRET." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "get_auth_url") {
        const redirectUri = body.redirect_uri;
        const scopes = [
          "instagram_basic",
          "instagram_manage_messages",
          "pages_show_list",
          "pages_messaging",
          "pages_read_engagement",
        ].join(",");

        const authUrl =
          `https://www.facebook.com/v21.0/dialog/oauth?` +
          `client_id=${META_APP_ID}` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${scopes}` +
          `&state=${userId}` +
          `&response_type=code`;

        return new Response(JSON.stringify({ auth_url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "exchange_code") {
        const code = body.code;
        const redirectUri = body.redirect_uri;

        // Exchange code for access token
        const tokenRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?` +
            `client_id=${META_APP_ID}` +
            `&client_secret=${META_APP_SECRET}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&code=${code}`
        );

        const tokenData = await tokenRes.json();
        if (tokenData.error) {
          console.error("Token exchange error:", tokenData.error);
          return new Response(JSON.stringify({ error: "Erro ao trocar código por token" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get long-lived token
        const longTokenRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?` +
            `grant_type=fb_exchange_token` +
            `&client_id=${META_APP_ID}` +
            `&client_secret=${META_APP_SECRET}` +
            `&fb_exchange_token=${tokenData.access_token}`
        );

        const longTokenData = await longTokenRes.json();
        const longLivedToken = longTokenData.access_token || tokenData.access_token;
        const expiresIn = longTokenData.expires_in || 5184000; // ~60 days

        // Get pages
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`
        );
        const pagesData = await pagesRes.json();
        const page = pagesData.data?.[0];

        if (!page) {
          return new Response(
            JSON.stringify({ error: "Nenhuma página do Facebook encontrada. Você precisa ter uma página conectada ao Instagram." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get Instagram business account
        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json();
        const igAccountId = igData.instagram_business_account?.id;

        if (!igAccountId) {
          return new Response(
            JSON.stringify({ error: "Nenhuma conta Instagram Business encontrada. Certifique-se de ter uma conta profissional vinculada." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get Instagram user info
        const igInfoRes = await fetch(
          `https://graph.instagram.com/v21.0/${igAccountId}?fields=username,name&access_token=${page.access_token}`
        );
        const igInfo = await igInfoRes.json();

        // Get professional_id
        const { data: professional } = await supabaseAdmin
          .from("professionals")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!professional) {
          return new Response(JSON.stringify({ error: "Profissional não encontrado" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const tokenExpiration = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Upsert Instagram account
        const { error: upsertError } = await supabaseAdmin
          .from("instagram_accounts")
          .upsert(
            {
              professional_id: professional.id,
              instagram_user_id: igAccountId,
              username: igInfo.username || "",
              account_name: igInfo.name || "",
              page_id: page.id,
              access_token: page.access_token,
              token_expiration: tokenExpiration,
              is_active: true,
            },
            { onConflict: "professional_id" }
          );

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          return new Response(JSON.stringify({ error: "Erro ao salvar conta" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            username: igInfo.username,
            account_name: igInfo.name,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "disconnect") {
        const { data: professional } = await supabaseAdmin
          .from("professionals")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (professional) {
          await supabaseAdmin
            .from("instagram_accounts")
            .update({ is_active: false })
            .eq("professional_id", professional.id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("OAuth error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
