import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
      throw new Error(`Database error: ${subError.message}`);
    }

    if (!subscription) {
      logStep("No subscription record found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        trial_active: false,
        trial_ends_at: null,
        subscription_end: null,
        status: "none"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const now = new Date();
    const trialEndsAt = new Date(subscription.trial_ends_at);
    const trialActive = subscription.status === "trial" && trialEndsAt > now;

    // Check Stripe for active subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    let hasActiveSub = false;
    let subscriptionEnd = null;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        hasActiveSub = true;
        subscriptionEnd = new Date(subscriptions.data[0].current_period_end * 1000).toISOString();
        logStep("Active subscription found", { subscriptionEnd });

        // Update database if needed
        if (subscription.status !== "active") {
          await supabaseClient
            .from("user_subscriptions")
            .update({ 
              status: "active", 
              subscription_ends_at: subscriptionEnd,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptions.data[0].id
            })
            .eq("user_id", user.id);
        }
      }
    }

    // If trial expired and no active subscription, update status
    if (!trialActive && !hasActiveSub && subscription.status === "trial") {
      await supabaseClient
        .from("user_subscriptions")
        .update({ status: "expired" })
        .eq("user_id", user.id);
    }

    const response = {
      subscribed: hasActiveSub,
      trial_active: trialActive && !hasActiveSub,
      trial_ends_at: subscription.trial_ends_at,
      subscription_end: subscriptionEnd,
      status: hasActiveSub ? "active" : (trialActive ? "trial" : "expired"),
      days_remaining: trialActive ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
    };

    logStep("Returning subscription status", response);

    return new Response(JSON.stringify(response), {
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
