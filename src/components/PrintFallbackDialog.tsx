import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface PrintFallbackDialogProps {
  open: boolean;
  onClose: () => void;
  onDownloadZpl: () => void;
  onVisualPrint: () => void;
}

export const PrintFallbackDialog = ({
  open,
  onClose,
  onDownloadZpl,
  onVisualPrint,
}: PrintFallbackDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zebra Browser Print Not Available</DialogTitle>
          <DialogDescription>
            To print ZPL directly to Zebra printers, please install Zebra Browser Print
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onDownloadZpl();
              onClose();
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download ZPL File
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => {
              onVisualPrint();
              onClose();
            }}
          >
            <Printer className="mr-2 h-4 w-4" />
            Open Print Dialog (Visual Preview)
          </Button>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              To enable direct ZPL printing:
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Download Zebra Browser Print from Zebra's website</li>
              <li>Install and start the service</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
