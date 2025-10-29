import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import printerSettingsExample from "@/assets/printer-settings-example.png";

interface HighQualityPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  labelWidth: number;
  labelHeight: number;
}

export const HighQualityPrintDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm,
  labelWidth,
  labelHeight 
}: HighQualityPrintDialogProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem("hideHighQualityPrintWarning", "true");
    }
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <AlertDialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDialogTitle>Print Settings Required</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        
        <ScrollArea className="flex-1 overflow-auto max-h-[calc(85vh-180px)]">
          <div className="px-6">
            <AlertDialogDescription className="space-y-4 pb-4">
              <p>
                For the best high-quality label printing, please make sure your printer settings are correctly configured.
              </p>
              
              <div className="bg-muted p-4 rounded-md space-y-3">
                <p className="font-medium">Before printing:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Open your printer settings on your computer.</li>
                  <li>
                    Set the exact label dimensions as shown below (example for Zebra printer):
                    <div className="mt-2 ml-4 font-mono text-xs bg-background p-2 rounded border">
                      <div>Width: {labelWidth.toFixed(2)} mm</div>
                      <div>Height: {labelHeight.toFixed(2)} mm</div>
                    </div>
                  </li>
                </ol>

                <div className="mt-4 border rounded-md overflow-hidden max-w-sm mx-auto">
                  <img 
                    src={printerSettingsExample} 
                    alt="Zebra printer settings showing width and height fields" 
                    className="w-full h-auto"
                  />
                </div>

                <p className="font-medium mt-4">In the print dialog:</p>
                <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                  <li>Select your Zebra printer.</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="dontShowAgainHQ"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                />
                <Label
                  htmlFor="dontShowAgainHQ"
                  className="text-sm font-normal cursor-pointer"
                >
                  Don't show this again
                </Label>
              </div>
            </AlertDialogDescription>
          </div>
        </ScrollArea>
        
        <AlertDialogFooter className="px-6 py-4 border-t">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Continue to Print
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
