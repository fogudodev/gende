import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const professionalId = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHtml("Erro", "Autorização negada pelo Google."), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !professionalId) {
      return new Response(renderHtml("Erro", "Parâmetros inválidos."), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error("Token exchange failed:", tokenData);
      return new Response(renderHtml("Erro", "Falha ao obter tokens do Google. Tente novamente."), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Save tokens using service role
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        professional_id: professionalId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        calendar_id: "primary",
        sync_enabled: true,
      }, { onConflict: "professional_id" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(renderHtml("Erro", "Falha ao salvar credenciais."), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(renderHtml("Sucesso!", "Google Calendar conectado com sucesso! Você pode fechar esta janela."), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(renderHtml("Erro", "Erro interno. Tente novamente."), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHtml(title: string, message: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#09090B;color:#FAFAFA;}
.card{text-align:center;padding:2rem;border-radius:1rem;background:#1a1a2e;max-width:400px;}
h1{font-size:1.5rem;margin-bottom:0.5rem;}p{color:#888;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div>
<script>setTimeout(()=>window.close(),3000)</script></body></html>`;
}
