import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PrintOnPortDialogProps {
  open: boolean;
  onClose: () => void;
  onGetZpl: () => string;
}

export const PrintOnPortDialog = ({
  open,
  onClose,
  onGetZpl,
}: PrintOnPortDialogProps) => {
  const [printerIp, setPrinterIp] = useState("");
  const [port, setPort] = useState("9100");
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    if (!printerIp.trim()) {
      toast.error("Please enter printer IP address");
      return;
    }

    setIsPrinting(true);

    try {
      const zpl = onGetZpl();

      const res = await fetch("http://localhost:19100/print", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          printerIp: printerIp.trim(),
          zpl,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || "Print failed.");
      }

      toast.success(`Label sent to ${printerIp}:${port}`);
      onClose();
      setPrinterIp("");
      setPort("9100");
    } catch (err: any) {
      const msg = err?.message?.includes("Failed to fetch")
        ? "Local print agent not found on http://localhost:19100. Please run Zebra Printer Port 9100."
        : err?.message || "Print failed.";
      toast.error(msg);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print on Port</DialogTitle>
          <DialogDescription>
            Enter the printer IP address and port to send the label directly to the printer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="printerIp">Printer IP Address</Label>
            <Input
              id="printerIp"
              type="text"
              placeholder="e.g. 192.168.1.55"
              value={printerIp}
              onChange={(e) => setPrinterIp(e.target.value)}
              disabled={isPrinting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isPrinting}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Requires local "Zebra Printer Port 9100" agent running on this PC.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPrinting}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Printing...
              </>
            ) : (
              "Print"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
