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
import { Textarea } from "@/components/ui/textarea";

interface CodeDataDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: string) => void;
  codeType: string;
  initialValue?: string;
}

export const CodeDataDialog = ({ open, onClose, onConfirm, codeType, initialValue }: CodeDataDialogProps) => {
  const [data, setData] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setData(initialValue || "");
      setError("");
    }
  }, [open, initialValue]);

  const getTypeLabel = () => {
    switch (codeType) {
      case "qrcode": return "QR Code";
      case "ean8": return "EAN-8";
      case "ean13": return "EAN-13";
      case "code128": return "Code 128";
      default: return "Code";
    }
  };

  const getPlaceholder = () => {
    switch (codeType) {
      case "qrcode": return "Enter any text or URL";
      case "ean8": return "Enter 7 or 8 digits";
      case "ean13": return "Enter 12 or 13 digits";
      case "code128": return "Enter alphanumeric text";
      default: return "Enter data";
    }
  };

  const validateData = (value: string): boolean => {
    setError("");
    
    switch (codeType) {
      case "qrcode":
        // Any UTF-8 string is allowed
        if (!value.trim()) {
          setError("Please enter some data");
          return false;
        }
        return true;
        
      case "ean8":
        // Must be 7 or 8 digits
        if (!/^\d{7,8}$/.test(value)) {
          setError("EAN-8 must be 7 or 8 digits");
          return false;
        }
        return true;
        
      case "ean13":
        // Must be 12 or 13 digits
        if (!/^\d{12,13}$/.test(value)) {
          setError("EAN-13 must be 12 or 13 digits");
          return false;
        }
        return true;
        
      case "code128":
        // Allow ASCII printable characters
        if (!value.trim()) {
          setError("Please enter some data");
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleConfirm = () => {
    if (validateData(data)) {
      onConfirm(data);
      onClose();
    }
  };

  const handleDataChange = (value: string) => {
    // Enforce length limits and digit-only for EAN codes
    let filteredValue = value;
    
    if (codeType === "ean8") {
      // Only allow digits and max 7 characters
      const digitsOnly = value.replace(/\D/g, "");
      filteredValue = digitsOnly.slice(0, 7);
      
      // Show error if user tried to enter more than 7 digits
      if (digitsOnly.length > 7) {
        setError("Maximum is 7 digits.");
      } else {
        setError("");
      }
    } else if (codeType === "qrcode" || codeType === "code128") {
      // Strip newlines, carriage returns, and tabs - single line only
      filteredValue = value.replace(/[\n\r\t]/g, "");
      setError("");
    } else {
      setError("");
    }
    
    setData(filteredValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit" : "Create"} {getTypeLabel()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="code-data">Code Data</Label>
            <Input
              id="code-data"
              value={data}
              onChange={(e) => handleDataChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="mt-1"
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            {initialValue ? "Update" : "Create"} Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
