import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download } from "lucide-react";
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
  const [copies, setCopies] = useState("1");
  const [rememberIp, setRememberIp] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load saved IP from localStorage on mount
  useEffect(() => {
    const savedIp = localStorage.getItem("zebraPrinterIp");
    if (savedIp) {
      setPrinterIp(savedIp);
      setRememberIp(true);
    }
  }, []);

  const handlePrint = async () => {
    if (!printerIp.trim()) {
      toast.error("Please enter printer IP address");
      return;
    }

    const numCopies = parseInt(copies) || 1;
    if (numCopies < 1 || numCopies > 100) {
      toast.error("Number of copies must be between 1 and 100");
      return;
    }

    // Save IP to localStorage if checkbox is checked
    if (rememberIp) {
      localStorage.setItem("zebraPrinterIp", printerIp.trim());
    } else {
      localStorage.removeItem("zebraPrinterIp");
    }

    setIsPrinting(true);

    try {
      const zpl = onGetZpl();

      // Send print job for each copy
      for (let i = 0; i < numCopies; i++) {
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
      }

      toast.success(`${numCopies} label${numCopies > 1 ? 's' : ''} sent to ${printerIp}`);
      onClose();
      if (!rememberIp) {
        setPrinterIp("");
      }
      setCopies("1");
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
            Direct network printing to your Zebra printer
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="p-4 rounded-lg bg-accent/50 border border-border">
            <p className="text-sm mb-3">
              To print via port, you need to run the application <span className="font-mono font-semibold">zebra_agent.exe</span>.
              This app opens port 9100 and runs in the background so we can send data to the Zebra printer.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/zebra_agent.exe';
                link.download = 'zebra_agent.exe';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download zebra_agent.exe
            </Button>
          </div>

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
              min="1"
              max="65535"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={isPrinting}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="copies">Number of Copies</Label>
            <Input
              id="copies"
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              disabled={isPrinting}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberIp"
              checked={rememberIp}
              onCheckedChange={(checked) => setRememberIp(checked === true)}
              disabled={isPrinting}
            />
            <Label htmlFor="rememberIp" className="text-sm cursor-pointer">
              Remember printer IP address
            </Label>
          </div>
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
