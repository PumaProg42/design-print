/// <reference path="../webusb.d.ts" />
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Usb, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebUsbPrintButtonProps {
  onGetZpl: () => string;
  disabled?: boolean;
}

async function sendZplToUsbSmart(zpl: string): Promise<void> {
  if (!("usb" in navigator)) {
    throw new Error("WebUSB is not supported in this browser. Use Chrome/Edge over HTTPS.");
  }

  // 1) Ask user to pick the device
  const device = await navigator.usb.requestDevice({
    // Leave filters empty so user can pick any USB device
    // If you know the Zebra vendorId (0x0A5F), you can add it here
    filters: []
  });

  // 2) Open the device
  await device.open();

  // 3) Select configuration if needed
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }

  // 4) Find all candidate interfaces that have at least one OUT endpoint
  const candidates: Array<{
    interfaceNumber: number;
    endpointNumber: number;
  }> = [];

  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const outEp = alt.endpoints.find((e) => e.direction === "out");
      if (outEp) {
        candidates.push({
          interfaceNumber: iface.interfaceNumber,
          endpointNumber: outEp.endpointNumber,
        });
      }
    }
  }

  if (!candidates.length) {
    await device.close();
    throw new Error("No USB OUT endpoint found on the selected device.");
  }

  const encoder = new TextEncoder();
  // Add CRLF because some Zebra printers like it
  const payload = encoder.encode(zpl + "\r\n");

  let lastError: unknown = null;
  let sent = false;

  // 5) Try each candidate until one works
  for (const cand of candidates) {
    try {
      await device.claimInterface(cand.interfaceNumber);
      await device.transferOut(cand.endpointNumber, payload);
      sent = true;
      console.log(`✓ USB print succeeded on interface ${cand.interfaceNumber}, endpoint ${cand.endpointNumber}`);
      break;
    } catch (err) {
      console.warn(
        `USB print failed on interface ${cand.interfaceNumber}, endpoint ${cand.endpointNumber}:`,
        err
      );
      lastError = err;
      // try next candidate
    } finally {
      // best effort release (may fail on some devices, that's OK)
      try {
        await device.releaseInterface(cand.interfaceNumber);
      } catch (_) {
        // ignore
      }
    }
  }

  await device.close();

  if (!sent) {
    throw new Error(
      "Could not send ZPL to any USB OUT endpoint on this device. Last error: " +
        ((lastError as any)?.message ?? String(lastError))
    );
  }
}

export const WebUsbPrintButton = ({ onGetZpl, disabled }: WebUsbPrintButtonProps) => {
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    try {
      const zpl = onGetZpl();
      await sendZplToUsbSmart(zpl);
      toast.success("Label sent to USB Zebra printer");
    } catch (err: any) {
      console.error("USB print error:", err);
      if (err?.message?.includes("not supported")) {
        toast.error("WebUSB not supported. Use Chrome/Edge over HTTPS.");
      } else if (err?.name === "NotFoundError") {
        toast.error("No device selected");
      } else {
        toast.error(err?.message ?? "USB printing failed");
      }
    } finally {
      setPrinting(false);
    }
  }, [onGetZpl]);

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handlePrint}
      disabled={disabled || printing}
      className="bg-gradient-primary transition-all hover:shadow-lg hover:scale-105"
    >
      {printing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Printing...
        </>
      ) : (
        <>
          <Usb className="w-4 h-4 mr-2" />
          Print USB (WebUSB)
        </>
      )}
    </Button>
  );
};
