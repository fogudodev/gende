import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { professionalId } = await req.json();
    if (!professionalId) throw new Error("professionalId is required");

    // Get the professional to find user_id and check if blocked
    const { data: prof, error: profError } = await supabase
      .from("professionals")
      .select("user_id, is_blocked, name")
      .eq("id", professionalId)
      .single();
    if (profError || !prof) throw new Error("Professional not found");
    if (!prof.is_blocked) throw new Error("Only blocked users can be deleted");

    const userId = prof.user_id;

    // Delete related data in order (respecting foreign keys)
    const tables = [
      "course_attendance", "course_certificates", "course_enrollments", "course_materials",
      "course_waitlist", "course_classes", "courses", "course_categories",
      "challenge_progress", "loyalty_challenges", "client_loyalty", "loyalty_levels", "loyalty_config",
      "cashback_transactions", "client_cashback", "cashback_rules", "client_referrals",
      "client_packages", "service_packages",
      "cash_transactions", "cash_registers",
      "instagram_messages", "instagram_keywords", "instagram_accounts",
      "whatsapp_logs", "whatsapp_conversations", "whatsapp_automations", "whatsapp_instances",
      "campaign_contacts", "campaigns",
      "upsell_events", "upsell_rules",
      "waitlist_offers", "waitlist_entries", "waitlist_settings",
      "employee_services", "employee_working_hours", "commissions",
      "platform_reviews",
      "bookings", "blocked_times", "working_hours", "reviews", "expenses", "products", "coupons",
      "clients", "services", "payments", "payment_config", "daily_message_usage",
      "google_calendar_tokens", "chat_messages", "professional_limits", "addon_purchases",
      "professional_feature_overrides", "salon_employees", "subscriptions",
    ];

    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq("professional_id", professionalId);
      } catch (_) { /* table may not exist */ }
    }

    // Delete user roles
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // Delete the professional record
    await supabase.from("professionals").delete().eq("id", professionalId);

    // Delete the auth user
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
    }

    return new Response(
      JSON.stringify({ success: true, deletedUser: prof.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Admin delete user error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
