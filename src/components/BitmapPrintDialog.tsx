import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { renderLabelToCanvas, openPrintWindow } from "@/utils/canvasPrint";
import { toast } from "sonner";

interface BitmapPrintDialogProps {
  open: boolean;
  onClose: () => void;
  labelWidth: number;
  labelHeight: number;
  rotate180: boolean;
}

export const BitmapPrintDialog = ({
  open,
  onClose,
  labelWidth,
  labelHeight,
  rotate180,
}: BitmapPrintDialogProps) => {
  const [selectedDpi, setSelectedDpi] = useState<"203" | "300">("203");
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    try {
      setPrinting(true);
      
      const fabricCanvas = (window as any).fabricCanvas;
      if (!fabricCanvas) {
        toast.error("Canvas not initialized");
        return;
      }

      const dpi = parseInt(selectedDpi);
      
      // Render label to canvas
      const canvas = renderLabelToCanvas(fabricCanvas, {
        labelWidth,
        labelHeight,
        dpi,
        rotate180,
      });

      // Open print window
      openPrintWindow(canvas, labelWidth, labelHeight);
      
      toast.success("Print dialog opened");
      onClose();
    } catch (error) {
      console.error("Print error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to print");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print Label</DialogTitle>
          <DialogDescription>
            Select print quality and use the system print dialog
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Print Quality (DPI)</Label>
            <RadioGroup
              value={selectedDpi}
              onValueChange={(value) => setSelectedDpi(value as "203" | "300")}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="203" id="dpi-203" />
                <Label htmlFor="dpi-203" className="font-normal cursor-pointer">
                  203 DPI (Standard)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="300" id="dpi-300" />
                <Label htmlFor="dpi-300" className="font-normal cursor-pointer">
                  300 DPI (High Quality)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• This will open a print preview window</p>
            <p>• Select your Zebra printer from the system dialog</p>
            <p>• Ensure "Fit to page" is disabled</p>
            <p>• Label size: {labelWidth}mm × {labelHeight}mm</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={printing}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={printing}>
            {printing ? "Opening..." : "Open Print Dialog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
