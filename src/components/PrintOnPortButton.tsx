import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Network, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PrintOnPortButtonProps {
  onGetZpl: () => string;
}

export const PrintOnPortButton = ({ onGetZpl }: PrintOnPortButtonProps) => {
  const [printerIp, setPrinterIp] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useCallback(async () => {
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

      toast.success(`Label sent to ${printerIp}`);
    } catch (err: any) {
      const msg = err?.message?.includes("Failed to fetch")
        ? "Local print agent not found on http://localhost:19100. Please run Zebra Printer Port 9100."
        : err?.message || "Print failed.";
      toast.error(msg);
    } finally {
      setIsPrinting(false);
    }
  }, [printerIp, onGetZpl]);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Printer IP (e.g. 192.168.1.55)"
        value={printerIp}
        onChange={(e) => setPrinterIp(e.target.value)}
        className="w-56 h-8"
        disabled={isPrinting}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        disabled={isPrinting}
        className="transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:scale-105"
      >
        {isPrinting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Printing...
          </>
        ) : (
          <>
            <Network className="w-4 h-4 mr-2" />
            Print on Port
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        Requires local "Zebra Printer Port 9100" agent
      </p>
    </div>
  );
};
