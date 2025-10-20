/// <reference path="../webusb.d.ts" />
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Printer, Usb } from "lucide-react";
import { toast } from "sonner";

interface WebUsbPrinterDialogProps {
  open: boolean;
  onClose: () => void;
  zplCode: string;
}

export const WebUsbPrinterDialog = ({ open, onClose, zplCode }: WebUsbPrinterDialogProps) => {
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [printing, setPrinting] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.usb) {
      setSupported(false);
    }
  }, []);
  useEffect(() => {
    if (open) {
      // force fresh permission flow each time dialog opens
      setDevice(null);
      setPermissionGranted(false);
      setLastError(null);
    }
  }, [open]);

  const closeQuietly = async (dev: USBDevice | null) => {
    if (!dev) return;
    try {
      if ((dev as any).opened) {
        try { await dev.releaseInterface(0); } catch {}
        try { await dev.close(); } catch {}
      }
    } catch {}
  };

  const requestPrinter = async () => {
    setLastError(null);
    try {
      // If a device was previously selected, release/close it first
      await closeQuietly(device);

      // Request Zebra printer (using common Zebra vendor IDs)
      const selected = await navigator.usb!.requestDevice({
        filters: [
          { vendorId: 0x0a5f }, // Zebra Technologies
        ],
      });

      setDevice(selected);
      setPermissionGranted(true);
      toast.success("Printer selected");
    } catch (error: any) {
      if (error?.name === "NotFoundError") {
        toast.error("No printer selected");
      } else if (error?.name === "SecurityError" || /Access denied/i.test(error?.message || "")) {
        setLastError("Access to the USB device was denied by the system. On Windows, a vendor driver may be claiming the printer. Remove or disable the Windows printer driver for this device, unplug and replug the printer, and try again. Also ensure 'Allow sites to access USB devices' is enabled in Chrome settings.");
        toast.error("USB access denied");
      } else {
        toast.error(`Failed to select printer: ${error.message}`);
      }
    }
  };

  const handlePrint = async () => {
    if (!device || !permissionGranted) {
      toast.error("Please click Select Printer and choose your printer first");
      return;
    }

    setPrinting(true);
    setLastError(null);

    try {
      // Make sure no previous session is active
      await closeQuietly(device);

      await device.open();
      try {
        // Some devices require explicit configuration select
        try { await device.selectConfiguration(1); } catch {}
        await device.claimInterface(0);

        // Send ZPL code as raw bytes
        const encoder = new TextEncoder();
        const data = encoder.encode(zplCode);

        // Default OUT endpoint is often 1 for Zebra
        const endpointNumber = 1;
        await device.transferOut(endpointNumber, data);

        toast.success("Label sent to printer");
        onClose();
      } finally {
        // Always clean up
        try { await device.releaseInterface(0); } catch {}
        try { await device.close(); } catch {}
      }
    } catch (error: any) {
      console.error("Print error:", error);
      if (error?.name === "SecurityError" || /Access denied/i.test(error?.message || "")) {
        setLastError("Access denied when opening the USB printer. Close other apps that may use the printer, then remove the Windows driver for the Zebra device (Devices and Printers -> remove device and uninstall driver), unplug and replug the USB cable, and try again. WebUSB requires the OS not to claim the device.");
        toast.error("Failed to print: USB access denied");
      } else if (error?.name === "NetworkError") {
        setLastError("Could not communicate with the USB printer. Try another USB port or cable.");
        toast.error("Failed to print");
      } else {
        toast.error(`Failed to print: ${error.message}`);
      }
    } finally {
      setPrinting(false);
    }
  };

  if (!supported) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>USB Printing Not Supported</DialogTitle>
            <DialogDescription>
              Your browser doesn't support WebUSB. Please use Chrome, Edge, or Opera on desktop.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTitle>WebUSB not available</AlertTitle>
            <AlertDescription>
              If you're on Windows and see access errors, remove the Zebra driver from Devices and Printers, unplug/replug the printer, and try Chrome on desktop.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print to USB Printer</DialogTitle>
          <DialogDescription>
            Connect your Zebra printer via USB and click "Select Printer" to choose it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!device ? (
            <Button onClick={requestPrinter} className="w-full" variant="outline">
              <Usb className="mr-2 h-4 w-4" />
              Select Printer
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Printer className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{device.productName || "Zebra Printer"}</p>
                <p className="text-sm text-muted-foreground">USB Connected</p>
              </div>
              <Button size="sm" variant="outline" onClick={requestPrinter}>Change</Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={!device || !permissionGranted || printing}>
            {printing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {printing ? "Printing..." : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
