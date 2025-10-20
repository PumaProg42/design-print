import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Printer {
  name: string;
  connection: string;
  uid: string;
}

interface PrinterSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: (printer: any) => void;
  zplCode: string;
}

declare global {
  interface Window {
    BrowserPrint?: any;
  }
}

export const PrinterSelectionDialog = ({
  open,
  onClose,
  onPrint,
  zplCode,
}: PrinterSelectionDialogProps) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open || !window.BrowserPrint) return;

    setLoading(true);
    
    // Get available printers
    window.BrowserPrint.getLocalDevices(
      (deviceList: Printer[]) => {
        setPrinters(deviceList || []);
        setLoading(false);

        // Try to restore last used printer
        const lastPrinter = localStorage.getItem("lastZebraPrinter");
        if (lastPrinter) {
          const exists = deviceList.find((p) => p.uid === lastPrinter);
          if (exists) {
            setSelectedPrinter(lastPrinter);
          } else if (deviceList.length > 0) {
            setSelectedPrinter(deviceList[0].uid);
          }
        } else if (deviceList.length > 0) {
          setSelectedPrinter(deviceList[0].uid);
        }
      },
      (error: any) => {
        console.error("Failed to get printers:", error);
        toast.error("Failed to detect printers");
        setLoading(false);
      }
    );
  }, [open]);

  const handlePrint = () => {
    const printer = printers.find((p) => p.uid === selectedPrinter);
    if (!printer) {
      toast.error("Please select a printer");
      return;
    }

    setPrinting(true);

    // Create device instance
    const device = new window.BrowserPrint.Device(printer.connection, printer.uid);
    
    // Send ZPL to printer
    device.send(
      zplCode,
      () => {
        // Save last used printer
        localStorage.setItem("lastZebraPrinter", printer.uid);
        toast.success(`Printing to ${printer.name}`);
        setPrinting(false);
        onPrint(printer);
        onClose();
      },
      (error: any) => {
        console.error("Print error:", error);
        toast.error("Failed to send print job");
        setPrinting(false);
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Zebra Printer</DialogTitle>
          <DialogDescription>
            Choose a printer to send the ZPL label
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : printers.length === 0 ? (
            <div className="text-center py-8">
              <Printer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No Zebra printers detected
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure your printer is connected and turned on
              </p>
            </div>
          ) : (
            <RadioGroup value={selectedPrinter} onValueChange={setSelectedPrinter}>
              {printers.map((printer) => (
                <div
                  key={printer.uid}
                  className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent"
                >
                  <RadioGroupItem value={printer.uid} id={printer.uid} />
                  <Label
                    htmlFor={printer.uid}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <div className="flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{printer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {printer.connection}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!selectedPrinter || printing || printers.length === 0}
          >
            {printing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Printing...
              </>
            ) : (
              "Print"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
