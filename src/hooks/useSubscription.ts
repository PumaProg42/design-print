import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// TRIAL BYPASS - set to true to disable trial restrictions
const BYPASS_TRIAL = true;

export interface SubscriptionStatus {
  subscribed: boolean;
  trial_active: boolean;
  trial_ends_at: string | null;
  subscription_end: string | null;
  status: "trial" | "active" | "expired" | "cancelled" | "none" | "unknown";
  days_remaining: number;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  
  // Guard to prevent multiple subscription checks
  const didCheckRef = useRef(false);
  const isCheckingRef = useRef(false);

  // BYPASS MODE - skip all subscription checks completely
  if (BYPASS_TRIAL) {
    console.log("SUBSCRIPTION BYPASS ACTIVE - skipping all checks");
    return {
      subscribed: true,
      trial_active: false,
      trial_ends_at: null,
      subscription_end: null,
      status: "active" as const,
      days_remaining: 999,
      loading: false,
      error: null,
      canUseApp: true,
      checkSubscription: async () => {},
      createCheckout: async () => {},
      openCustomerPortal: async () => {},
    };
  }

  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    trial_active: false,
    trial_ends_at: null,
    subscription_end: null,
    status: "none",
    days_remaining: 0,
    loading: true,
    error: null,
  });

  // Safe subscription check - NEVER throws, NEVER blocks app
  const checkSubscription = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      console.log("Subscription check already in progress, skipping");
      return;
    }
    
    if (!session?.access_token) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

    isCheckingRef.current = true;

    try {
      setSubscription(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscription({
        subscribed: data.subscribed ?? false,
        trial_active: data.trial_active ?? false,
        trial_ends_at: data.trial_ends_at ?? null,
        subscription_end: data.subscription_end ?? null,
        status: data.status ?? "none",
        days_remaining: data.days_remaining ?? 0,
        loading: false,
        error: null,
      });
      
      didCheckRef.current = true;
    } catch (error) {
      // CRITICAL: Never block app on subscription errors
      console.warn("Subscription check failed (non-blocking):", error);
      setSubscription(prev => ({
        ...prev,
        loading: false,
        status: "unknown",
        error: error instanceof Error ? error.message : "Failed to check subscription",
      }));
      didCheckRef.current = true; // Mark as checked even on failure
    } finally {
      isCheckingRef.current = false;
    }
  }, [session?.access_token]);

  // Check subscription ONCE on auth change - NEVER block app initialization
  useEffect(() => {
    if (user && session && !didCheckRef.current) {
      // Non-blocking subscription check
      checkSubscription().catch((e) => {
        console.warn("Subscription check failed, app continues normally:", e);
      });
    } else if (!user || !session) {
      // Reset state on logout
      didCheckRef.current = false;
      setSubscription({
        subscribed: false,
        trial_active: false,
        trial_ends_at: null,
        subscription_end: null,
        status: "none",
        days_remaining: 0,
        loading: false,
        error: null,
      });
    }
  }, [user, session, checkSubscription]);

  // Periodic refresh every 60 seconds (only if initial check succeeded)
  useEffect(() => {
    if (!user || !session || !didCheckRef.current) return;

    const interval = setInterval(() => {
      checkSubscription().catch((e) => {
        console.warn("Periodic subscription check failed:", e);
      });
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user, session, checkSubscription]);

  const createCheckout = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [session?.access_token]);

  const canUseApp = subscription.subscribed || subscription.trial_active;

  return {
    ...subscription,
    canUseApp,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
