import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-FINGERPRINT] ${step}${detailsStr}`);
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

    const { fingerprint } = await req.json();
    if (!fingerprint) throw new Error("Fingerprint is required");

    logStep("Checking fingerprint", { fingerprint: fingerprint.substring(0, 10) + "..." });

    // Use the database function to check for abuse
    const { data, error } = await supabaseClient.rpc("check_fingerprint_abuse", {
      p_fingerprint: fingerprint,
    });

    if (error) {
      logStep("Error checking fingerprint", { error: error.message });
      throw new Error(`Database error: ${error.message}`);
    }

    const result = data?.[0] || { is_blocked: false, reason: null };
    
    logStep("Check result", { isBlocked: result.is_blocked, reason: result.reason });

    return new Response(JSON.stringify({ 
      blocked: result.is_blocked, 
      reason: result.reason 
    }), {
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
