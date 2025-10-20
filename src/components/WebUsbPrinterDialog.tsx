/// <reference path="../webusb.d.ts" />
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!navigator.usb) {
      setSupported(false);
    }
  }, []);

  const requestPrinter = async () => {
    try {
      // Request Zebra printer (using common Zebra vendor IDs)
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0a5f }, // Zebra Technologies
        ],
      });
      setDevice(device);
      toast.success("Printer selected");
    } catch (error: any) {
      if (error.name === "NotFoundError") {
        toast.error("No printer selected");
      } else {
        toast.error(`Failed to select printer: ${error.message}`);
      }
    }
  };

  const handlePrint = async () => {
    if (!device) {
      toast.error("Please select a printer first");
      return;
    }

    setPrinting(true);
    try {
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // Send ZPL code as raw bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(zplCode);

      // Find the OUT endpoint (usually endpoint 1)
      const endpointNumber = 1;
      await device.transferOut(endpointNumber, data);

      await device.releaseInterface(0);
      await device.close();

      toast.success("Label sent to printer");
      onClose();
    } catch (error: any) {
      console.error("Print error:", error);
      toast.error(`Failed to print: ${error.message}`);
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
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={!device || printing}>
            {printing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {printing ? "Printing..." : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
