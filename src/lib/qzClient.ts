/**
 * QZ Tray Client Module
 * 
 * CRITICAL: QZ Tray connection MUST only happen from user gestures (clicks).
 * This enables the "Remember this decision" checkbox in QZ Tray's trust dialog.
 * 
 * Security configuration can happen on load - that's safe.
 * Connection MUST NOT happen automatically on page load.
 * 
 * Endpoints:
 * - GET /api/qz/cert → returns PEM certificate as text/plain
 * - POST /api/qz/sign → body text/plain (raw string), returns base64 signature as text/plain
 */
import qz from "qz-tray";

let configured = false;

/**
 * Configure QZ security promises using backend endpoints.
 * SAFE to call on page load - only sets up callbacks, no connection.
 * Idempotent.
 */
export function configureQZSecurity(): void {
  if (configured) return;
  configured = true;
  
  console.log("QZ SECURITY CONFIGURED");

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch("/api/qz/cert", { cache: "no-store" })
      .then(r => r.text())
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignaturePromise(toSign => (resolve, reject) => {
    const bytes = new TextEncoder().encode(toSign); // byte-exact UTF-8
    fetch("/api/qz/sign", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: bytes
    })
      .then(r => r.text())
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Connect to QZ Tray from a user action (click handler).
 * 
 * CRITICAL: This MUST only be called from onClick handlers or similar user gestures.
 * Never call from useEffect, onMount, or any automatic initialization.
 * This enables QZ Tray's "Remember this decision" checkbox to work.
 * 
 * @throws Error if QZ Tray is not running or connection fails
 */
export async function connectFromUserClick(): Promise<void> {
  configureQZSecurity();
  
  if (qz.websocket.isActive()) {
    return;
  }
  
  console.log("QZ CONNECT CALLED (user gesture)");
  await qz.websocket.connect();
  
  // IMPORTANT: Enforce trust handshake immediately after connect
  // This ensures the "Remember this decision" checkbox is enabled
  await qz.printers.getDefault();
}

/**
 * Alias for backward compatibility - calls connectFromUserClick.
 * CRITICAL: Only call from user gesture handlers!
 */
export async function connectQZFromUserAction(): Promise<void> {
  await connectFromUserClick();
}

/**
 * Alias for backward compatibility.
 * CRITICAL: Only call from user gesture handlers!
 */
export async function connectQZ(): Promise<void> {
  await connectFromUserClick();
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
 * Safe to call anytime - does not trigger connection.
 */
export function isQZConnected(): boolean {
  return qz.websocket.isActive();
}

/**
 * Find all available printers.
 * REQUIRES: Must be connected first via connectFromUserClick()
 * @throws Error if not connected
 */
export async function findPrinters(): Promise<string[]> {
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray not connected. Call connectFromUserClick() first.");
  }
  return qz.printers.find();
}

/**
 * Get the default system printer.
 * REQUIRES: Must be connected first via connectFromUserClick()
 * @throws Error if not connected
 */
export async function getDefaultPrinter(): Promise<string> {
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray not connected. Call connectFromUserClick() first.");
  }
  return qz.printers.getDefault();
}

/**
 * Test connection to a network printer.
 * Sends a minimal ZPL command to verify connectivity.
 * REQUIRES: Must be connected first via connectFromUserClick()
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
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray not connected. Call connectFromUserClick() first.");
  }

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
 * REQUIRES: Must be connected first via connectFromUserClick()
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
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray not connected. Call connectFromUserClick() first.");
  }

  const config = qz.configs.create({ host: ip, port: port });

  for (let i = 0; i < copies; i++) {
    await qz.print(config, [zplCode]);
  }
}

/**
 * Print ZPL code to a local printer.
 * REQUIRES: Must be connected first via connectFromUserClick()
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
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray not connected. Call connectFromUserClick() first.");
  }

  const config = qz.configs.create(printerName);

  for (let i = 0; i < copies; i++) {
    await qz.print(config, [zplCode]);
  }
}

/**
 * Print image to a local printer.
 * REQUIRES: Must be connected first via connectFromUserClick()
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
  if (!qz.websocket.isActive()) {
    throw new Error("QZ Tray not connected. Call connectFromUserClick() first.");
  }

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
