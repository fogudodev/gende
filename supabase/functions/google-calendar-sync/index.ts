import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) return null;
  return data;
}

async function getValidToken(supabase: any, tokenRow: any) {
  const now = new Date();
  const expiresAt = new Date(tokenRow.token_expires_at);

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    if (!refreshed) throw new Error("Failed to refresh Google token");

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("google_calendar_tokens")
      .update({ access_token: refreshed.access_token, token_expires_at: newExpiresAt })
      .eq("id", tokenRow.id);

    return refreshed.access_token;
  }

  return tokenRow.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, professional_id, booking, booking_id, event_id } = body;

    // For import_all action (cron), iterate all professionals with tokens
    if (action === "import_all") {
      const { data: allTokens } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("sync_enabled", true);

      if (!allTokens || allTokens.length === 0) {
        return new Response(JSON.stringify({ synced: false, reason: "no_tokens" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let totalImported = 0;

      for (const tokenRow of allTokens) {
        try {
          const accessToken = await getValidToken(supabase, tokenRow);
          const calendarId = tokenRow.calendar_id || "primary";
          const profId = tokenRow.professional_id;

          const now = new Date();
          const timeMin = now.toISOString();
          const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
            `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          const result = await res.json();
          if (!res.ok) continue;

          for (const event of (result.items || [])) {
            if (!event.start?.dateTime || !event.end?.dateTime) continue;
            if (event.summary?.startsWith("📅")) continue;

            const { data: existing } = await supabase
              .from("blocked_times")
              .select("id")
              .eq("professional_id", profId)
              .eq("start_time", event.start.dateTime)
              .eq("end_time", event.end.dateTime)
              .limit(1);

            if (existing && existing.length > 0) continue;

            await supabase.from("blocked_times").insert({
              professional_id: profId,
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              reason: `Google Calendar: ${event.summary || "Evento"}`,
            });

            totalImported++;
          }

          await supabase
            .from("google_calendar_tokens")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", tokenRow.id);
        } catch (err) {
          console.error(`Error syncing for professional ${tokenRow.professional_id}:`, err);
        }
      }

      return new Response(JSON.stringify({ synced: true, imported: totalImported }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single-professional actions below
    const { data: tokenRow } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("professional_id", professional_id)
      .eq("sync_enabled", true)
      .single();

    if (!tokenRow) {
      return new Response(JSON.stringify({ synced: false, reason: "no_token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidToken(supabase, tokenRow);
    const calendarId = tokenRow.calendar_id || "primary";

    if (action === "create_event") {
      const event = {
        summary: `📅 ${booking.service_name || "Agendamento"} - ${booking.client_name || "Cliente"}`,
        description: `Cliente: ${booking.client_name || ""}\nTelefone: ${booking.client_phone || ""}\n${booking.notes || ""}`.trim(),
        start: { dateTime: booking.start_time, timeZone: "America/Sao_Paulo" },
        end: { dateTime: booking.end_time, timeZone: "America/Sao_Paulo" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
      };

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        console.error("Google Calendar create error:", result);
        return new Response(JSON.stringify({ synced: false, error: result.error?.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save the Google Calendar event ID on the booking
      if (booking_id && result.id) {
        await supabase
          .from("bookings")
          .update({ google_calendar_event_id: result.id })
          .eq("id", booking_id);
      }

      await supabase
        .from("google_calendar_tokens")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", tokenRow.id);

      return new Response(JSON.stringify({ synced: true, event_id: result.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_event") {
      if (!event_id) {
        return new Response(JSON.stringify({ synced: false, reason: "no_event_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event_id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!res.ok && res.status !== 404 && res.status !== 410) {
        const errText = await res.text();
        console.error("Google Calendar delete error:", errText);
        return new Response(JSON.stringify({ synced: false, error: errText }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clear the event ID from booking
      if (booking_id) {
        await supabase
          .from("bookings")
          .update({ google_calendar_event_id: null })
          .eq("id", booking_id);
      }

      return new Response(JSON.stringify({ synced: true, deleted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_events") {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const result = await res.json();

      if (!res.ok) {
        console.error("Google Calendar list error:", result);
        return new Response(JSON.stringify({ synced: false, error: result.error?.message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const events = result.items || [];
      let imported = 0;

      for (const event of events) {
        if (!event.start?.dateTime || !event.end?.dateTime) continue;
        if (event.summary?.startsWith("📅")) continue;

        const { data: existing } = await supabase
          .from("blocked_times")
          .select("id")
          .eq("professional_id", professional_id)
          .eq("start_time", event.start.dateTime)
          .eq("end_time", event.end.dateTime)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("blocked_times").insert({
          professional_id,
          start_time: event.start.dateTime,
          end_time: event.end.dateTime,
          reason: `Google Calendar: ${event.summary || "Evento"}`,
        });

        imported++;
      }

      await supabase
        .from("google_calendar_tokens")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", tokenRow.id);

      return new Response(JSON.stringify({ synced: true, imported, total_events: events.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
