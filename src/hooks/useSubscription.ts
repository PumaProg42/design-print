import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// TRIAL BYPASS - set to true to disable trial restrictions
const BYPASS_TRIAL = true;

const isQzConnecting = (): boolean => {
  // During QZ trust handshake, we must avoid any non-essential state changes
  // that could cause re-renders/remounts.
  return typeof window !== "undefined" && (window as any).__QZ_CONNECTING__ === true;
};

/**
 * IMPORTANT: This module can be consumed by multiple components at once
 * (Index, SubscriptionBanner, TrialCountdown, Subscription page, etc.).
 *
 * If each hook instance calls the backend independently, the app can spam
 * `check-subscription` and cause UI instability during sensitive flows
 * (like QZ trust handshake).
 *
 * So we make the backend call a SINGLETON per access token.
 * - At most ONE request per token per page load
 * - No retries on error
 */
let singletonToken: string | null = null;
let singletonCheckedToken: string | null = null;
let singletonInFlight: Promise<Omit<SubscriptionStatus, "loading">> | null = null;
let singletonCached: Omit<SubscriptionStatus, "loading"> | null = null;

// Extra hard guard: once we attempt a backend check, do not attempt again in this page load.
// This prevents any retry/re-render loops when the backend returns 500.
let pageLoadCheckAttempted = false;

// Interface must be defined before functions that use it in their signatures
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

const toNonLoadingStatus = (data: any): Omit<SubscriptionStatus, "loading"> => {
  return {
    subscribed: data?.subscribed ?? false,
    trial_active: data?.trial_active ?? false,
    trial_ends_at: data?.trial_ends_at ?? null,
    subscription_end: data?.subscription_end ?? null,
    status: data?.status ?? "none",
    days_remaining: data?.days_remaining ?? 0,
    error: null,
  };
};

const toUnknownNonLoadingStatus = (err: unknown): Omit<SubscriptionStatus, "loading"> => {
  const msg = err instanceof Error ? err.message : "Failed to check subscription";
  return {
    subscribed: false,
    trial_active: false,
    trial_ends_at: null,
    subscription_end: null,
    status: "unknown",
    days_remaining: 0,
    error: msg,
  };
};

async function fetchSubscriptionOnce(token: string): Promise<Omit<SubscriptionStatus, "loading">> {
  try {
    const { data, error } = await supabase.functions.invoke("check-subscription", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) throw error;
    return toNonLoadingStatus(data);
  } catch (e) {
    // CRITICAL: Never throw; never retry.
    console.warn("Subscription check failed (singleton, non-blocking):", e);
    return toUnknownNonLoadingStatus(e);
  }
}

/**
 * Global singleton subscription check (shared across the entire app).
 * Guarantees at most ONE backend call per page load.
 * Never throws.
 */
export async function checkSubscriptionSingleton(
  token: string
): Promise<Omit<SubscriptionStatus, "loading">> {
  if (!token) return toUnknownNonLoadingStatus(new Error("Missing access token"));

  if (singletonCheckedToken === token && singletonCached) {
    return singletonCached;
  }

  if (singletonInFlight && singletonToken === token) {
    return singletonInFlight;
  }

  // Hard stop: do not retry within the same page load (prevents spam loops)
  if (pageLoadCheckAttempted) {
    return singletonCached ?? toUnknownNonLoadingStatus(new Error("Subscription check skipped (already attempted this page load)"));
  }

  pageLoadCheckAttempted = true;
  singletonToken = token;
  singletonInFlight = fetchSubscriptionOnce(token).then((res) => {
    singletonCheckedToken = token;
    singletonCached = res;
    return res;
  });
  return singletonInFlight;
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

    // CRITICAL: Never run subscription checks while QZ trust handshake is in progress
    if (isQzConnecting()) {
      console.log("SUBSCRIPTION: skipped because QZ is connecting");
      return;
    }

    if (!session?.access_token) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

    const token = session.access_token;

    // Prevent per-hook concurrent checks (still useful for local UI)
    if (isCheckingRef.current) {
      console.log("Subscription check already in progress (local), skipping");
      return;
    }

    isCheckingRef.current = true;

    try {
      if (!isQzConnecting()) {
        setSubscription(prev => ({ ...prev, loading: true, error: null }));
      }

      const res = await checkSubscriptionSingleton(token);
      if (!isQzConnecting()) {
        setSubscription({ ...res, loading: false });
      }
      didCheckRef.current = true;
    } catch (error) {
      // CRITICAL: Never block app on subscription errors
      console.warn("Subscription check failed (non-blocking):", error);
      // Avoid state updates during QZ handshake
      if (!isQzConnecting()) {
        setSubscription(prev => ({
          ...prev,
          loading: false,
          status: "unknown",
          error: error instanceof Error ? error.message : "Failed to check subscription",
        }));
      }
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

       // Reset singleton on logout so a new login can re-check
       singletonToken = null;
       singletonCheckedToken = null;
       singletonInFlight = null;
       singletonCached = null;
       pageLoadCheckAttempted = false;

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
