import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ParsedScene } from "@/utils/zplParser";
import { useState } from "react";

interface ZplImportDialogProps {
  open: boolean;
  onClose: () => void;
  scene: ParsedScene | null;
  onApply: (scene: ParsedScene) => void;
}

export const ZplImportDialog = ({ open, onClose, scene, onApply }: ZplImportDialogProps) => {
  const [dpi, setDpi] = useState(scene?.label.dpi || 203);

  if (!scene) return null;

  const handleApply = () => {
    const updatedScene = {
      ...scene,
      label: {
        ...scene.label,
        dpi,
      },
    };
    onApply(updatedScene);
  };

  const widthMm = ((scene.label.widthDots / dpi) * 25.4).toFixed(1);
  const heightMm = ((scene.label.heightDots / dpi) * 25.4).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import ZPL - Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* DPI Setting */}
          <div className="flex items-center gap-4">
            <Label htmlFor="import-dpi" className="w-20">DPI:</Label>
            <Input
              id="import-dpi"
              type="number"
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value) || 203)}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">(203 or 300)</span>
          </div>

          {/* Label Dimensions */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Width:</span>
              <span>{scene.label.widthDots} dots ({widthMm} mm)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Height:</span>
              <span>{scene.label.heightDots} dots ({heightMm} mm)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Orientation:</span>
              <span>{scene.label.rotate180 ? 'Rotated 180°' : 'Normal'}</span>
            </div>
          </div>

          {/* Element Counts */}
          <div className="border rounded-md p-3 space-y-1 text-sm">
            <div className="font-medium mb-2">Detected Elements:</div>
            <div className="flex justify-between">
              <span>Text fields:</span>
              <span>{scene.stats.textCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Barcodes/QR:</span>
              <span>{scene.stats.barcodeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Shapes/Lines:</span>
              <span>{scene.stats.shapeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Images:</span>
              <span>{scene.stats.imageCount}</span>
            </div>
            {scene.stats.rawCount > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Unsupported blocks:</span>
                <span>{scene.stats.rawCount}</span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {scene.warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="text-sm space-y-1">
                  {scene.warnings.map((warning, idx) => (
                    <div key={idx}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
