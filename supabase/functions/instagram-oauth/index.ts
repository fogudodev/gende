import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = user.id;
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

        if (!code || !redirectUri) {
          return new Response(JSON.stringify({ error: "Código ou redirect_uri inválido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Exchange code for access token
        const tokenRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?` +
            `client_id=${META_APP_ID}` +
            `&client_secret=${META_APP_SECRET}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&code=${code}`
        );

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
          console.error("Token exchange error:", tokenData?.error || tokenData);
          return new Response(
            JSON.stringify({ error: tokenData?.error?.message || "Erro ao trocar código por token" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
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
        if (!longTokenRes.ok && longTokenData?.error) {
          console.warn("Long-lived token warning:", longTokenData.error);
        }

        const longLivedToken = longTokenData.access_token || tokenData.access_token;
        const expiresIn = longTokenData.expires_in || 5184000; // ~60 days

        // Debug: check token permissions
        const debugRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${longLivedToken}`
        );
        const debugData = await debugRes.json();
        console.log("DEBUG /me response:", JSON.stringify(debugData));

        // Check granted permissions
        const permRes = await fetch(
          `https://graph.facebook.com/v21.0/me/permissions?access_token=${longLivedToken}`
        );
        const permData = await permRes.json();
        console.log("DEBUG permissions:", JSON.stringify(permData));

        // Get pages
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedToken}`
        );
        const pagesData = await pagesRes.json();
        console.log("DEBUG /me/accounts response:", JSON.stringify(pagesData));

        if (!pagesRes.ok || pagesData?.error) {
          console.error("Pages fetch error:", pagesData?.error || pagesData);
          return new Response(
            JSON.stringify({ error: pagesData?.error?.message || "Erro ao buscar páginas do Facebook" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const pages = Array.isArray(pagesData.data) ? pagesData.data : [];
        if (pages.length === 0) {
          // Try alternative: check if user has pages via /me/accounts with fields
          const altPagesRes = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`
          );
          const altPagesData = await altPagesRes.json();
          console.log("DEBUG /me/accounts (with fields) response:", JSON.stringify(altPagesData));
          
          const altPages = Array.isArray(altPagesData.data) ? altPagesData.data : [];
          if (altPages.length === 0) {
            return new Response(
              JSON.stringify({
                error:
                  "Nenhuma página do Facebook encontrada. Verifique se: 1) Você é administrador da Página do Facebook, 2) A Página está vinculada ao seu Instagram Profissional/Business, 3) Ao autorizar, selecione todas as páginas na tela de permissões do Facebook.",
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          // Use alt pages if found
          // Process altPages which already have instagram_business_account
          for (const page of altPages) {
            const candidateIgId = page.instagram_business_account?.id;
            if (candidateIgId) {
              // Found it directly
              const igInfoRes2 = await fetch(
                `https://graph.facebook.com/v21.0/${candidateIgId}?fields=username,name&access_token=${page.access_token}`
              );
              const igInfo2 = await igInfoRes2.json();
              
              if (!igInfoRes2.ok || igInfo2?.error) {
                continue;
              }

              const { data: professional2 } = await supabaseAdmin
                .from("professionals")
                .select("id")
                .eq("user_id", userId)
                .single();

              if (!professional2) {
                return new Response(JSON.stringify({ error: "Profissional não encontrado" }), {
                  status: 404,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              const tokenExpiration2 = new Date(Date.now() + expiresIn * 1000).toISOString();
              
              const { error: upsertError2 } = await supabaseAdmin
                .from("instagram_accounts")
                .upsert(
                  {
                    professional_id: professional2.id,
                    instagram_user_id: candidateIgId,
                    username: igInfo2.username || "",
                    account_name: igInfo2.name || "",
                    page_id: page.id,
                    access_token: page.access_token,
                    token_expiration: tokenExpiration2,
                    is_active: true,
                  },
                  { onConflict: "professional_id" }
                );

              if (upsertError2) {
                console.error("Upsert error:", upsertError2);
                return new Response(JSON.stringify({ error: "Erro ao salvar conta" }), {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              return new Response(
                JSON.stringify({
                  success: true,
                  username: igInfo2.username,
                  account_name: igInfo2.name,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
          
          return new Response(
            JSON.stringify({ error: "Nenhuma conta Instagram Business encontrada vinculada às suas páginas do Facebook." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Find a page that actually has an Instagram Business account connected
        let pageWithInstagram: { id: string; access_token: string } | null = null;
        let igAccountId: string | null = null;

        for (const page of pages) {
          const igRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
          );
          const igData = await igRes.json();

          if (!igRes.ok || igData?.error) {
            continue;
          }

          const candidateIgId = igData.instagram_business_account?.id;
          if (candidateIgId) {
            pageWithInstagram = page;
            igAccountId = candidateIgId;
            break;
          }
        }

        if (!pageWithInstagram || !igAccountId) {
          return new Response(
            JSON.stringify({ error: "Nenhuma conta Instagram Business encontrada. Certifique-se de ter uma conta profissional vinculada a uma página do Facebook." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get Instagram user info
        const igInfoRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}?fields=username,name&access_token=${pageWithInstagram.access_token}`
        );
        const igInfo = await igInfoRes.json();

        if (!igInfoRes.ok || igInfo?.error) {
          console.error("Instagram info error:", igInfo?.error || igInfo);
          return new Response(
            JSON.stringify({ error: igInfo?.error?.message || "Erro ao buscar dados da conta do Instagram" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get professional_id
        const { data: professional, error: professionalError } = await supabaseAdmin
          .from("professionals")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (professionalError || !professional) {
          return new Response(JSON.stringify({ error: "Profissional não encontrado para o usuário logado" }), {
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
              page_id: pageWithInstagram.id,
              access_token: pageWithInstagram.access_token,
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
