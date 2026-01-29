/**
 * QZ Tray Client Module
 * 
 * Single source of truth for QZ Tray connection management.
 * 
 * CRITICAL: QZ Tray connection MUST only happen from user gestures (clicks).
 * This enables the "Remember this decision" checkbox in QZ Tray's trust dialog.
 * 
 * Security configuration (certificates) can happen on load - that's safe.
 * Connection MUST NOT happen automatically on page load.
 * 
 * Security endpoints:
 * - GET /api/qz/cert - returns PEM certificate (text/plain)
 * - POST /api/qz/sign - signs requests (text/plain body and response)
 */
import qz from "qz-tray";

// Flag to ensure security is configured only once
let securityConfigured = false;

/**
 * Configure QZ security promises using backend endpoints.
 * This is SAFE to call on page load - it only sets up callbacks.
 * Must be called BEFORE qz.websocket.connect().
 * Idempotent - safe to call multiple times.
 */
export function configureQZSecurity(): void {
  if (securityConfigured) return;

  // Set certificate promise - fetches from backend
  qz.security.setCertificatePromise((resolve, reject) => {
    fetch("/api/qz/cert", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch certificate: ${r.status}`);
        return r.text();
      })
      .then((cert) => resolve(cert))
      .catch((err) => {
        console.error("QZ Certificate fetch error:", err);
        reject?.(err);
      });
  });

  // Set signature promise - signs via backend
  qz.security.setSignaturePromise((toSign) => {
    return (resolve, reject) => {
      fetch("/api/qz/sign", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: toSign,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to sign: ${r.status}`);
          return r.text();
        })
        .then((sig) => resolve(sig))
        .catch((err) => {
          console.error("QZ Signing error:", err);
          reject?.(err);
        });
    };
  });

  securityConfigured = true;
  console.log("QZ security configured (no connection yet)");
}

/**
 * Connect to QZ Tray.
 * 
 * CRITICAL: This MUST only be called from user gesture handlers (onClick, etc.)
 * Never call this from useEffect, onMount, or any automatic initialization.
 * This enables QZ Tray's "Remember this decision" checkbox to work.
 * 
 * @throws Error if QZ Tray is not running or connection fails
 */
export async function connectQZ(): Promise<void> {
  // Ensure security is configured first
  configureQZSecurity();

  // Only connect if not already connected
  if (qz.websocket.isActive()) {
    return;
  }

  console.log("QZ connecting (user gesture)...");
  await qz.websocket.connect({ host: "localhost", retries: 0, delay: 0 });
  console.log("QZ Tray connected");
}

/**
 * Ensure QZ is connected - convenience wrapper for print/test operations.
 * 
 * CRITICAL: This MUST only be called from user gesture handlers (onClick, etc.)
 * Never call this from useEffect, onMount, or any automatic initialization.
 */
export async function ensureQZConnected(): Promise<void> {
  await connectQZ();
}

/**
 * Disconnect from QZ Tray.
 * Safe to call even if not connected.
 */
export async function disconnectQZ(): Promise<void> {
  try {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
      console.log("QZ Tray disconnected");
    }
  } catch (err) {
    console.error("Error disconnecting from QZ Tray:", err);
  }
}

/**
 * Check if QZ Tray is currently connected.
 */
export function isQZConnected(): boolean {
  return qz.websocket.isActive();
}

/**
 * Find all available printers.
 * Automatically ensures QZ is connected first.
 */
export async function findPrinters(): Promise<string[]> {
  await ensureQZConnected();
  return qz.printers.find();
}

/**
 * Get the default system printer.
 * Automatically ensures QZ is connected first.
 */
export async function getDefaultPrinter(): Promise<string> {
  await ensureQZConnected();
  return qz.printers.getDefault();
}

/**
 * Test connection to a network printer.
 * Sends a minimal ZPL command to verify connectivity.
 * 
 * @param ip - Printer IP address
 * @param port - Printer port (default 9100)
 * @param timeoutMs - Connection timeout in milliseconds (default 5000)
 */
export async function testNetworkPrinter(
  ip: string,
  port: number = 9100,
  timeoutMs: number = 5000
): Promise<void> {
  await ensureQZConnected();

  const config = qz.configs.create({ host: ip, port: port });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`Connection timeout (${timeoutMs / 1000}s)`)),
      timeoutMs
    );
  });

  // Send minimal ZPL command to test connection
  await Promise.race([qz.print(config, ["^XA^XZ"]), timeoutPromise]);
}

/**
 * Print ZPL code to a network printer.
 * 
 * @param ip - Printer IP address
 * @param port - Printer port
 * @param zplCode - ZPL code to print
 * @param copies - Number of copies (default 1)
 */
export async function printToNetworkPrinter(
  ip: string,
  port: number,
  zplCode: string,
  copies: number = 1
): Promise<void> {
  await ensureQZConnected();

  const config = qz.configs.create({ host: ip, port: port });

  for (let i = 0; i < copies; i++) {
    await qz.print(config, [zplCode]);
  }
}

/**
 * Print ZPL code to a local printer.
 * 
 * @param printerName - Local printer name
 * @param zplCode - ZPL code to print
 * @param copies - Number of copies (default 1)
 */
export async function printZplToLocalPrinter(
  printerName: string,
  zplCode: string,
  copies: number = 1
): Promise<void> {
  await ensureQZConnected();

  const config = qz.configs.create(printerName);

  for (let i = 0; i < copies; i++) {
    await qz.print(config, [zplCode]);
  }
}

/**
 * Print image to a local printer.
 * 
 * @param printerName - Local printer name
 * @param imageBase64 - Base64 encoded image data
 * @param width - Label width in mm
 * @param height - Label height in mm
 * @param dpi - Print resolution
 * @param copies - Number of copies (default 1)
 */
export async function printImageToLocalPrinter(
  printerName: string,
  imageBase64: string,
  width: number,
  height: number,
  dpi: number,
  copies: number = 1
): Promise<void> {
  await ensureQZConnected();

  const config = qz.configs.create(printerName, {
    size: { width, height },
    units: "mm",
    colorType: "grayscale",
    interpolation: "nearest-neighbor",
    scaleContent: true,
    rasterize: true,
  });

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const data = [
    {
      type: "pixel" as const,
      format: "image" as const,
      flavor: "base64" as const,
      data: base64Data,
      options: { density: dpi },
    },
  ];

  for (let i = 0; i < copies; i++) {
    await qz.print(config, data);
  }
}
