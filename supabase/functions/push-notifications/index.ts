import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Get or generate VAPID keys
async function getVapidKeys(supabaseAdmin: any): Promise<{ publicKey: string; privateKey: string }> {
  // Try to read from store_settings
  const { data: settings } = await supabaseAdmin
    .from("store_settings")
    .select("key, value")
    .in("key", ["vapid_public_key", "vapid_private_key"]);

  const pubSetting = settings?.find((s: any) => s.key === "vapid_public_key");
  const privSetting = settings?.find((s: any) => s.key === "vapid_private_key");

  if (pubSetting && privSetting) {
    return { publicKey: pubSetting.value, privateKey: privSetting.value };
  }

  // Generate new VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();

  // Store them
  await supabaseAdmin.from("store_settings").upsert([
    { key: "vapid_public_key", value: vapidKeys.publicKey },
    { key: "vapid_private_key", value: vapidKeys.privateKey },
  ], { onConflict: "key" });

  return vapidKeys;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { action, ...payload } = await req.json();

    // ACTION: Get VAPID public key (for frontend subscription)
    if (action === "get-vapid-key") {
      const { publicKey } = await getVapidKeys(supabaseAdmin);
      return new Response(JSON.stringify({ publicKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: Save push subscription
    if (action === "subscribe") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { subscription } = payload;
      const keys = subscription.keys;

      await supabaseAdmin.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: "user_id,endpoint" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: Send push notification to a user
    if (action === "send") {
      const { userId, title, body, url } = payload;

      const { publicKey, privateKey } = await getVapidKeys(supabaseAdmin);
      webpush.setVapidDetails("mailto:store@apnidukaan.in", publicKey, privateKey);

      // Get all subscriptions for this user
      const { data: subscriptions } = await supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sent = 0;
      const staleEndpoints: string[] = [];

      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({ title, body, url: url || "/" })
          );
          sent++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            staleEndpoints.push(sub.endpoint);
          }
          console.error("Push failed:", err.message);
        }
      }

      // Clean up stale subscriptions
      if (staleEndpoints.length > 0) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .in("endpoint", staleEndpoints);
      }

      return new Response(JSON.stringify({ sent, total: subscriptions.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
