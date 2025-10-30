import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Network } from "lucide-react";

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onPrintWindowsMac: () => void;
  onPrintOnPort: () => void;
}

export const PrintOptionsDialog = ({
  open,
  onClose,
  onPrintWindowsMac,
  onPrintOnPort,
}: PrintOptionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print Options</DialogTitle>
          <DialogDescription>
            Choose how you want to print your label
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-6">
          <button
            onClick={() => {
              onClose();
              onPrintWindowsMac();
            }}
            className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
          >
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Printer className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-base mb-1">Print on Windows/Mac</h3>
              <p className="text-xs text-muted-foreground">Standard system print dialog</p>
            </div>
          </button>
          <button
            onClick={() => {
              onClose();
              onPrintOnPort();
            }}
            className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
          >
            <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Network className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-base mb-1">Print on Port</h3>
              <p className="text-xs text-muted-foreground">Direct network printing</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
