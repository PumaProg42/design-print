import { useEffect } from "react";
import { configureQZSecurity } from "@/lib/qzClient";

/**
 * Configures QZ Tray security on app boot.
 * 
 * CRITICAL: This only sets up security callbacks - it does NOT connect.
 * QZ connection must only happen from user gestures (clicks) to enable
 * the "Remember this decision" checkbox in QZ Tray's trust dialog.
 */
export function QzBootstrap() {
  useEffect(() => {
    // Safe to configure security on load - no connection happens here
    configureQZSecurity();
  }, []);

  return null;
}
