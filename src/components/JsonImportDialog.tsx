import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Canvas as FabricCanvas, FabricImage, Rect, Ellipse, Line, IText, Textbox } from "fabric";
import { generateBarcodePreviewFromParams } from "@/utils/barcodeUtils";
import QRCode from "qrcode";

interface JsonImportDialogProps {
  open: boolean;
  onClose: () => void;
  jsonData: any;
  onApply: (data: any) => void;
}

export const JsonImportDialog = ({ open, onClose, jsonData, onApply }: JsonImportDialogProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const widthDots = Math.round((jsonData?.labelWidth || 0) * (jsonData?.dpi || 203) / 25.4);
  const heightDots = Math.round((jsonData?.labelHeight || 0) * (jsonData?.dpi || 203) / 25.4);

  useEffect(() => {
    if (!open || !canvasRef.current || !jsonData) {
      setIsLoading(false);
      return;
    }

    const renderPreview = async () => {
      try {
        setIsLoading(true);

        // Dispose existing canvas
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }

        // Ensure widthDots and heightDots are valid
        if (widthDots <= 0 || heightDots <= 0) {
          console.error("Invalid label dimensions");
          setIsLoading(false);
          return;
        }

        // Create preview canvas with fixed size
        const previewWidth = 400;
        const previewHeight = Math.round((heightDots / widthDots) * previewWidth);

        const canvas = new FabricCanvas(canvasRef.current, {
          width: previewWidth,
          height: previewHeight,
          backgroundColor: "#ffffff",
          selection: false,
        });

        fabricCanvasRef.current = canvas;

        const scaleX = previewWidth / widthDots;
        const scaleY = previewHeight / heightDots;

        // Add label boundary
        const boundary = new Rect({
          left: 0,
          top: 0,
          width: previewWidth,
          height: previewHeight,
          fill: "transparent",
          stroke: "#e5e7eb",
          strokeWidth: 2,
          selectable: false,
          evented: false,
          name: "labelBoundary",
        });
        canvas.add(boundary);

        // Recreate all elements from JSON
        if (jsonData.elements && Array.isArray(jsonData.elements)) {
          for (const elem of jsonData.elements) {
            try {
              if (elem.type === "i-text" || elem.type === "textbox") {
                const textObj = elem.type === "i-text" 
                  ? new IText(elem.text || "", {
                      left: (elem.x || 0) * scaleX,
                      top: (elem.y || 0) * scaleY,
                      fontSize: (elem.fontSize || 20) * scaleX,
                      fontFamily: elem.fontFamily || "Arial",
                      fill: elem.fill || "#000000",
                      fontWeight: elem.fontWeight || "normal",
                      fontStyle: elem.fontStyle || "normal",
                      angle: elem.rotation || 0,
                      selectable: false,
                      evented: false,
                    })
                  : new Textbox(elem.text || "", {
                      left: (elem.x || 0) * scaleX,
                      top: (elem.y || 0) * scaleY,
                      width: (elem.width || 100) * scaleX,
                      fontSize: (elem.fontSize || 20) * scaleX,
                      fontFamily: elem.fontFamily || "Arial",
                      fill: elem.fill || "#000000",
                      fontWeight: elem.fontWeight || "normal",
                      fontStyle: elem.fontStyle || "normal",
                      angle: elem.rotation || 0,
                      selectable: false,
                      evented: false,
                    });
                canvas.add(textObj);
              } else if (elem.type === "rect") {
                const rect = new Rect({
                  left: (elem.x || 0) * scaleX,
                  top: (elem.y || 0) * scaleY,
                  width: (elem.width || 50) * scaleX,
                  height: (elem.height || 50) * scaleY,
                  fill: elem.fillColor || "transparent",
                  stroke: elem.strokeColor || "#000000",
                  strokeWidth: (elem.strokeWidth || 1) * scaleX,
                  angle: elem.rotation || 0,
                  selectable: false,
                  evented: false,
                });
                canvas.add(rect);
              } else if (elem.type === "ellipse") {
                const ellipse = new Ellipse({
                  left: (elem.x || 0) * scaleX,
                  top: (elem.y || 0) * scaleY,
                  rx: ((elem.width || 50) / 2) * scaleX,
                  ry: ((elem.height || 50) / 2) * scaleY,
                  fill: elem.fillColor || "transparent",
                  stroke: elem.strokeColor || "#000000",
                  strokeWidth: (elem.strokeWidth || 1) * scaleX,
                  angle: elem.rotation || 0,
                  selectable: false,
                  evented: false,
                });
                canvas.add(ellipse);
              } else if (elem.type === "line") {
                const line = new Line(
                  [
                    (elem.x || 0) * scaleX,
                    (elem.y || 0) * scaleY,
                    ((elem.x || 0) + (elem.width || 100)) * scaleX,
                    ((elem.y || 0) + (elem.height || 0)) * scaleY,
                  ],
                  {
                    stroke: elem.strokeColor || "#000000",
                    strokeWidth: (elem.strokeWidth || 1) * scaleX,
                    selectable: false,
                    evented: false,
                  }
                );
                canvas.add(line);
              } else if (elem.type === "barcode" && elem.barcodeParams) {
                const barcodeDataUrl = await generateBarcodePreviewFromParams(
                  elem.barcodeParams,
                  { x: scaleX, y: scaleY }
                );
                const img = await FabricImage.fromURL(barcodeDataUrl, {
                  crossOrigin: "anonymous",
                });
                img.set({
                  left: (elem.x || 0) * scaleX,
                  top: (elem.y || 0) * scaleY,
                  angle: elem.rotation || 0,
                  selectable: false,
                  evented: false,
                });
                canvas.add(img);
              } else if (elem.type === "qr" && elem.value) {
                const qrDataUrl = await QRCode.toDataURL(elem.value, {
                  width: Math.round((elem.width || 100) * scaleX),
                  margin: 0,
                  color: { dark: "#000000", light: "#ffffff" },
                });
                const img = await FabricImage.fromURL(qrDataUrl, {
                  crossOrigin: "anonymous",
                });
                img.set({
                  left: (elem.x || 0) * scaleX,
                  top: (elem.y || 0) * scaleY,
                  angle: elem.rotation || 0,
                  selectable: false,
                  evented: false,
                });
                canvas.add(img);
              } else if (elem.type === "image" && elem.imageData) {
                const img = await FabricImage.fromURL(elem.imageData, {
                  crossOrigin: "anonymous",
                });
                img.set({
                  left: (elem.x || 0) * scaleX,
                  top: (elem.y || 0) * scaleY,
                  scaleX: ((elem.width || 100) * scaleX) / (img.width || 1),
                  scaleY: ((elem.height || 100) * scaleY) / (img.height || 1),
                  angle: elem.rotation || 0,
                  selectable: false,
                  evented: false,
                });
                canvas.add(img);
              }
            } catch (error) {
              console.error("Failed to render element:", elem, error);
            }
          }
        }

        canvas.renderAll();
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to render preview:", error);
        setIsLoading(false);
      }
    };

    renderPreview();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [open, jsonData, widthDots, heightDots]);

  const handleApply = () => {
    onApply(jsonData);
    onClose();
  };

  if (!jsonData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Label Preview</DialogTitle>
          <DialogDescription>
            Review the label details before importing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Label Name:</span>
              <span className="ml-2">{jsonData.labelName || "Untitled"}</span>
            </div>
            <div>
              <span className="font-medium">DPI:</span>
              <span className="ml-2">{jsonData.dpi || 203}</span>
            </div>
            <div>
              <span className="font-medium">Dimensions (mm):</span>
              <span className="ml-2">
                {jsonData.labelWidth} × {jsonData.labelHeight} mm
              </span>
            </div>
            <div>
              <span className="font-medium">Dimensions (dots):</span>
              <span className="ml-2">
                {widthDots} × {heightDots} dots
              </span>
            </div>
            <div>
              <span className="font-medium">Elements:</span>
              <span className="ml-2">{jsonData.elements?.length || 0}</span>
            </div>
            <div>
              <span className="font-medium">Rotation:</span>
              <span className="ml-2">{jsonData.rotate180 ? "180°" : "0°"}</span>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="text-sm font-medium mb-2">Label Preview</div>
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                Loading preview...
              </div>
            ) : (
              <div className="flex justify-center">
                <canvas ref={canvasRef} className="border border-border" />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isLoading}>
            Apply & Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
