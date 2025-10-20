import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateEAN13Checksum } from "@/utils/imageToZpl";
import { z } from "zod";

const barcodeSchema = z.object({
  digits: z.string()
    .trim()
    .length(12, { message: "Please enter exactly 12 digits" })
    .regex(/^\d{12}$/, { message: "Please enter only numeric digits" })
});

interface BarcodeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (barcode: string) => void;
  initialValue?: string;
}

export const BarcodeDialog = ({ open, onClose, onConfirm, initialValue }: BarcodeDialogProps) => {
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && initialValue) {
      // Extract first 12 digits from the barcode (remove check digit)
      const first12 = initialValue.replace(/\D/g, "").slice(0, 12);
      setDigits(first12);
    } else if (!open) {
      // Clear when dialog closes
      setDigits("");
      setError("");
    }
  }, [open, initialValue]);

  const handleConfirm = () => {
    try {
      // Validate input using zod schema
      const validation = barcodeSchema.safeParse({ digits });
      
      if (!validation.success) {
        setError(validation.error.errors[0].message);
        return;
      }

      const fullBarcode = calculateEAN13Checksum(digits);
      onConfirm(fullBarcode);
      setDigits("");
      setError("");
      onClose();
    } catch (err) {
      setError("Invalid barcode format");
    }
  };

  const handleDigitsChange = (value: string) => {
    // Only allow digits and max 12 characters
    const filtered = value.replace(/\D/g, "").slice(0, 12);
    setDigits(filtered);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit" : "Add"} EAN-13 Barcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="barcode-digits">Enter 12 digits</Label>
            <Input
              id="barcode-digits"
              value={digits}
              onChange={(e) => handleDigitsChange(e.target.value)}
              placeholder="123456789012"
              maxLength={12}
              className="mt-1"
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            {digits.length === 12 && (
              <p className="text-sm text-muted-foreground mt-1">
                Check digit will be auto-calculated: {calculateEAN13Checksum(digits).slice(-1)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>{initialValue ? "Update" : "Add"} Barcode</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
