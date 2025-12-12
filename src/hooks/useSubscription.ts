import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SubscriptionStatus {
  subscribed: boolean;
  trial_active: boolean;
  trial_ends_at: string | null;
  subscription_end: string | null;
  status: "trial" | "active" | "expired" | "cancelled" | "none";
  days_remaining: number;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
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

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

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
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to check subscription",
      }));
    }
  }, [session?.access_token]);

  // Check subscription on auth change
  useEffect(() => {
    if (user && session) {
      checkSubscription();
    } else {
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

  // Periodic refresh every 60 seconds
  useEffect(() => {
    if (!user || !session) return;

    const interval = setInterval(checkSubscription, 60000);
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
