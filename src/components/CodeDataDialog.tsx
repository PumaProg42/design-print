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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BARCODE_SIZE_MIN, 
  BARCODE_SIZE_MAX, 
  BARCODE_SIZE_DEFAULT, 
  QR_SIZE_DEFAULT,
  calculateBarcodeWidthDots,
  calculateQrSizeDots,
  EAN8_MODULES,
  EAN13_MODULES,
  getCode128Modules,
  estimateQrModuleCount
} from "@/utils/barcodeUtils";

interface CodeDataDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: string, size: number, heightDots: number) => void;
  codeType: string;
  initialValue?: string;
  initialSize?: number;
  initialHeight?: number;
  dpi?: number;
}

export const CodeDataDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  codeType, 
  initialValue,
  initialSize,
  initialHeight,
  dpi = 203
}: CodeDataDialogProps) => {
  const isQR = codeType === "qrcode";
  const isDataMatrix = codeType === "datamatrix";
  const isSquare = isQR || isDataMatrix;
  const defaultSize = (isQR || isDataMatrix) ? QR_SIZE_DEFAULT : BARCODE_SIZE_DEFAULT;
  const defaultHeight = isSquare ? 0 : 60;
  
  const [data, setData] = useState("");
  const [size, setSize] = useState(initialSize || defaultSize);
  const [heightDots, setHeightDots] = useState(initialHeight || defaultHeight);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setData(initialValue || "");
      setSize(initialSize || defaultSize);
      setHeightDots(initialHeight || defaultHeight);
      setError("");
    }
  }, [open, initialValue, initialSize, initialHeight, defaultSize, defaultHeight]);

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
        if (!value.trim()) {
          setError("Please enter some data");
          return false;
        }
        return true;
        
      case "ean8":
        const cleaned8 = value.replace(/\D/g, "");
        if (cleaned8.length < 7 || cleaned8.length > 8) {
          setError("EAN-8 must be 7 or 8 digits");
          return false;
        }
        return true;
        
      case "ean13":
        const cleaned13 = value.replace(/\D/g, "");
        if (cleaned13.length < 12 || cleaned13.length > 13) {
          setError("EAN-13 must be 12 or 13 digits");
          return false;
        }
        return true;
        
      case "code128":
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
      const finalHeight = isQR ? calculateQrSizeDots(size, data.length) : heightDots;
      onConfirm(data, size, finalHeight);
      onClose();
    }
  };

  const handleDataChange = (value: string) => {
    let filteredValue = value;
    
    if (codeType === "ean8") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length > 8) {
        setError("Maximum is 8 digits (7 + check digit)");
        filteredValue = digitsOnly.slice(0, 8);
      } else {
        filteredValue = digitsOnly;
        setError("");
      }
    } else if (codeType === "ean13") {
      const digitsOnly = value.replace(/\D/g, "");
      if (digitsOnly.length > 13) {
        setError("Maximum is 13 digits (12 + check digit)");
        filteredValue = digitsOnly.slice(0, 13);
      } else {
        filteredValue = digitsOnly;
        setError("");
      }
    } else if (codeType === "qrcode" || codeType === "code128") {
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

  // Calculate computed width in dots for display
  const computedWidthDots = () => {
    const barcodeType = codeType === "qrcode" ? "QR" : 
                        codeType === "ean8" ? "EAN_8" : 
                        codeType === "ean13" ? "EAN_13" : "CODE_128";
    return calculateBarcodeWidthDots(barcodeType as any, size, data.length || 6);
  };

  // Calculate computed width in mm for display
  const computedWidthMm = () => {
    return ((computedWidthDots() * 25.4) / dpi).toFixed(1);
  };

  // Calculate height in mm for display
  const heightMm = () => {
    const h = isQR ? calculateQrSizeDots(size, data.length || 10) : heightDots;
    return ((h * 25.4) / dpi).toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit" : "Create"} {getTypeLabel()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Data Input */}
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

          {/* Size Selection (1-10) */}
          <div>
            <Label htmlFor="code-size" className="flex items-center gap-2">
              Size (1-10)
              <span className="text-xs text-muted-foreground">
                = {isQR ? "QR magnification" : "module width (dots)"}
              </span>
            </Label>
            <Select
              value={size.toString()}
              onValueChange={(v) => setSize(parseInt(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-[100] max-h-60" position="popper" sideOffset={5}>
                {Array.from({ length: BARCODE_SIZE_MAX - BARCODE_SIZE_MIN + 1 }, (_, i) => i + BARCODE_SIZE_MIN).map((s) => (
                  <SelectItem key={s} value={s.toString()}>
                    {s} {s === defaultSize && "(default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Height Input (only for linear barcodes) */}
          {!isQR && (
            <div>
              <Label htmlFor="code-height">Bar Height (dots)</Label>
              <Input
                id="code-height"
                type="number"
                min={10}
                max={500}
                value={heightDots}
                onChange={(e) => setHeightDots(Math.max(10, parseInt(e.target.value) || 60))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {heightMm()} mm
              </p>
            </div>
          )}

          {/* Computed Dimensions Info */}
          <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
            <p className="text-xs font-medium mb-2">Computed Dimensions:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Width:</span>{" "}
                <span className="font-mono">{computedWidthDots()} dots</span>
                <span className="text-muted-foreground"> ({computedWidthMm()} mm)</span>
              </div>
              <div>
                <span className="text-muted-foreground">Height:</span>{" "}
                <span className="font-mono">{isQR ? computedWidthDots() : heightDots} dots</span>
                <span className="text-muted-foreground"> ({heightMm()} mm)</span>
              </div>
            </div>
            {isQR && (
              <p className="text-xs text-muted-foreground mt-2">
                QR codes are always square. Size controls magnification.
              </p>
            )}
            {!isQR && (
              <p className="text-xs text-muted-foreground mt-2">
                Width is fixed by Size. Only height can be changed.
              </p>
            )}
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
