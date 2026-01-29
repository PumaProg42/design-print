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

  // Always define state (hooks must be called unconditionally)
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: BYPASS_TRIAL,
    trial_active: false,
    trial_ends_at: null,
    subscription_end: null,
    status: BYPASS_TRIAL ? "active" : "none",
    days_remaining: BYPASS_TRIAL ? 999 : 0,
    loading: false,
    error: null,
  });

  // Safe subscription check - NEVER throws, NEVER blocks app
  // Only runs if BYPASS_TRIAL is false
  const checkSubscription = useCallback(async () => {
    // Skip all checks in bypass mode
    if (BYPASS_TRIAL) {
      console.log("SUBSCRIPTION BYPASS ACTIVE - skipping check");
      return;
    }

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
      didCheckRef.current = true; // Mark as checked even on failure - no retries
    } finally {
      isCheckingRef.current = false;
    }
  }, [session?.access_token]);

  // Check subscription ONCE on auth change - NEVER block app initialization
  // Skip entirely if BYPASS_TRIAL is true
  useEffect(() => {
    if (BYPASS_TRIAL) return; // Skip in bypass mode
    
    if (user && session && !didCheckRef.current) {
      // Non-blocking subscription check - runs only once
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

  // NO periodic refresh - subscription checks only happen once
  // Removed the setInterval to prevent any spam loops

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

  // In bypass mode, always allow app usage
  const canUseApp = BYPASS_TRIAL || subscription.subscribed || subscription.trial_active;

  return {
    ...subscription,
    canUseApp,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
