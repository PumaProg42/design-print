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
import { AlertTriangle } from "lucide-react";

interface PrintWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const PrintWarningDialog = ({ open, onOpenChange, onConfirm }: PrintWarningDialogProps) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem("hidePrintWarning", "true");
    }
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertDialogTitle>Print Settings Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-2">
            <p>
              For the best 1:1 label printing, please configure your browser print settings:
            </p>
            
            <div className="bg-muted p-4 rounded-md space-y-2">
              <p className="font-medium">In the print dialog:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click "More settings"</li>
                <li>Turn OFF "Headers and footers"</li>
                <li>Set Margins to "None"</li>
                <li>Set Scale to "100%"</li>
              </ol>
            </div>

            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> For automated printing without dialogs, use the WebUSB or Network Printing options instead.
            </p>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="dontShowAgain"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <Label
                htmlFor="dontShowAgain"
                className="text-sm font-normal cursor-pointer"
              >
                Don't show this again
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Continue to Print
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
