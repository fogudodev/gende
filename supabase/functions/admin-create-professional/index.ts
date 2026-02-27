import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    // Check admin role
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { name, email, phone, password, accountType, businessName, role } = await req.json();

    if (!name || !email || !password) {
      throw new Error("Campos obrigatórios: name, email, password");
    }

    const isSupport = role === "support";

    // Create auth user with metadata
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        account_type: isSupport ? "autonomous" : (accountType || "autonomous"),
        business_name: isSupport ? "" : (businessName || ""),
      },
    });

    if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);

    // If creating a support user, add support role
    if (isSupport) {
      await supabase
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "support" });
    }

    // Update phone on professional record
    if (phone) {
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", newUser.user.id)
        .single();

      if (prof) {
        await supabase
          .from("professionals")
          .update({ phone })
          .eq("id", prof.id);
      }
    }

    // Send WhatsApp with credentials if phone provided
    let whatsappSent = false;
    if (phone) {
      try {
        // Find any admin's connected WhatsApp instance to send from
        const { data: instances } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status, professional_id")
          .eq("status", "connected")
          .limit(1);

        if (instances && instances.length > 0) {
          const inst = instances[0];
          const evolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "";
          const evolutionKey = Deno.env.get("EVOLUTION_API_KEY") || "";

          const displayName = businessName || name;
          const msg = `🎉 *Bem-vindo(a) ao Gende!*\n\nOlá ${name}! Sua conta foi criada com sucesso.\n\n📧 *Email:* ${email}\n🔑 *Senha:* ${password}\n\n🔗 Acesse: https://gende.io\n\nAltere sua senha após o primeiro acesso.\n\nQualquer dúvida, estamos à disposição! 😊`;

          const sendRes = await fetch(`${evolutionUrl}/message/sendText/${inst.instance_name}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionKey,
            },
            body: JSON.stringify({ number: phone, text: msg }),
          });

          whatsappSent = sendRes.ok;

          // Log the message
          await supabase.from("whatsapp_logs").insert({
            professional_id: inst.professional_id,
            recipient_phone: phone,
            message_content: msg,
            status: sendRes.ok ? "sent" : "failed",
            sent_at: sendRes.ok ? new Date().toISOString() : null,
            error_message: sendRes.ok ? null : "Falha ao enviar credenciais",
          });
        }
      } catch (whatsappError) {
        console.error("WhatsApp send error:", whatsappError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        whatsappSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Admin create professional error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
