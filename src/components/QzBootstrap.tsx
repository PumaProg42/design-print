import { useEffect } from "react";
import { ensureQZConnected } from "@/lib/qzClient";

/**
 * Ensures QZ Tray security + connection is attempted during app boot.
 * This must NEVER block rendering, and must be independent of auth/subscription state.
 */
export function QzBootstrap() {
  useEffect(() => {
    // Fire-and-forget: must not block app startup
    ensureQZConnected().catch((e) => {
      console.warn("QZ bootstrap connect failed (non-blocking):", e);
    });
  }, []);

  return null;
}
