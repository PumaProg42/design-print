import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Network } from "lucide-react";
import { toast } from "sonner";

interface NetworkPrinterDialogProps {
  open: boolean;
  onClose: () => void;
  zplCode: string;
}

export const NetworkPrinterDialog = ({ open, onClose, zplCode }: NetworkPrinterDialogProps) => {
  const [printerIp, setPrinterIp] = useState("");
  const [printing, setPrinting] = useState(false);
  const [rememberIp, setRememberIp] = useState(true);

  useEffect(() => {
    // Load saved printer IP from localStorage
    const savedIp = localStorage.getItem("zebraPrinterIp");
    if (savedIp) {
      setPrinterIp(savedIp);
    }
  }, [open]);

  const validateIPv4 = (ip: string): boolean => {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  const handlePrint = async () => {
    if (!printerIp.trim()) {
      toast.error("Please enter a printer IP address");
      return;
    }

    if (!validateIPv4(printerIp)) {
      toast.error("Please enter a valid IPv4 address (e.g., 192.168.1.100)");
      return;
    }

    setPrinting(true);

    try {
      console.log("Calling print-zpl endpoint with IP:", printerIp);
      
      // Get local print relay URL from environment or use default
      const printRelayUrl = import.meta.env.VITE_PRINT_RELAY_URL || 'http://localhost:8080';
      const functionUrl = `${printRelayUrl}/print-zpl`;
      
      console.log("Sending print request to:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zpl: zplCode,
          printerIp: printerIp.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Print failed:", data.error);
        toast.error(data.error || "Failed to print label");
        return;
      }

      // Save printer IP if remember is checked
      if (rememberIp) {
        localStorage.setItem("zebraPrinterIp", printerIp.trim());
      } else {
        localStorage.removeItem("zebraPrinterIp");
      }

      toast.success("Label sent to printer successfully");
      onClose();
    } catch (error: any) {
      console.error("Print error:", error);
      
      // Provide helpful error messages
      if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
        toast.error("Cannot reach print relay service. Make sure it's running on your LAN.");
      } else {
        toast.error(`Failed to print: ${error.message || "Unknown error"}`);
      }
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Print to Network Printer
          </DialogTitle>
          <DialogDescription>
            Enter the IP address of your Zebra printer on the local network. Requires print relay service running on your LAN.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="printerIp">Printer IP Address</Label>
            <Input
              id="printerIp"
              placeholder="192.168.1.100"
              value={printerIp}
              onChange={(e) => setPrinterIp(e.target.value)}
              disabled={printing}
            />
            <p className="text-sm text-muted-foreground">
              Find the IP address on your printer's network settings or configuration page
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberIp"
              checked={rememberIp}
              onChange={(e) => setRememberIp(e.target.checked)}
              disabled={printing}
              className="h-4 w-4"
            />
            <Label htmlFor="rememberIp" className="cursor-pointer">
              Remember this IP address
            </Label>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Printer className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Network Requirements:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                <li>Printer must be on the same network</li>
                <li>Port 9100 must be accessible</li>
                <li>Printer must support ZPL over TCP</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={printing}>
            {printing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {printing ? "Printing..." : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
