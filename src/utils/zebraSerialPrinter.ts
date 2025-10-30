/**
 * Zebra USB Printer via Web Serial API
 * Sends ZPL commands directly to a Zebra printer connected via USB (CDC/COM mode)
 */

export interface SerialPrintOptions {
  baudRate?: number;
  appendNewline?: boolean;
}

/**
 * Send ZPL string to Zebra printer via Web Serial API
 * @param zpl - The ZPL command string to send
 * @param options - Serial port options
 */
export async function sendZplOverSerial(
  zpl: string,
  options?: SerialPrintOptions
): Promise<void> {
  // Check for Web Serial API support
  if (!("serial" in navigator)) {
    throw new Error(
      "Web Serial API is not supported. Please use Chrome or Edge on desktop with HTTPS."
    );
  }

  let port: SerialPort | null = null;

  try {
    // Request user to select the serial port (Zebra USB printer)
    port = await navigator.serial.requestPort();

    // Open the serial port with specified baud rate
    await port.open({
      baudRate: options?.baudRate ?? 9600,
    });

    // Get the writer for sending data
    const writer = port.writable?.getWriter();
    if (!writer) {
      throw new Error("Failed to open serial writer.");
    }

    // Prepare the ZPL data
    const encoder = new TextEncoder();
    const payload = options?.appendNewline ? zpl + "\r\n" : zpl;
    const data = encoder.encode(payload);

    // Send the ZPL to the printer
    await writer.write(data);

    // Release the writer lock
    writer.releaseLock();
  } catch (error) {
    throw error;
  } finally {
    // Always close the port
    if (port) {
      try {
        await port.close();
      } catch (closeError) {
        console.warn("Error closing serial port:", closeError);
      }
    }
  }
}
