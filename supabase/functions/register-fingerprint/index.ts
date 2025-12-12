import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REGISTER-FINGERPRINT] ${step}${detailsStr}`);
};

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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { fingerprint, userAgent } = await req.json();
    if (!fingerprint) throw new Error("Fingerprint is required");

    logStep("Registering fingerprint", { userId: user.id, fingerprint: fingerprint.substring(0, 10) + "..." });

    // Get client IP from headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    // Try to insert fingerprint (will fail if already exists due to unique constraint)
    const { error: insertError } = await supabaseClient
      .from("device_fingerprints")
      .insert({
        user_id: user.id,
        fingerprint,
        ip_address: ip,
        user_agent: userAgent || null,
      });

    if (insertError) {
      // If fingerprint already exists, that's ok - it means this device is already registered
      if (insertError.code === "23505") {
        logStep("Fingerprint already registered", { fingerprint: fingerprint.substring(0, 10) + "..." });
      } else {
        throw new Error(`Failed to register fingerprint: ${insertError.message}`);
      }
    } else {
      logStep("Fingerprint registered successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
