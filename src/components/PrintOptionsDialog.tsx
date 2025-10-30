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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Options</DialogTitle>
          <DialogDescription>
            Choose how you want to print your label
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            onClick={() => {
              onClose();
              onPrintWindowsMac();
            }}
            className="w-full h-16 text-lg"
            variant="outline"
          >
            <Printer className="w-6 h-6 mr-3" />
            Print on Windows/Mac
          </Button>
          <Button
            onClick={() => {
              onClose();
              onPrintOnPort();
            }}
            className="w-full h-16 text-lg"
            variant="outline"
          >
            <Network className="w-6 h-6 mr-3" />
            Print on Port
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
