import { useCallback, useEffect, useRef } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { supabase } from "@/integrations/supabase/client";

export const useFingerprint = () => {
  const fingerprintRef = useRef<string | null>(null);

  // Get fingerprint on mount
  useEffect(() => {
    const getFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        fingerprintRef.current = result.visitorId;
      } catch (error) {
        console.error("Error getting fingerprint:", error);
      }
    };

    getFingerprint();
  }, []);

  const getFingerprint = useCallback(async (): Promise<string> => {
    if (fingerprintRef.current) {
      return fingerprintRef.current;
    }

    const fp = await FingerprintJS.load();
    const result = await fp.get();
    fingerprintRef.current = result.visitorId;
    return result.visitorId;
  }, []);

  const checkFingerprint = useCallback(async (): Promise<{ blocked: boolean; reason: string | null }> => {
    try {
      const fingerprint = await getFingerprint();
      
      const { data, error } = await supabase.functions.invoke("check-fingerprint", {
        body: { fingerprint },
      });

      if (error) {
        console.error("Error checking fingerprint:", error);
        return { blocked: false, reason: null };
      }

      return {
        blocked: data?.blocked ?? false,
        reason: data?.reason ?? null,
      };
    } catch (error) {
      console.error("Error checking fingerprint:", error);
      return { blocked: false, reason: null };
    }
  }, [getFingerprint]);

  const registerFingerprint = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const fingerprint = await getFingerprint();
      
      const { error } = await supabase.functions.invoke("register-fingerprint", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          fingerprint,
          userAgent: navigator.userAgent,
        },
      });

      if (error) {
        console.error("Error registering fingerprint:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error registering fingerprint:", error);
      return false;
    }
  }, [getFingerprint]);

  return {
    getFingerprint,
    checkFingerprint,
    registerFingerprint,
  };
};
