import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Network } from "lucide-react";

interface PrintOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onPrintWindowsMac: () => void;
  onQzTrayPrint?: () => void;
}

export const PrintOptionsDialog = ({
  open,
  onClose,
  onPrintWindowsMac,
  onQzTrayPrint,
}: PrintOptionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Options</DialogTitle>
          <DialogDescription>
            Choose how you want to print your label
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-6">
          {/* Print on Port - Top/Recommended Option */}
          {onQzTrayPrint && (
            <button
              onClick={() => {
                onClose();
                onQzTrayPrint();
              }}
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer group"
            >
              <div className="p-3 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">Print on Port</h3>
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">priporočeno</span>
                </div>
                <p className="text-xs text-muted-foreground">Univerzalno tiskanje - vsi tiskalniki (USB, mreža)</p>
              </div>
            </button>
          )}
          
          <button
            onClick={() => {
              onClose();
              onPrintWindowsMac();
            }}
            className="flex items-center gap-4 p-4 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all duration-200 cursor-pointer group"
          >
            <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Printer className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-base">Print on Windows/Mac</h3>
              <p className="text-xs text-muted-foreground">Standard system print dialog</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
